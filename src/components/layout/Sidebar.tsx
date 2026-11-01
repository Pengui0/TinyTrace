import React from 'react';
import {
  LayoutDashboard,
  SearchCheck,
  Building2,
  GitCompareArrows,
  SlidersHorizontal,
  HelpCircle,
  History,
  Radio,
  Plus,
  PanelLeftClose,
} from 'lucide-react';

export type NavigationTab = 'overview' | 'investigations' | 'live-search' | 'history' | 'vendors' | 'monitoring' | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  investigationCount?: number | null;
  activeConnectorsCount: number;
  totalConnectorsCount: number;
  onOpenHelp: () => void;
  onStartInvestigation: () => void;
  isNewInvestigation: boolean;
  isInvestigating: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  investigationCount,
  activeConnectorsCount,
  totalConnectorsCount,
  onOpenHelp,
  onStartInvestigation,
  isNewInvestigation,
  isInvestigating,
  onToggleCollapse,
}) => {
  const navGroups = [
    { label: 'Workspace', items: [
    {
      id: 'overview' as NavigationTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'investigations' as NavigationTab,
      label: 'Investigate',
      icon: SearchCheck,
      badge: null,
    },
    {
      id: 'live-search' as NavigationTab,
      label: 'Live research',
      icon: Radio,
      badge: 'LIVE',
      isLive: true,
    },
    ] },
    { label: 'Records', items: [
    {
      id: 'vendors' as NavigationTab,
      label: 'Vendors',
      icon: Building2,
      badge: null,
    },
    ] },
    { label: 'Review', items: [
    {
      id: 'history' as NavigationTab,
      label: 'Investigation history',
      icon: History,
      badge: investigationCount ? String(investigationCount) : null,
    },
    {
      id: 'monitoring' as NavigationTab,
      label: 'Compare reports',
      icon: GitCompareArrows,
      badge: null,
    },
    ] },
    { label: 'Administration', items: [
    {
      id: 'settings' as NavigationTab,
      label: 'Settings',
      icon: SlidersHorizontal,
      badge: null,
    },
    ] },
  ];

  return (
    <aside className="flex h-full w-[286px] shrink-0 flex-col border-r border-[#E4E9EB] bg-white/90 backdrop-blur-xl">
      {/* Top Brand Identity */}
      <div className="h-16 min-h-16 shrink-0 px-4 border-b border-[#E4E9EB] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
        <div aria-hidden="true" className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white shadow-[0_5px_12px_rgba(8,127,97,0.12)]">
          <img src="/images/tinytrace-logo.png" alt="" className="absolute left-1/2 top-0 h-auto w-20 max-w-none -translate-x-1/2" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-[#1C1F26]">
            TinyTrace
          </span>
          <span className="text-[10px] text-[#687385] leading-none uppercase tracking-wider font-medium">
            Due Diligence & Tracing
          </span>
        </div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E4E9EB] bg-white/80 text-[#687385] transition hover:border-[#D7DFE3] hover:bg-[#EEF2F3] hover:text-[#1C1F26]"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="px-3 pt-2.5">
        <button
          type="button"
          onClick={onStartInvestigation}
          disabled={isInvestigating}
          title={isInvestigating ? 'Finish or cancel the active investigation before starting another.' : undefined}
          className={`w-full min-h-11 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition duration-150 shadow-[0_5px_14px_rgba(8,127,97,0.16)] ${isNewInvestigation ? 'bg-[#066C53] ring-2 ring-emerald-200' : 'bg-[#087F61] hover:bg-[#066C53] hover:shadow-md'} text-white disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Plus className="h-4 w-4" /> New investigation
        </button>
      </div>

      <nav className="sidebar-navigation flex-1 px-3 py-3.5 space-y-3.5 overflow-y-auto" aria-label="Main navigation">
        {navGroups.map((group) => <section key={group.label} className="space-y-1">
          <div className="px-3 pb-0.5 text-[10px] uppercase tracking-[0.13em] font-semibold text-[#8490A0]">{group.label}</div>
          {group.items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isLive = 'isLive' in item && item.isLive;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative w-full flex min-h-9 items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition duration-150 cursor-pointer select-none text-left ${
                isActive
                  ? 'bg-[#E7F5F0] text-[#075842] font-semibold shadow-[inset_0_0_0_1px_rgba(8,127,97,0.07)] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[#087F61]'
                  : 'text-[#526176] hover:bg-[#F5F8F8] hover:text-[#171C25]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#087F61]' : 'text-[#8490A0]'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-white text-[#087F61]'
                      : isLive ? 'bg-[#E7F5F0] text-[#087F61]'
                      : 'bg-[#EEF2F3] text-[#526176]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
          })}
        </section>)}
      </nav>

      {/* Bottom Workspace & Connector Health summary */}
      <div className="space-y-2 border-t border-[#E4E9EB] bg-white/70 p-2.5">
        {/* Source connectors indicator */}
        <div className="space-y-1 rounded-xl border border-[#E4E9EB] bg-[#F8FAFB] p-2.5 text-xs">
          <div className="flex items-center justify-between text-[11px] font-medium text-[#1C1F26]">
            <span>Connector Probes</span>
            <span className="text-[#087F61] font-mono tabular-nums text-[10px]">
              {activeConnectorsCount}/{totalConnectorsCount} healthy
            </span>
          </div>
          <p className="line-clamp-2 text-[10px] leading-snug text-[#8490A0]">
            Successful connection probes only. Configured credentials and completed investigations are tracked separately.
          </p>
        </div>

        {/* Help & Documentation trigger */}
        <button
          onClick={onOpenHelp}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[#687385] hover:text-[#1C1F26] hover:bg-[#EEF2F3] rounded transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-[#8490A0]" />
            Diligence Methodology
          </span>
          <span className="text-[10px] text-[#8490A0]">Rules</span>
        </button>
      </div>
    </aside>
  );
};
