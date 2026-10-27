import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSupabaseKeys, jsonResponse } from '../_shared/http.ts';
import { getMercadoPagoSellerToken } from '../_shared/mercado-pago.ts';

async function validSignature(request: Request, dataId: string, secret: string) {
  const signature = request.headers.get('x-signature') || '';
  const requestId = request.headers.get('x-request-id') || '';
  const parts = Object.fromEntries(signature.split(',').map((part) => {
    const [key, ...value] = part.trim().split('=');
    return [key, value.join('=')];
  }));
  if (!parts.ts || !parts.v1 || !requestId || !/^\d+$/.test(parts.ts)) return false;
  if (!Number.isFinite(Number(parts.ts))) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  const expected = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  if (expected.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);
  try {
    const payload = await request.json().catch(() => ({}));
    const dataId = String(payload?.data?.id ?? new URL(request.url).searchParams.get('data.id') ?? '');
    const topic = String(payload?.type ?? payload?.topic ?? new URL(request.url).searchParams.get('topic') ?? '');
    if (topic !== 'payment' || !/^\d+$/.test(dataId)) return jsonResponse({ received: true });

    const secret = Deno.env.get('MP_WEBHOOK_SECRET');
    if (!secret || !(await validSignature(request, dataId, secret))) return jsonResponse({ error: 'Invalid webhook signature.' }, 401);

    const { url, secret: serviceKey } = getSupabaseKeys();
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const providerUserId = String(payload?.user_id ?? payload?.seller_id ?? '');
    if (!/^\d+$/.test(providerUserId)) return jsonResponse({ received: true });
    const { data: account, error: accountError } = await admin.from('payment_provider_accounts')
      .select('user_id, provider_user_id').eq('provider_user_id', providerUserId).maybeSingle();
    if (accountError || !account) return jsonResponse({ received: true });

    const { accessToken } = await getMercadoPagoSellerToken(admin, account.user_id);
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!paymentResponse.ok) return jsonResponse({ error: 'Payment lookup failed.' }, 502);
    const payment = await paymentResponse.json();
    if (String(payment.collector_id) !== providerUserId || payment.currency_id !== 'BRL') {
      return jsonResponse({ error: 'Payment seller or currency mismatch.' }, 400);
    }
    const reference = String(payment.external_reference ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(reference)) return jsonResponse({ received: true });
    const mappedStatus: Record<string, string> = {
      pending: 'pending',
      approved: 'approved',
      rejected: 'rejected',
      cancelled: 'cancelled',
      refunded: 'refunded',
      charged_back: 'charged_back',
    };
    const status = mappedStatus[payment.status];
    if (!status) return jsonResponse({ received: true });
    const fees = Array.isArray(payment.fee_details) ? payment.fee_details : [];
    const processingFee = fees.filter((fee: { type?: string }) => fee.type === 'mercadopago_fee')
      .reduce((total: number, fee: { amount?: number }) => total + Number(fee.amount ?? 0), 0);
    const { error: applyError } = await admin.rpc('apply_mercado_pago_payment', {
      p_payment_id: reference,
      p_provider_payment_id: String(payment.id),
      p_status: status,
      p_transaction_amount: Number(payment.transaction_amount),
      p_marketplace_fee: Number(payment.marketplace_fee ?? 0),
      p_provider_seller_id: providerUserId,
      p_processing_fee: Number.isFinite(processingFee) ? processingFee : null,
    });
    if (applyError) return jsonResponse({ error: 'Payment could not be reconciled.' }, 409);
    return jsonResponse({ received: true });
  } catch {
    return jsonResponse({ error: 'Webhook processing failed.' }, 500);
  }
});
