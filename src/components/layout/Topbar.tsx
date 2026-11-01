import React from 'react';
import { Activity, Building, HelpCircle, Menu, Zap } from 'lucide-react';

interface TopbarProps {
  currentWorkspace: string;
  onOpenHelp: () => void;
  onOpenMobileMenu?: () => void;
  isBackendHealthy: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ currentWorkspace, onOpenHelp, onOpenMobileMenu, isBackendHealthy }) => (
  <header className="sticky top-0 z-30 flex h-16 min-h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E4E9EB]/90 bg-white/85 px-3 backdrop-blur-xl sm:px-5">
    <div className="flex h-full min-w-0 items-center gap-3">
      {onOpenMobileMenu && <button onClick={onOpenMobileMenu} className="rounded p-1.5 text-[#687385] hover:bg-[#EEF2F3] hover:text-[#1C1F26] md:hidden" aria-label="Open sidebar"><Menu className="h-5 w-5" /></button>}
      <div className="flex h-full min-w-0 items-center gap-2 text-xs">
        <span className="hidden font-medium text-[#8490A0] sm:inline">Workspace:</span>
        <div className="flex min-h-10 min-w-0 max-w-[calc(100vw_-_235px)] items-center gap-2 rounded-xl border border-[#E4E9EB] bg-white/75 px-2.5 font-medium text-[#171C25] shadow-sm sm:max-w-[min(58vw,390px)] sm:px-3">
          <Building className="h-4 w-4 shrink-0 text-[#526176]" /><span className="truncate">{currentWorkspace}</span>
        </div>
      </div>
    </div>
    <div className="flex h-full shrink-0 items-center gap-2 text-xs sm:gap-3">
      <div className="flex min-h-10 items-center gap-1.5 rounded-xl border border-[#D7DFE3] bg-[#F8FAFB]/85 px-3 font-bold text-[#087F61] shadow-sm"><Zap className="h-3.5 w-3.5" /><span>Live Mode</span></div>
      <div className="hidden h-4 w-px bg-[#E4E9EB] sm:block" />
      <div className="hidden items-center gap-1.5 text-[#687385] sm:flex"><span className={`h-2 w-2 rounded-full ${isBackendHealthy ? 'animate-pulse bg-emerald-600' : 'bg-amber-600'}`} /><Activity className="h-3.5 w-3.5 sm:hidden" /><span className="font-mono text-[11px]">{isBackendHealthy ? 'Engine Online' : 'Connecting...'}</span></div>
      <div className="hidden h-4 w-px bg-[#E4E9EB] sm:block" />
      <button onClick={onOpenHelp} className="hidden cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[#687385] transition-colors hover:bg-[#EEF2F3] hover:text-[#1C1F26] sm:flex"><HelpCircle className="h-3.5 w-3.5 text-[#8490A0]" /><span>Verification Standards</span></button>
    </div>
  </header>
);
