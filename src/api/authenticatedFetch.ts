let googleIdToken: string | null = null;

export function setGoogleIdToken(token: string | null): void {
  googleIdToken = token;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const parsedUrl = new URL(requestUrl, window.location.origin);
  if (googleIdToken && parsedUrl.origin === window.location.origin && parsedUrl.pathname.startsWith('/api/')) {
    headers.set('Authorization', `Bearer ${googleIdToken}`);
  }
  return fetch(input, { ...init, headers });
}
