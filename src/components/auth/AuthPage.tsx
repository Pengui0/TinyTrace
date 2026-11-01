import React, { FormEvent, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { isAuthConfigured, signIn, signUp, TinyTraceSession } from '../../auth/supabaseAuth.js';

interface AuthPageProps { onAuthenticated: (session: TinyTraceSession) => void }
type AuthMode = 'signin' | 'signup';

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const configured = isAuthConfigured();

  const switchMode = (next: AuthMode) => {
    if (mode === next) return;
    setMode(next);
    setError('');
    setNotice('');
    setConfirmPassword('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!configured) { setError('Authentication setup is incomplete. Add the Supabase URL and publishable key to .env, then restart TinyTrace.'); return; }
    if (mode === 'signup' && password !== confirmPassword) { setError('Your passwords do not match.'); return; }
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, fullName);
        if (result.session) onAuthenticated(result.session);
        else { switchMode('signin'); setNotice('Check your email for the confirmation link. Once confirmed, sign in here to open your workspace.'); }
      } else onAuthenticated(await signIn(email, password));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication could not be completed. Please try again.');
    } finally { setBusy(false); }
  };

  const fieldClass = 'mt-1 flex h-10 items-center gap-2 rounded-lg border border-[#DCE4E3] bg-white px-3 transition focus-within:border-[#087F61] focus-within:ring-4 focus-within:ring-[#087F61]/10';
  const inputClass = 'w-full bg-transparent text-[13px] text-[#171C25] outline-none placeholder:text-[#A2ACB8]';

  return (
    <main className="auth-screen relative flex min-h-dvh items-stretch justify-center overflow-x-hidden px-4 py-5 text-[#171C25] sm:px-6 sm:py-6">
      <div className="auth-orb auth-orb-one" aria-hidden="true" /><div className="auth-orb auth-orb-two" aria-hidden="true" />
      <div className="relative z-10 my-auto w-full max-w-[960px]">
        <header className="mb-4 flex items-center justify-center gap-3 sm:mb-5 sm:justify-start">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_8px_24px_rgba(8,127,97,0.12)]"><img src="/images/tinytrace-logo.png" alt="" className="h-10 w-10 object-contain" /></span>
          <span><span className="block text-base font-bold tracking-tight">TinyTrace</span><span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#718096]">Intelligence, verified</span></span>
        </header>

        <section className="grid overflow-hidden rounded-[26px] border border-white/75 bg-white/85 shadow-[0_24px_72px_rgba(28,48,54,0.13)] backdrop-blur-2xl lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#076B53] p-8 text-white lg:flex xl:p-9">
            <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full border border-white/10" /><div className="absolute -right-6 top-14 h-56 w-56 rounded-full border border-white/10" /><div className="absolute -bottom-36 -left-20 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="relative"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20"><ShieldCheck className="h-[18px] w-[18px]" /></div><p className="mt-9 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">Vendor intelligence workspace</p><h1 className="mt-3 max-w-sm text-3xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-[34px]">Make each review easier to trust.</h1><p className="mt-4 max-w-sm text-[13px] leading-5 text-emerald-50/80">Bring company identity, source-backed findings, and ongoing monitoring into one secure workspace.</p></div>
            <div className="relative rounded-xl border border-white/15 bg-white/[0.08] p-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><LockKeyhole className="h-4 w-4" /></span><div><p className="text-xs font-semibold">Private workspace</p><p className="mt-1 text-[10px] text-emerald-50/70">Your reports are isolated to your account.</p></div></div></div>
          </aside>

          <div className="flex items-center justify-center p-5 sm:p-7 lg:p-8">
            <div className="w-full max-w-[400px]">
              <div className="mb-5 flex rounded-xl bg-[#EEF3F1] p-1" role="tablist" aria-label="Account access">
                <button type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => switchMode('signin')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${mode === 'signin' ? 'bg-white text-[#087F61] shadow-sm' : 'text-[#687385] hover:text-[#171C25]'}`}>Sign in</button>
                <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => switchMode('signup')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${mode === 'signup' ? 'bg-white text-[#087F61] shadow-sm' : 'text-[#687385] hover:text-[#171C25]'}`}>Create account</button>
              </div>

              <div key={mode} className={`auth-card-transition ${mode === 'signup' ? 'auth-card-from-right' : 'auth-card-from-left'}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#087F61]">{mode === 'signup' ? 'Get started with TinyTrace' : 'Welcome back'}</p>
                <h2 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.04em]">{mode === 'signup' ? 'Create your account' : 'Sign in to your workspace'}</h2>
                <p className="mt-1.5 text-[13px] leading-5 text-[#718096]">{mode === 'signup' ? 'Set up your secure account to start a private due diligence workspace.' : 'Use your account email and password to continue.'}</p>

                {notice && <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] leading-4 text-emerald-900">{notice}</div>}
                {!configured && <div role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-950">Account access needs Supabase setup. Add the project URL and publishable key to <code>.env</code>.</div>}
                {error && <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] leading-4 text-rose-900">{error}</div>}

                <form onSubmit={submit} className="mt-4 space-y-3">
                  {mode === 'signup' && <label className="block text-[11px] font-semibold text-[#526176]">Full name<div className={fieldClass}><input autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClass} placeholder="Your name" /></div></label>}
                  <label className="block text-[11px] font-semibold text-[#526176]">Email address<div className={fieldClass}><Mail className="h-3.5 w-3.5 shrink-0 text-[#8490A0]" /><input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@company.com" /></div></label>
                  <label className="block text-[11px] font-semibold text-[#526176]">Password<div className={fieldClass}><LockKeyhole className="h-3.5 w-3.5 shrink-0 text-[#8490A0]" /><input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="text-[#8490A0] hover:text-[#526176]">{showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button></div></label>
                  {mode === 'signup' && <label className="block text-[11px] font-semibold text-[#526176]">Confirm password<div className={fieldClass}><LockKeyhole className="h-3.5 w-3.5 shrink-0 text-[#8490A0]" /><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} placeholder="Repeat your password" /></div></label>}
                  <button type="submit" disabled={busy || !configured} className="group mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#087F61] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(8,127,97,0.18)] transition hover:-translate-y-0.5 hover:bg-[#066C53] hover:shadow-[0_12px_24px_rgba(8,127,97,0.22)] disabled:cursor-not-allowed disabled:opacity-55">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Please wait...</> : <>{mode === 'signup' ? 'Create secure account' : 'Sign in'}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}</button>
                </form>

                <p className="mt-4 text-center text-[11px] text-[#718096]">{mode === 'signup' ? 'Already have an account?' : 'New to TinyTrace?'}{' '}<button type="button" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} className="font-semibold text-[#087F61] hover:underline">{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-[9px] text-[#8490A0]"><LockKeyhole className="h-3 w-3" /> Account authentication is managed by Supabase.</p>
              </div>
            </div>
          </div>
        </section>
        <footer className="mt-3 flex items-center justify-center gap-1 text-[9px] text-[#8490A0]"><ShieldCheck className="h-3.5 w-3.5 text-[#087F61]" /> Evidence-based decision support · Secure account access</footer>
      </div>
    </main>
  );
}
