import { getAccessToken, signOut } from '../auth/supabaseAuth.js';

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const accessToken = await getAccessToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && typeof input === 'string' && input.startsWith('/api/')) await signOut();
  return response;
}
