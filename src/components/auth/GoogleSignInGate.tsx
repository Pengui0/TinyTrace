import { apiFetch } from '../../api/authenticatedFetch.js';
import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { setGoogleIdToken } from '../../api/authenticatedFetch.js';

interface AuthConfig {
  authRequired: boolean;
  clientId: string | null;
  configurationReady: boolean;
}

interface GoogleCredentialResponse {
  credential?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

let googleIdentityScript: Promise<void> | null = null;

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleIdentityScript) return googleIdentityScript;
  googleIdentityScript = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    const script = existing || document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'));
    if (!existing) document.head.appendChild(script);
  });
  return googleIdentityScript;
}

interface GoogleSignInGateProps {
  children: (onSignOut?: () => void) => React.ReactNode;
}

export const GoogleSignInGate: React.FC<GoogleSignInGateProps> = ({ children }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch('/api/auth/config')
      .then(async (response) => {
        if (!response.ok) throw new Error('Authentication settings could not be loaded.');
        return response.json() as Promise<AuthConfig>;
      })
      .then(async (nextConfig) => {
        if (!active) return;
        setConfig(nextConfig);
        if (!nextConfig.authRequired) return;
        if (!nextConfig.configurationReady || !nextConfig.clientId) {
          setError('Server auth is enabled but GOOGLE_CLIENT_ID or GOOGLE_ALLOWED_DOMAIN is missing.');
          return;
        }
        await loadGoogleIdentityServices();
        if (!active || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: nextConfig.clientId,
          callback: (response: GoogleCredentialResponse) => {
            if (!response.credential) {
              setError('Google did not return a sign-in credential. Please try again.');
              return;
            }
            setGoogleIdToken(response.credential);
            setError(null);
            setSignedIn(true);
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 280,
        });
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Authentication settings could not be loaded.');
      });
    return () => { active = false; };
  }, []);

  const onSignOut = () => {
    setGoogleIdToken(null);
    setSignedIn(false);
    window.google?.accounts?.id?.disableAutoSelect?.();
  };

  if (config && !config.authRequired) return <>{children()}</>;
  if (config?.authRequired && signedIn) return <>{children(onSignOut)}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7F8] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#E4E9EB] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#087F61]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-[#1C1F26]">TinyTrace sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#687385]">
          Sign in with your authorized Google Workspace account to open this shared due diligence workspace.
        </p>
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {!config && !error && <p className="mt-5 text-sm text-[#687385]">Loading sign-in…</p>}
        {config?.authRequired && config.configurationReady && config.clientId && <div className="mt-6 flex justify-center"><div ref={buttonRef} /></div>}
        {config?.authRequired && !config.configurationReady && (
          <p className="mt-4 text-xs text-[#687385]">Set GOOGLE_CLIENT_ID and GOOGLE_ALLOWED_DOMAIN on the server, then reload.</p>
        )}
        {error && <button onClick={() => window.location.reload()} className="mt-4 text-sm font-semibold text-[#087F61] underline">Retry</button>}
      </section>
    </main>
  );
};
