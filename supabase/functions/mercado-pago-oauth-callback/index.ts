import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSupabaseKeys, sha256Hex } from '../_shared/http.ts';
import { encryptMercadoPagoToken } from '../_shared/mercado-pago.ts';

function resultResponse(platform: string | null, result: 'connected' | 'cancelled' | 'error') {
  if (platform === 'native') {
    return Response.redirect(`contratei://oauth?mercado_pago=${result}`, 303);
  }
  const site = Deno.env.get('CONTRATEI_WEB_URL');
  if (site) {
    try {
      const destination = new URL(site);
      if (destination.protocol === 'https:') {
        destination.searchParams.set('mercado_pago', result);
        return Response.redirect(destination.toString(), 303);
      }
    } catch {
      // Fall through to an informational page if the configured site URL is invalid.
    }
  }

  const message = result === 'connected'
    ? 'Conta Mercado Pago conectada. Volte ao CONTRATEI para continuar.'
    : result === 'cancelled'
      ? 'A conexão não foi autorizada. Você pode tentar novamente pelo CONTRATEI.'
      : 'Não foi possível concluir a conexão. Volte ao CONTRATEI e tente novamente.';
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CONTRATEI · Mercado Pago</title><body style="font:16px system-ui;max-width:560px;margin:12vh auto;padding:24px;color:#162a37"><h1>CONTRATEI</h1><p>${message}</p></body></html>`, {
    status: result === 'connected' ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'GET') return new Response('Method not allowed.', { status: 405 });

  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (!state) return resultResponse(null, 'error');

  let platform: string | null = null;
  try {
    const { url: supabaseUrl, secret } = getSupabaseKeys();
    const admin = createClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: consumed, error: stateError } = await admin.rpc('consume_mercado_pago_oauth_state', {
      p_state_hash: await sha256Hex(state),
    });
    if (stateError || !consumed?.length) return resultResponse(null, 'error');
    const stateRecord = consumed[0] as { user_id: string; return_platform: string };
    platform = stateRecord.return_platform;

    if (url.searchParams.has('error') || !code) return resultResponse(platform, 'cancelled');

    const clientId = Deno.env.get('MP_CLIENT_ID');
    const clientSecret = Deno.env.get('MP_CLIENT_SECRET');
    const redirectUri = Deno.env.get('MP_REDIRECT_URI');
    const encryptionKeyText = Deno.env.get('MP_TOKEN_ENCRYPTION_KEY');
    if (!clientId || !clientSecret || !redirectUri || !encryptionKeyText) return resultResponse(platform, 'error');

    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenResponse.ok) return resultResponse(platform, 'error');
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.user_id || !tokenData.expires_in) {
      return resultResponse(platform, 'error');
    }

    const [access, refresh] = await Promise.all([
      encryptMercadoPagoToken(tokenData.access_token),
      encryptMercadoPagoToken(tokenData.refresh_token),
    ]);
    const { error: saveError } = await admin.from('payment_provider_accounts').upsert({
      user_id: stateRecord.user_id,
      provider: 'mercado_pago',
      provider_user_id: String(tokenData.user_id),
      access_token_ciphertext: access.ciphertext,
      access_token_iv: access.iv,
      refresh_token_ciphertext: refresh.ciphertext,
      refresh_token_iv: refresh.iv,
      token_expires_at: new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (saveError) return resultResponse(platform, 'error');
    return resultResponse(platform, 'connected');
  } catch {
    return resultResponse(platform, 'error');
  }
});
