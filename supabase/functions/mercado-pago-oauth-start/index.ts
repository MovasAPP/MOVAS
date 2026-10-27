import { corsHeaders, authenticatedUser, base64Url, jsonResponse, sha256Hex } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const auth = await authenticatedUser(request);
    if (!auth) return jsonResponse({ error: 'Entre na sua conta para conectar o Mercado Pago.' }, 401);

    const { data: profile, error: profileError } = await auth.admin.from('profiles')
      .select('can_work, verification_status').eq('id', auth.user.id).single();
    if (profileError || !profile?.can_work || profile.verification_status !== 'verified') {
      return jsonResponse({ error: 'A conexão de recebimentos está disponível para profissionais verificados.' }, 403);
    }

    const clientId = Deno.env.get('MP_CLIENT_ID');
    const redirectUri = Deno.env.get('MP_REDIRECT_URI');
    if (!clientId || !redirectUri) return jsonResponse({ error: 'A integração do Mercado Pago ainda está sendo configurada.' }, 503);

    const body = await request.json().catch(() => ({}));
    const returnPlatform = body.platform === 'web' ? 'web' : 'native';
    const state = base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const { error: stateError } = await auth.admin.from('mercado_pago_oauth_states').insert({
      state_hash: await sha256Hex(state),
      user_id: auth.user.id,
      return_platform: returnPlatform,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (stateError) return jsonResponse({ error: 'Não foi possível iniciar a conexão com o Mercado Pago.' }, 500);

    const authorization = new URL('https://auth.mercadopago.com.br/authorization');
    authorization.searchParams.set('client_id', clientId);
    authorization.searchParams.set('response_type', 'code');
    authorization.searchParams.set('platform_id', 'mp');
    authorization.searchParams.set('state', state);
    authorization.searchParams.set('redirect_uri', redirectUri);
    return jsonResponse({ authorizationUrl: authorization.toString() });
  } catch {
    return jsonResponse({ error: 'Não foi possível iniciar a conexão com o Mercado Pago.' }, 500);
  }
});
