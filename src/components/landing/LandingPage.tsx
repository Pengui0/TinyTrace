import React, { useState } from 'react';
import { ArrowRight, Building2, Check, ChevronDown, Network, ShieldCheck, Sparkles, UserRoundSearch } from 'lucide-react';

const capabilities = [
  { icon: ShieldCheck, title: 'Evidence-led assessments', body: 'Every material finding carries source provenance, confidence, recency, and an audit-ready explanation.' },
  { icon: Network, title: 'Entity tracing', body: 'Follow shared directors, registered addresses, and linked corporate identifiers with explicit trace boundaries.' },
  { icon: UserRoundSearch, title: 'Human-reviewed judgment', body: 'Ambiguous evidence stays ambiguous. VendorTrace separates verified facts from leads that require review.' },
];

const proofPoints = [
  'CIN, GSTIN, PAN & DIN resolution',
  'Deterministic explainable risk scoring',
  'PDF & CSV evidence registers',
  'Change monitoring and report comparison',
];

export function LandingPage() {
  const [showMethodology, setShowMethodology] = useState(false);
  const openDashboard = () => window.location.assign('/dashboard');

  return (
    <div className="landing-page min-h-screen overflow-hidden bg-[#F5F7F8] text-[#171C25]">
      <nav className="relative z-20 mx-auto flex h-20 max-w-[1200px] items-center justify-between px-5 sm:px-8" aria-label="Primary navigation">
        <a href="/" className="flex items-center gap-3" aria-label="VendorTrace home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087F61] shadow-[0_8px_24px_rgba(8,127,97,0.16)]"><ShieldCheck className="h-5 w-5 text-[#B8E5D5]" strokeWidth={2} /></span>
          <span><span className="block text-[17px] font-bold tracking-[-0.02em]">VendorTrace</span><span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#718096]">Intelligence, verified</span></span>
        </a>
        <button type="button" onClick={() => setShowMethodology((open) => !open)} className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[#526176] transition hover:bg-white hover:text-[#087F61] sm:flex" aria-expanded={showMethodology}>
          Methodology <ChevronDown className={`h-4 w-4 transition ${showMethodology ? 'rotate-180' : ''}`} />
        </button>
      </nav>

      {showMethodology && <div className="relative z-20 mx-auto max-w-[1200px] px-5 sm:px-8"><div className="ml-auto max-w-md rounded-2xl border border-[#E4E9EB] bg-white p-5 shadow-xl shadow-[#171C25]/8"><p className="text-sm font-semibold text-[#171C25]">Evidence, not speculation</p><p className="mt-2 text-sm leading-6 text-[#687385]">Findings are cross-checked, scored deterministically, and clearly labelled when coverage or corroboration is insufficient.</p></div></div>}

      <main>
        <section className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-16 pt-14 sm:px-8 md:pt-20 lg:grid-cols-[1.06fr_0.94fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="relative z-10 max-w-[650px]">
            <h1 className="max-w-[610px] text-[46px] font-bold leading-[0.98] tracking-[-0.055em] text-[#171C25] sm:text-[62px] lg:text-[72px]">
              Know who you are <span className="text-[#087F61]">really doing business with.</span>
            </h1>
            <p className="mt-7 max-w-[560px] text-lg leading-8 text-[#637188] sm:text-xl">VendorTrace turns fragmented corporate, regulatory, legal, and adverse-media signals into clear, explainable vendor intelligence.</p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-l-2 border-[#B8E5D5] pl-4 text-xs font-semibold tracking-wide text-[#526176]">
              <span>Verified public records</span><span>Traceable evidence</span><span>Human reviewed</span>
            </div>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={openDashboard} className="group inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-[#087F61] px-6 text-base font-bold text-white shadow-[0_14px_36px_rgba(8,127,97,0.2)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#066C53] hover:shadow-[0_18px_44px_rgba(8,127,97,0.24)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B8E5D5]">
                Open the dashboard <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <span className="px-2 text-center text-sm font-medium text-[#7A8799] sm:text-left">Explore with deterministic demo data</span>
            </div>
            <div className="mt-10 grid max-w-[560px] grid-cols-2 gap-x-5 gap-y-3">
              {proofPoints.map((point) => <div key={point} className="flex items-center gap-2 text-sm font-medium text-[#526176]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E7F5F0]"><Check className="h-3 w-3 text-[#087F61]" strokeWidth={3} /></span>{point}</div>)}
            </div>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[530px] lg:max-w-none">
            <div className="absolute -left-12 top-12 h-52 w-52 rounded-full bg-[#DDF3EC] blur-3xl" /><div className="absolute -right-16 bottom-6 h-64 w-64 rounded-full bg-[#E8E5FA] blur-3xl" />
            <div className="relative rounded-[28px] border border-[#E4E9EB] bg-white p-3 shadow-[0_36px_90px_rgba(43,60,82,0.16)]">
              <div className="overflow-hidden rounded-[20px] border border-[#E4E9EB] bg-[#F8FAFB]">
                <div className="flex h-11 items-center justify-between border-b border-[#E4E9EB] bg-white px-4"><div className="flex gap-1.5" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-[#E7BDB9]" /><span className="h-2.5 w-2.5 rounded-full bg-[#ECDDA9]" /><span className="h-2.5 w-2.5 rounded-full bg-[#A9DCC8]" /></div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8490A0]">Illustrative report layout</span><div className="h-5 w-5 rounded-md bg-[#EEF2F3]" /></div>
                <div className="grid min-h-[430px] grid-cols-[62px_1fr]">
                  <div className="border-r border-[#E4E9EB] bg-white p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#087F61]"><ShieldCheck className="h-4 w-4 text-[#B8E5D5]" /></div><div className="mt-7 space-y-3">{[0,1,2,3].map((item) => <div key={item} className={`h-8 rounded-lg ${item === 0 ? 'border border-[#B8E5D5] bg-[#E7F5F0]' : 'bg-[#F1F5F6]'}`} />)}</div></div>
                  <div className="p-5 sm:p-7">
                    <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8490A0]">Workspace preview</p><p className="mt-1 text-lg font-bold text-[#171C25]">Evidence-led assessment</p></div><span className="rounded-full bg-[#E7F5F0] px-2.5 py-1 text-[10px] font-bold text-[#087F61]">SAMPLE LAYOUT</span></div>
                    <div className="mt-6 rounded-2xl border border-[#E4E9EB] bg-white p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7F5F0] text-[#087F61]"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-[#171C25]">Identity and risk summary</p><p className="mt-1 text-xs leading-5 text-[#687385]">Review verified identifiers, findings, and coverage before making a decision.</p></div></div><div className="mt-5 h-px bg-[#E4E9EB]" /><div className="mt-4 flex items-center justify-between text-xs"><span className="font-medium text-[#687385]">Report evidence</span><span className="font-semibold text-[#087F61]">Source-linked details</span></div></div>
                    <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#E4E9EB] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8490A0]">Company registry</p><div className="mt-3 flex items-center gap-2 text-sm font-bold text-[#171C25]"><Building2 className="h-4 w-4 text-[#087F61]" /> Identity details</div></div><div className="rounded-xl border border-[#E4E9EB] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8490A0]">Source review</p><div className="mt-3 flex items-center gap-2 text-sm font-bold text-[#171C25]"><Network className="h-4 w-4 text-[#3986C9]" /> Evidence trail</div></div></div>
                    <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#F1F5F6] px-4 py-3 text-xs text-[#526176]"><Sparkles className="h-4 w-4 shrink-0 text-[#3986C9]" />Coverage gaps and human review items stay visible in each report.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E4E9EB] bg-white/75"><div className="mx-auto grid max-w-[1200px] gap-px px-5 py-12 sm:px-8 md:grid-cols-3">{capabilities.map((capability) => { const Icon = capability.icon; return <article key={capability.title} className="px-0 py-5 md:px-8 md:py-2 first:pl-0 md:[&:not(:last-child)]:border-r md:[&:not(:last-child)]:border-[#E4E9EB]"><Icon className="h-6 w-6 text-[#087F61]" strokeWidth={1.8} /><h2 className="mt-5 text-xl font-bold tracking-tight text-[#171C25]">{capability.title}</h2><p className="mt-3 max-w-sm text-sm leading-6 text-[#69788C]">{capability.body}</p></article>; })}</div></section>

        <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 md:py-20"><div className="grid items-center gap-10 rounded-[28px] bg-[#087F61] px-6 py-10 text-white sm:px-10 lg:grid-cols-[1fr_auto] lg:px-14"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8E5D5]">Built for the diligence desk</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Move from fragmented signals to a defensible vendor record.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-[#C8D4DF]">Start with synthetic demo data. Then explore the live investigation workspace when provider integrations are ready.</p></div><button type="button" onClick={openDashboard} className="group inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-white px-6 font-bold text-[#075842] shadow-lg transition hover:-translate-y-1 hover:bg-[#E7F5F0]"><Building2 className="h-5 w-5" />Enter workspace <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></button></div></section>
      </main>
      <footer className="border-t border-[#E4E9EB] bg-white"><div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-7 text-xs text-[#7A8799] sm:flex-row sm:items-center sm:justify-between sm:px-8"><p>© {new Date().getFullYear()} VendorTrace</p><p className="font-medium">Decision support—not automated accusations.</p></div></footer>
    </div>
  );
}
