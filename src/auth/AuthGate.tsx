import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { getActiveSession, handleAuthStorageEvent, restoreSession, TinyTraceSession } from './supabaseAuth.js';
import { resetWorkspaceCache } from '../persistence/localStore.js';
const AuthPage = lazy(() => import('../components/auth/AuthPage.js').then((module) => ({ default: module.AuthPage })));

interface AuthGateProps { children: React.ReactNode }

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<TinyTraceSession | null>(getActiveSession());
  const [loading, setLoading] = useState(true);
  const activeUserId = useRef(session?.user.id || null);

  const acceptSession = (next: TinyTraceSession | null) => {
    if (activeUserId.current !== (next?.user.id || null)) resetWorkspaceCache();
    activeUserId.current = next?.user.id || null;
    setSession(next);
  };

  useEffect(() => {
    let active = true;
    const changed = (event: Event) => acceptSession((event as CustomEvent<TinyTraceSession | null>).detail);
    const storageChanged = (event: StorageEvent) => { handleAuthStorageEvent(event); acceptSession(getActiveSession()); };
    window.addEventListener('tinytrace-auth-changed', changed);
    window.addEventListener('storage', storageChanged);
    void restoreSession().then((value) => { if (active) { acceptSession(value); setLoading(false); } });
    return () => { active = false; window.removeEventListener('tinytrace-auth-changed', changed); window.removeEventListener('storage', storageChanged); };
  }, []);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#F5F8F7] text-sm text-[#687385]"><LoaderCircle className="mr-2 h-4 w-4 animate-spin text-[#087F61]" /> Restoring your secure session…</main>;
  if (!session) return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#F5F8F7] text-sm text-[#687385]"><LoaderCircle className="mr-2 h-4 w-4 animate-spin text-[#087F61]" /> Loading account access…</main>}><AuthPage onAuthenticated={acceptSession} /></Suspense>;
  return <React.Fragment key={session.user.id}>{children}</React.Fragment>;
}
