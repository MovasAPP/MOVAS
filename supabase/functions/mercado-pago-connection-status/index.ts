import { corsHeaders, authenticatedUser, jsonResponse } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const auth = await authenticatedUser(request);
    if (!auth) return jsonResponse({ error: 'Entre na sua conta.' }, 401);
    const { data, error } = await auth.admin.from('payment_provider_accounts')
      .select('connected_at').eq('user_id', auth.user.id).maybeSingle();
    if (error) return jsonResponse({ error: 'Não foi possível consultar a conexão de recebimentos.' }, 500);
    return jsonResponse({ connected: Boolean(data), connectedAt: data?.connected_at ?? null });
  } catch {
    return jsonResponse({ error: 'Não foi possível consultar a conexão de recebimentos.' }, 500);
  }
});
