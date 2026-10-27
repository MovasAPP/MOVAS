import { authenticatedUser, corsHeaders, jsonResponse } from '../_shared/http.ts';
import { getMercadoPagoSellerToken } from '../_shared/mercado-pago.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  let paymentId: string | null = null;
  let admin: SupabaseClient | null = null;
  try {
    const auth = await authenticatedUser(request);
    if (!auth) return jsonResponse({ error: 'Entre na sua conta para contratar.' }, 401);
    admin = auth.admin;
    const body = await request.json();
    const proposalId = typeof body?.proposalId === 'string' ? body.proposalId : '';
    if (!/^[0-9a-f-]{36}$/i.test(proposalId)) return jsonResponse({ error: 'Selecione uma proposta válida.' }, 400);

    const { data: prepared, error: prepareError } = await admin.rpc('prepare_job_payment', {
      p_client_id: auth.user.id,
      p_proposal_id: proposalId,
    });
    if (prepareError || !prepared?.length) {
      return jsonResponse({ error: prepareError?.message || 'Não foi possível iniciar este pagamento.' }, 409);
    }
    const payment = prepared[0] as { payment_id: string; job_id: string; worker_id: string; service_amount: number; platform_fee: number; customer_total: number };
    paymentId = payment.payment_id;

    const { accessToken, providerUserId } = await getMercadoPagoSellerToken(admin, payment.worker_id);
    const webUrl = Deno.env.get('CONTRATEI_WEB_URL');
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercado-pago-webhook`;
    if (!webUrl || new URL(webUrl).protocol !== 'https:' || !webhookUrl.startsWith('https://')) {
      throw new Error('O endereço seguro do site ainda não foi configurado.');
    }

    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': payment.payment_id,
      },
      body: JSON.stringify({
        items: [{
          id: payment.proposal_id,
          title: 'Serviço contratado pelo CONTRATEI',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(payment.customer_total),
        }],
        marketplace_fee: Number(payment.platform_fee),
        external_reference: payment.payment_id,
        notification_url: webhookUrl,
        back_urls: {
          success: new URL('/my-requests?payment=success', webUrl).toString(),
          failure: new URL('/my-requests?payment=failure', webUrl).toString(),
          pending: new URL('/my-requests?payment=pending', webUrl).toString(),
        },
        auto_return: 'approved',
        metadata: { contratei_payment_id: payment.payment_id, seller_user_id: payment.worker_id, seller_provider_id: providerUserId },
      }),
    });
    const preference = await preferenceResponse.json().catch(() => ({}));
    if (!preferenceResponse.ok || typeof preference.id !== 'string' || typeof preference.init_point !== 'string') {
      throw new Error('O Mercado Pago não conseguiu preparar o checkout. Tente novamente.');
    }

    const { error: saveError } = await admin.rpc('save_job_payment_preference', {
      p_payment_id: payment.payment_id,
      p_preference_id: preference.id,
      p_checkout_url: preference.init_point,
    });
    if (saveError) throw new Error('Não foi possível salvar o checkout com segurança.');
    return jsonResponse({ checkoutUrl: preference.init_point, customerTotal: Number(payment.customer_total), serviceAmount: Number(payment.service_amount), platformFee: Number(payment.platform_fee) });
  } catch (error) {
    if (paymentId && admin) await admin.rpc('fail_job_payment', { p_payment_id: paymentId }).catch(() => undefined);
    const message = error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.';
    return jsonResponse({ error: message }, 400);
  }
});
