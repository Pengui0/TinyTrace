export interface TinyTraceUser { id: string; email: string; displayName?: string }
export interface TinyTraceSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user: TinyTraceUser;
}

const AUTH_STORAGE_KEY = 'tinytrace.auth.session';
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
let activeSession: TinyTraceSession | null = null;
let refreshInProgress: Promise<TinyTraceSession | null> | null = null;

export const isAuthConfigured = () => Boolean(supabaseUrl && publishableKey);
export const getActiveSession = () => activeSession;

function notifySessionChange(session: TinyTraceSession | null) {
  activeSession = session;
  if (typeof window !== 'undefined') {
    if (session) window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('tinytrace-auth-changed', { detail: session }));
  }
}

async function authRequest<T>(path: string, body?: unknown, accessToken?: string): Promise<T> {
  if (!isAuthConfigured()) throw new Error('Sign-in is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env, then restart TinyTrace.');
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = String(data.msg || data.message || data.error_description || data.error || 'Supabase authentication failed.');
    throw new Error(message);
  }
  return data as T;
}

function sessionFromResponse(data: Record<string, unknown>): TinyTraceSession | null {
  const user = data.user as Record<string, unknown> | undefined;
  if (!data.access_token || !data.refresh_token || !user?.id || !user.email) return null;
  const expiresAt = Number(data.expires_at) || (Date.now() / 1000 + Number(data.expires_in || 3600));
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return {
    access_token: String(data.access_token),
    refresh_token: String(data.refresh_token),
    expires_at: expiresAt,
    expires_in: Number(data.expires_in) || undefined,
    token_type: String(data.token_type || 'bearer'),
    user: { id: String(user.id), email: String(user.email), displayName: String(metadata?.full_name || '') || undefined },
  };
}

export async function signUp(email: string, password: string, fullName: string): Promise<{ session: TinyTraceSession | null; needsEmailConfirmation: boolean }> {
  const data = await authRequest<Record<string, unknown>>('signup', {
    email: email.trim().toLowerCase(), password, data: { full_name: fullName.trim() },
  });
  const session = sessionFromResponse(data);
  if (session) notifySessionChange(session);
  return { session, needsEmailConfirmation: !session };
}

export async function signIn(email: string, password: string): Promise<TinyTraceSession> {
  const data = await authRequest<Record<string, unknown>>('token?grant_type=password', {
    email: email.trim().toLowerCase(), password,
  });
  const session = sessionFromResponse(data);
  if (!session) throw new Error('Supabase did not return a complete sign-in session. Check email confirmation settings and try again.');
  notifySessionChange(session);
  return session;
}

export async function restoreSession(): Promise<TinyTraceSession | null> {
  if (!isAuthConfigured()) return null;
  try {
    const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) return null;
    const session = JSON.parse(saved) as TinyTraceSession;
    if (!session.access_token || !session.refresh_token || !session.user?.id) throw new Error('Invalid saved session.');
    activeSession = session;
    return session.expires_at && session.expires_at * 1000 < Date.now() + 60_000
      ? await refreshSession()
      : session;
  } catch {
    notifySessionChange(null);
    return null;
  }
}

export async function refreshSession(): Promise<TinyTraceSession | null> {
  if (!activeSession?.refresh_token) return null;
  if (!refreshInProgress) {
    refreshInProgress = authRequest<Record<string, unknown>>('token?grant_type=refresh_token', { refresh_token: activeSession.refresh_token })
      .then((data) => {
        const session = sessionFromResponse(data);
        if (!session) throw new Error('The session could not be refreshed. Please sign in again.');
        notifySessionChange(session);
        return session;
      })
      .catch(() => { notifySessionChange(null); return null; })
      .finally(() => { refreshInProgress = null; });
  }
  return refreshInProgress;
}

export async function getAccessToken(): Promise<string | null> {
  if (!activeSession) await restoreSession();
  if (!activeSession) return null;
  if (activeSession.expires_at && activeSession.expires_at * 1000 < Date.now() + 60_000) {
    return (await refreshSession())?.access_token || null;
  }
  return activeSession.access_token;
}

export async function signOut(): Promise<void> {
  const session = activeSession;
  // Clear the local session first so a slow or offline Auth API cannot leave the
  // protected dashboard visible after the server has rejected the access token.
  notifySessionChange(null);
  if (session?.access_token) {
    void authRequest('logout', {}, session.access_token).catch(() => {
      // The local session is already cleared; remote revocation is best effort.
    });
  }
}

export function handleAuthStorageEvent(event: StorageEvent): void {
  if (event.key !== AUTH_STORAGE_KEY) return;
  try { activeSession = event.newValue ? JSON.parse(event.newValue) as TinyTraceSession : null; }
  catch { activeSession = null; }
}
