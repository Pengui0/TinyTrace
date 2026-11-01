import React, { useState } from 'react';
import {
  Building,
  ShieldCheck,
  Activity,
  HelpCircle,
  Menu,
  AlertTriangle,
  Sparkles,
  Zap,
  Info,
  X,
} from 'lucide-react';

interface TopbarProps {
  currentWorkspace: string;
  onOpenHelp: () => void;
  onOpenMobileMenu?: () => void;
  isBackendHealthy: boolean;
  isDemoMode: boolean;
  onToggleMode: (mode: 'DEMO' | 'LIVE') => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentWorkspace,
  onOpenHelp,
  onOpenMobileMenu,
  isBackendHealthy,
  isDemoMode,
  onToggleMode,
}) => {
  const [showConnectorWarningModal, setShowConnectorWarningModal] = useState<boolean>(false);
  const [connectorHealth, setConnectorHealth] = useState<any>(null);

  const handleSelectLiveMode = async () => {
    try {
      const res = await fetch('/api/health/integrations');
      if (res.ok) {
        const data = await res.json();
        setConnectorHealth(data);
        const hasUnconfigured = data.integrations?.some((i: any) => !i.configured);
        if (hasUnconfigured) {
          setShowConnectorWarningModal(true);
          return;
        }
      }
    } catch {
      // Ignore network failure and proceed with warning
    }
    onToggleMode('LIVE');
  };

  return (
    <>
      {/* Persistent Prominent Header Banner when in Demo Mode */}
      {isDemoMode && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-amber-200 bg-amber-50/90 px-4 py-2 text-center text-[11px] font-medium text-amber-950">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
          <span>
            DEMO DATA — SYNTHETIC EXAMPLE: Entirely fictional company and evidence for demonstration. Not real findings or allegations.
          </span>
          <button
            type="button"
            onClick={handleSelectLiveMode}
            className="rounded-md px-2 py-0.5 font-semibold text-amber-900 underline decoration-amber-400 underline-offset-2 transition hover:text-amber-950"
          >
            Switch to Live Mode
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 min-h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E4E9EB]/90 bg-white/85 px-3 backdrop-blur-xl sm:px-5">
        {/* Left: Mobile trigger & Workspace Indicator */}
          <div className="h-full min-w-0 flex items-center gap-3">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-1.5 text-[#687385] hover:text-[#1C1F26] rounded hover:bg-[#EEF2F3]"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex h-full min-w-0 items-center gap-2 text-xs">
            <span className="text-[#8490A0] font-medium hidden sm:inline">Workspace:</span>
            <div className="flex min-h-10 min-w-0 max-w-[calc(100vw_-_235px)] items-center gap-2 rounded-xl border border-[#E4E9EB] bg-white/75 px-2.5 font-medium text-[#171C25] shadow-sm sm:max-w-[min(58vw,390px)] sm:px-3">
              <Building className="h-4 w-4 shrink-0 text-[#526176]" />
              <span className="truncate">{currentWorkspace}</span>
            </div>
          </div>
        </div>

        {/* Center/Right: Mode Switcher & Health */}
        <div className="flex h-full shrink-0 items-center gap-1 text-xs sm:gap-3">
          {/* Mode Switcher Pill */}
          <div className="flex min-h-10 items-center rounded-xl border border-[#D7DFE3] bg-[#F8FAFB]/85 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onToggleMode('DEMO')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 text-[11px] font-bold cursor-pointer transition-colors ${
                isDemoMode
                  ? 'bg-violet-100 text-violet-900 shadow-sm'
                  : 'text-[#687385] hover:text-[#1C1F26]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              <span className="hidden sm:inline">Demo (Synthetic)</span><span className="sm:hidden">Demo</span>
            </button>
            <button
              type="button"
              onClick={handleSelectLiveMode}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 text-[11px] font-bold cursor-pointer transition-colors ${
                !isDemoMode
                  ? 'bg-[#087F61] text-white shadow-sm'
                  : 'text-[#687385] hover:text-[#1C1F26]'
              }`}
            >
              <Zap className={`h-3.5 w-3.5 ${!isDemoMode ? 'text-emerald-100' : 'text-[#087F61]'}`} />
              <span className="hidden sm:inline">Live Mode</span><span className="sm:hidden">Live</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#E4E9EB] hidden sm:block" />

          {/* Backend health status badge */}
          <div className="hidden items-center gap-1.5 text-[#687385] sm:flex">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendHealthy ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
              }`}
            />
            <span className="hidden sm:inline text-[11px] font-mono">
              {isBackendHealthy ? 'Engine Online' : 'Connecting...'}
            </span>
          </div>

          <div className="hidden h-4 w-px bg-[#E4E9EB] sm:block" />

          {/* Methodology popup trigger */}
          <button
            onClick={onOpenHelp}
            className="hidden items-center gap-1.5 text-[#687385] hover:text-[#1C1F26] px-2 py-1 rounded-lg hover:bg-[#EEF2F3] transition-colors cursor-pointer text-xs font-medium sm:flex"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#8490A0]" />
            <span className="hidden sm:inline">Verification Standards</span>
          </button>
        </div>
      </header>

      {/* Live Mode Connector Confirmation Modal */}
      {showConnectorWarningModal && (
        <div className="fixed inset-0 bg-[#171C25]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-[#D7DFE3] shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-md">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C1F26]">
                    Live Connector Readiness Check
                  </h3>
                  <span className="text-[11px] text-[#687385]">
                    Truthful Provider State Verification
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectorWarningModal(false)}
                className="text-[#8490A0] hover:text-[#1C1F26] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#687385] leading-relaxed">
              In accordance with TinyTrace zero-fabrication guarantees: Live investigations require authentic upstream registry access. The current server environment reports:
            </p>

            <div className="bg-[#F5F7F8] p-3 rounded border border-[#E4E9EB] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1C1F26]">IndiaCos Registry API:</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  {connectorHealth?.integrations?.find((i: any) => i.providerId === 'indiacos')?.configured ? 'Configured' : 'Key Not Set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1C1F26]">TinyFish Web Agent:</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  {connectorHealth?.integrations?.find((i: any) => i.providerId === 'tinyfish')?.configured ? 'Configured' : 'Key Not Set'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#8490A0]">
              If keys are absent, Live Mode will honestly report unconfigured connector statuses rather than inventing synthetic findings.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E9EB]">
              <button
                type="button"
                onClick={() => setShowConnectorWarningModal(false)}
                className="px-3 py-1.5 bg-[#F5F7F8] border border-[#D7DFE3] rounded text-xs font-semibold text-[#687385] hover:bg-white cursor-pointer"
              >
                Stay in Demo Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConnectorWarningModal(false);
                  onToggleMode('LIVE');
                }}
                className="px-3.5 py-1.5 bg-[#087F61] text-white rounded text-xs font-semibold hover:bg-[#066C53] cursor-pointer"
              >
                Proceed to Live Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
