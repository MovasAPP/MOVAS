export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function getSupabaseKeys() {
  const url = Deno.env.get('SUPABASE_URL');
  const publishableJson = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  const secretJson = Deno.env.get('SUPABASE_SECRET_KEYS');
  const publishable = publishableJson ? JSON.parse(publishableJson).default : Deno.env.get('SUPABASE_ANON_KEY');
  const secret = secretJson ? JSON.parse(secretJson).default : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !publishable || !secret) throw new Error('Supabase function keys are not configured.');
  return { url, publishable, secret };
}

export async function authenticatedUser(request: Request) {
  const header = request.headers.get('Authorization');
  const accessToken = header?.replace(/^Bearer\s+/i, '');
  if (!accessToken) return null;

  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const { url, secret } = getSupabaseKeys();
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { admin, user: data.user };
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
