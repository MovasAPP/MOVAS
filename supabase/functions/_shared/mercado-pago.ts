import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

function fromBase64Url(value: string) {
  const standard = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard + '='.repeat((4 - standard.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getEncryptionKey(usage: KeyUsage[]) {
  const keyText = Deno.env.get('MP_TOKEN_ENCRYPTION_KEY');
  if (!keyText) throw new Error('Mercado Pago token encryption is not configured.');
  const key = fromBase64Url(keyText);
  if (key.length !== 32) throw new Error('Mercado Pago token encryption key is invalid.');
  return crypto.subtle.importKey('raw', key, 'AES-GCM', false, usage);
}

export async function encryptMercadoPagoToken(value: string) {
  const key = await getEncryptionKey(['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
  return { ciphertext: toBase64Url(new Uint8Array(ciphertext)), iv: toBase64Url(iv) };
}

async function decryptMercadoPagoToken(ciphertext: string, ivText: string) {
  const key = await getEncryptionKey(['decrypt']);
  const iv = fromBase64Url(ivText);
  const encrypted = fromBase64Url(ciphertext);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new TextDecoder().decode(clear);
}

export async function getMercadoPagoSellerToken(admin: SupabaseClient, userId: string) {
  const { data: account, error } = await admin.from('payment_provider_accounts')
    .select('provider_user_id, access_token_ciphertext, access_token_iv, refresh_token_ciphertext, refresh_token_iv, token_expires_at, updated_at')
    .eq('user_id', userId).maybeSingle();
  if (error || !account) throw new Error('Conecte novamente sua conta Mercado Pago para receber pagamentos.');

  const expiry = new Date(account.token_expires_at).getTime();
  if (Number.isFinite(expiry) && expiry > Date.now() + 5 * 60 * 1000) {
    return { accessToken: await decryptMercadoPagoToken(account.access_token_ciphertext, account.access_token_iv), providerUserId: account.provider_user_id };
  }

  const clientId = Deno.env.get('MP_CLIENT_ID');
  const clientSecret = Deno.env.get('MP_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('A integração do Mercado Pago ainda está sendo configurada.');
  const refreshToken = await decryptMercadoPagoToken(account.refresh_token_ciphertext, account.refresh_token_iv);
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken }),
  });
  if (!response.ok) {
    // Another request may have refreshed the rotating refresh token first.
    const { data: latest } = await admin.from('payment_provider_accounts')
      .select('provider_user_id, access_token_ciphertext, access_token_iv, token_expires_at, updated_at')
      .eq('user_id', userId).maybeSingle();
    if (latest && latest.updated_at !== account.updated_at && new Date(latest.token_expires_at).getTime() > Date.now() + 60_000) {
      return { accessToken: await decryptMercadoPagoToken(latest.access_token_ciphertext, latest.access_token_iv), providerUserId: latest.provider_user_id };
    }
    throw new Error('Reconecte sua conta Mercado Pago para continuar.');
  }
  const tokens = await response.json();
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) throw new Error('O Mercado Pago não retornou credenciais válidas.');

  const [access, refresh] = await Promise.all([
    encryptMercadoPagoToken(tokens.access_token),
    encryptMercadoPagoToken(tokens.refresh_token),
  ]);
  const { error: saveError } = await admin.from('payment_provider_accounts').update({
    access_token_ciphertext: access.ciphertext,
    access_token_iv: access.iv,
    refresh_token_ciphertext: refresh.ciphertext,
    refresh_token_iv: refresh.iv,
    token_expires_at: new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);
  if (saveError) throw new Error('Não foi possível atualizar a conexão Mercado Pago.');
  return { accessToken: tokens.access_token as string, providerUserId: account.provider_user_id as string };
}
