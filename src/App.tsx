import { apiFetch } from './api/apiFetch.js';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { Sidebar, NavigationTab } from './components/layout/Sidebar.js';
import { Topbar } from './components/layout/Topbar.js';
import { HelpModal } from './components/common/HelpModal.js';
import { ConnectorModal } from './components/common/ConnectorModal.js';
import { IdentifierType, Investigation, SourceConnector, WorkspaceStats } from './types/vendor.js';
import { getInvestigationIdentityKey, keepLatestInvestigationPerIdentity } from './utils/investigationIdentity.js';
import { openCustomVendorSearch } from './components/overview/customVendorSearch.js';
import { clearLegacyBrowserWorkspace, emptyWorkspace, getStorageReadError, hydrateWorkspace, loadWorkspace, readLegacyWorkspaceForMigration, updateWorkspace, WorkspaceSnapshot } from './persistence/localStore.js';
import { applyFindingReviewResults, getHumanReviewCount } from './utils/reviewPolicy.js';
import { AuthGate } from './auth/AuthGate.js';
import { getActiveSession, signOut } from './auth/supabaseAuth.js';

const OverviewView = lazy(() => import('./components/overview/OverviewView.js').then((module) => ({ default: module.OverviewView })));
const InvestigationView = lazy(() => import('./components/investigations/InvestigationView.js').then((module) => ({ default: module.InvestigationView })));
const VendorsView = lazy(() => import('./components/vendors/VendorsView.js').then((module) => ({ default: module.VendorsView })));
const MonitoringView = lazy(() => import('./components/monitoring/MonitoringView.js').then((module) => ({ default: module.MonitoringView })));
const AutomatedMonitoringView = lazy(() => import('./components/monitoring/AutomatedMonitoringView.js').then((module) => ({ default: module.AutomatedMonitoringView })));
const MonitoringNotificationsView = lazy(() => import('./components/monitoring/MonitoringNotificationsView.js').then((module) => ({ default: module.MonitoringNotificationsView })));
const SettingsView = lazy(() => import('./components/settings/SettingsView.js').then((module) => ({ default: module.SettingsView })));
const InvestigationHistoryView = lazy(() => import('./components/investigations/InvestigationHistoryView.js').then((module) => ({ default: module.InvestigationHistoryView })));
const LiveEvidenceView = lazy(() => import('./components/investigations/LiveEvidenceView.js').then((module) => ({ default: module.LiveEvidenceView })));

function DashboardApp() {
  const [savedWorkspace] = useState<WorkspaceSnapshot>(() => loadWorkspace());
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [workspace] = useState('Tata Steel Ltd. • Vendor Due Diligence');
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [connectors, setConnectors] = useState<SourceConnector[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>(() => savedWorkspace.investigations);
  // Restore only the report explicitly marked active in this browser workspace. Starting a fresh
  // investigation clears this preference, so an unrelated historical report is never selected.
  const [currentInvestigation, setCurrentInvestigation] = useState<Investigation | null>(() => {
    const savedId = savedWorkspace.preferences.currentInvestigationId;
    return typeof savedId === 'string' ? savedWorkspace.investigations.find((item) => item.id === savedId) || null : null;
  });
  const [investigationSubTab, setInvestigationSubTab] = useState<'resolution' | 'evidence' | 'graph' | 'sources'>('evidence');
  const [investigationDraft, setInvestigationDraft] = useState<{ targetName: string; identifierType: IdentifierType; identifierValue: string } | null>(null);
  const [monitoringSelection, setMonitoringSelection] = useState<{ baselineId: string; latestId: string } | null>(null);
  const [automatedMonitorReportId, setAutomatedMonitorReportId] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [investigationWorkspaceKey, setInvestigationWorkspaceKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewProcessing, setIsReviewProcessing] = useState(() => savedWorkspace.investigations.some((item) =>
    item.executionMode !== 'DEMO' && item.assessmentReport?.reviewPolicyVersion !== 3 && Boolean(item.normalizedFindings?.length)
  ));
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<SourceConnector | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => savedWorkspace.preferences.sidebarCollapsed === true);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'integrations' | 'persistence' | 'rules'>('integrations');
  const [settingsInstanceKey, setSettingsInstanceKey] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const activeInvestigationRunIdRef = useRef<string | null>(null);
  const openNewInvestigation = (draft: { targetName: string; identifierType: IdentifierType; identifierValue: string } | null = null) => {
    setCurrentInvestigation(null);
    setInvestigationDraft(draft);
    updateWorkspace((current) => ({ ...current, preferences: { ...current.preferences, currentInvestigationId: null } }));
    setInvestigationSubTab('resolution');
    setInvestigationWorkspaceKey((key) => key + 1);
    setCurrentTab('investigations');
  };
  const handleNavigation = (tab: NavigationTab) => {
    if (tab === 'live-search') setNotification(null);
    if (tab === 'investigations') {
      setInvestigationSubTab(currentInvestigation || isLoading ? 'evidence' : 'resolution');
    }
    setCurrentTab(tab);
  };
  const toggleSidebar = () => {
    const collapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(collapsed);
    updateWorkspace((current) => ({ ...current, preferences: { ...current.preferences, sidebarCollapsed: collapsed } }));
  };
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [workspaceLoadError, setWorkspaceLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (getStorageReadError()) setStorageWarning(getStorageReadError());
    const onStorageError = (event: Event) => setStorageWarning((event as CustomEvent<string>).detail);
    window.addEventListener('tinytrace-storage-error', onStorageError);
    return () => window.removeEventListener('tinytrace-storage-error', onStorageError);
  }, []);

  useEffect(() => {
    if (workspaceReady) updateWorkspace((current) => ({ ...current, investigations }));
  }, [investigations, workspaceReady]);

  useEffect(() => {
    if (!workspaceReady) return;
    let active = true;
    const refreshUnreadNotifications = async () => {
      try {
        const response = await apiFetch('/api/monitoring/notifications?unread=true');
        if (!response.ok) return;
        const data = await response.json() as { notifications?: Array<{ id: string }> };
        if (active) setUnreadNotificationCount(data.notifications?.length || 0);
      } catch {
        // Badge refresh is best-effort; the Notifications tab reports its own loading errors.
      }
    };
    void refreshUnreadNotifications();
    const timer = window.setInterval(() => void refreshUnreadNotifications(), 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [workspaceReady]);

  useEffect(() => {
    if (!workspaceReady || !['overview', 'history', 'monitoring', 'auto-monitoring'].includes(currentTab)) return;
    let active = true;
    const refreshSavedReports = async () => {
      try {
        const response = await apiFetch('/api/workspace');
        if (!response.ok) return;
        const data = await response.json() as { snapshot?: WorkspaceSnapshot | null };
        if (!active || !data.snapshot) return;
        hydrateWorkspace(data.snapshot);
        setInvestigations(data.snapshot.investigations);
        setCurrentInvestigation((current) => current
          ? data.snapshot!.investigations.find((item) => item.id === current.id) || current
          : null);
      } catch {
        // Reopening a monitoring/report view refreshes its persisted state when available.
      }
    };
    void refreshSavedReports();
    const timer = currentTab === 'auto-monitoring'
      ? window.setInterval(() => void refreshSavedReports(), 30_000)
      : null;
    return () => { active = false; if (timer) window.clearInterval(timer); };
  }, [currentTab, workspaceReady]);

  // Fetch initial system state
  const loadWorkspaceData = async () => {
    let mergedInvestigations: Investigation[] = [];
    try {
      setWorkspaceLoadError(null);
      const workspaceRes = await apiFetch('/api/workspace');
      const workspaceData = await workspaceRes.json().catch(() => ({})) as { exists?: boolean; snapshot?: WorkspaceSnapshot | null; error?: string };
      if (!workspaceRes.ok) throw new Error(workspaceData.error || `Supabase workspace could not be loaded (HTTP ${workspaceRes.status}).`);

      let snapshot = workspaceData.snapshot || null;
      if (!workspaceData.exists || !snapshot) {
        const legacy = readLegacyWorkspaceForMigration();
        if (legacy.error) throw new Error(`Legacy browser data was not imported: ${legacy.error}`);
        snapshot = legacy.snapshot || emptyWorkspace();
        const importRes = await apiFetch('/api/workspace', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshot }),
        });
        if (!importRes.ok) {
          const importData = await importRes.json().catch(() => ({})) as { error?: string };
          throw new Error(importData.error || `Workspace migration to Supabase failed (HTTP ${importRes.status}).`);
        }
        clearLegacyBrowserWorkspace();
      }

      hydrateWorkspace(snapshot);
      mergedInvestigations = [...snapshot.investigations];
      setInvestigations(mergedInvestigations);
      const savedCurrentId = snapshot.preferences.currentInvestigationId;
      setCurrentInvestigation(typeof savedCurrentId === 'string'
        ? mergedInvestigations.find((item) => item.id === savedCurrentId) || null
        : null);
      if (snapshot.preferences.executionMode !== 'LIVE') {
        snapshot = { ...snapshot, preferences: { ...snapshot.preferences, executionMode: 'LIVE' } };
        hydrateWorkspace(snapshot);
        updateWorkspace((current) => ({ ...current, preferences: { ...current.preferences, executionMode: 'LIVE' } }));
      }
      setIsSidebarCollapsed(snapshot.preferences.sidebarCollapsed === true);
      setWorkspaceReady(true);

      // 1. Health check
      const healthRes = await apiFetch('/api/health');
      if (healthRes.ok) {
        setIsBackendHealthy(true);
      }

      // 2. Connectors
      const connRes = await apiFetch('/api/connectors');
      if (connRes.ok) {
        const connData = await connRes.json();
        setConnectors(connData.connectors || []);
      }

      // 3. Stats (real counts, no mock numbers)
      const statsRes = await apiFetch('/api/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 4. Historical investigations
      const invRes = await apiFetch('/api/investigations');
      if (invRes.ok) {
        const invData = await invRes.json();
        // Supabase workspace history is authoritative; the API contributes server-side investigation records.
        if (invData.investigations?.length) {
          const merged = new Map(mergedInvestigations.map((item) => [item.id, item]));
          invData.investigations.forEach((item: Investigation) => merged.set(item.id, item));
          mergedInvestigations = [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }
      }
      setInvestigations(mergedInvestigations);

      // Older saved reports have no second-layer result. Run it before marking their review status final.
      const needsReviewPass = mergedInvestigations.filter((item) =>
        item.executionMode !== 'DEMO' &&
        item.assessmentReport?.reviewPolicyVersion !== 3 &&
        Boolean(item.normalizedFindings?.length)
      );
      setIsReviewProcessing(needsReviewPass.length > 0);
      for (let offset = 0; offset < needsReviewPass.length; offset += 2) {
        const batch = needsReviewPass.slice(offset, offset + 2);
        const results = await Promise.all(batch.map(async (item) => {
          try {
            const response = await apiFetch(`/api/investigations/${encodeURIComponent(item.id)}/assessment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ investigation: item }),
            });
            if (!response.ok) return null;
            const assessment = await response.json();
            return {
              ...item,
              assessmentReport: assessment,
              findings: applyFindingReviewResults(item.findings, assessment.reviewedFindings || []),
              findingsCount: {
                ...item.findingsCount,
                requiresReview: assessment.humanReviewQueue?.length || 0,
              },
            } as Investigation;
          } catch {
            return null;
          }
        }));
        const completed = results.filter((item): item is Investigation => item !== null);
        if (completed.length) {
          const completedById = new Map(completed.map((item) => [item.id, item]));
          mergedInvestigations = mergedInvestigations.map((item) => completedById.get(item.id) || item);
          setInvestigations(mergedInvestigations);
          setCurrentInvestigation((current) => current ? completedById.get(current.id) || current : current);
        }
      }
    } catch (err) {
      console.error('Error loading initial workspace data:', err);
      setIsBackendHealthy(false);
      setWorkspaceLoadError(err instanceof Error ? err.message : 'Supabase workspace could not be loaded.');
    } finally {
      setWorkspaceReady(true);
      setIsReviewProcessing(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  // Handle new due diligence run
  const handleInvestigate = async (params: {
    targetName: string;
    identifierType: IdentifierType;
    identifierValue: string;
    gstin?: string;
  }) => {
    setIsLoading(true);
    setNotification(null);
    setCurrentTab('investigations');
    setCurrentInvestigation(null);
    setInvestigationSubTab('resolution');
    const clientRunId = crypto.randomUUID();
    activeInvestigationRunIdRef.current = clientRunId;

    try {
      const res = await apiFetch('/api/investigations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...params, useMock: false, clientRunId }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to execute investigation');
      }

      const newInv: Investigation = await res.json();
      setCurrentInvestigation(newInv);
      updateWorkspace((current) => ({ ...current, preferences: { ...current.preferences, currentInvestigationId: newInv.id } }));
      setInvestigations((prev) => [newInv, ...prev]);
      setCurrentTab('investigations');
      const hasPartialResults = Boolean(newInv.coverageGaps?.length)
        && (newInv.findings.length > 0 || Object.values(newInv.dimensionResults || {}).some((result: any) => result?.findings?.length || result?.sourcesChecked?.length));
      setNotification(newInv.status === 'CANCELLED'
        ? `Investigation cancelled for ${newInv.targetName}. Completed task results and coverage gaps were saved.`
        : newInv.status === 'PARTIAL_FAILURE' || (newInv.status === 'FAILED' && hasPartialResults)
        ? `Partial investigation completed for ${newInv.targetName}. Coverage gaps are included in the saved report.`
        : newInv.status === 'FAILED'
        ? `Investigation failed for ${newInv.targetName}. The report includes available task results and failure details.`
        : `Investigation completed for ${newInv.targetName}. Report saved to workspace.`);

      // Refresh real stats
      const statsRes = await apiFetch('/api/stats');
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err: any) {
      const message = err instanceof TypeError && /fetch/i.test(err.message)
        ? 'TinyTrace could not reach its investigation API. Check that the backend server is running, then retry. Your investigation was not confirmed as saved.'
        : `Investigation failed: ${err?.message || 'The server returned an unexpected response.'}`;
      alert(message);
    } finally {
      if (activeInvestigationRunIdRef.current === clientRunId) {
        activeInvestigationRunIdRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const handleCancelInvestigation = async () => {
    const runId = activeInvestigationRunIdRef.current;
    if (!runId) return;
    try {
      const response = await apiFetch('/api/investigations/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `HTTP ${response.status}`);
      setNotification(result.message);
    } catch (error: any) {
      setNotification(`Cancellation could not be confirmed: ${error.message}`);
    }
  };

  const handleSelectInvestigation = async (id: string) => {
    const found = investigations.find((investigation) => investigation.id === id);
    if (found) {
      setInvestigationDraft(null);
      setMonitoringSelection(null);
      setCurrentInvestigation(found);
      updateWorkspace((current) => ({ ...current, preferences: { ...current.preferences, currentInvestigationId: found.id } }));
      setCurrentTab('investigations');
      setInvestigationSubTab('evidence');
    }
  };

  const handleDeleteInvestigation = async (id: string) => {
    const target = investigations.find((item) => item.id === id);
    if (!target) throw new Error('This report is no longer in the workspace. Refresh the page and try again.');
    const response = await apiFetch(`/api/investigations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: {
        targetName: target.targetName,
        identifierType: target.identifierType,
        identifierValue: target.identifierValue,
      } }),
    });
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const error = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : {};
      if (response.status === 404) {
        throw new Error('Report deletion is not available in the running server yet. Restart the TinyTrace server, refresh this page, and try again.');
      }
      throw new Error(error.error || `Report history could not be deleted (server returned HTTP ${response.status}).`);
    }
    const result = await response.json();
    const deletedIds = new Set<string>(result.deletedIds || [id]);
    const identityKey = getInvestigationIdentityKey(target);
    setInvestigations((previous) => previous.filter((item) =>
      !deletedIds.has(item.id) && getInvestigationIdentityKey(item) !== identityKey
    ));
    setCurrentInvestigation((current) => current && getInvestigationIdentityKey(current) === identityKey ? null : current);
    setNotification(`Removed ${target.targetName} and its duplicate runs from report history.`);
  };

  const handleTriggerReRun = (inv: Investigation) => {
    handleInvestigate({
      targetName: inv.targetName,
      identifierType: inv.identifierType,
      identifierValue: inv.identifierValue,
    });
  };

  const activeConnectorsCount = connectors.filter((c) => c.status === 'HEALTHY').length;
  const unavailableConnectorsCount = connectors.filter((c) => c.status === 'UNAVAILABLE').length;
  const uniqueInvestigationCount = keepLatestInvestigationPerIdentity(investigations).length;
  const displayStats = stats && investigations.length > 0 ? {
    ...stats,
    totalInvestigations: investigations.length,
    totalTrackedVendors: uniqueInvestigationCount,
    pendingReviews: investigations.reduce((total, item) => total + getHumanReviewCount(item), 0),
    highRiskFlags: investigations.reduce((total, item) => total + (item.findingsCount.materialRisk || 0), 0),
  } : stats;

  if (!workspaceReady) {
    return <main className="flex h-screen items-center justify-center bg-[#F5F7F8] text-sm text-[#687385]">Loading TinyTrace workspace from Supabase…</main>;
  }

  if (workspaceLoadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7F8] px-4 py-10">
        <section className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-7 shadow-sm">
          <h1 className="text-lg font-bold text-[#1C1F26]">Supabase workspace unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#687385]">{workspaceLoadError}</p>
          <p className="mt-3 text-xs leading-relaxed text-[#687385]">Run <code>supabase/schema.sql</code> in the Supabase SQL Editor, set <code>SUPABASE_URL</code> and <code>SUPABASE_SECRET_KEY</code> in the server environment, then restart TinyTrace. Existing browser data is only removed after a successful import.</p>
          <button type="button" onClick={loadWorkspaceData} className="mt-5 rounded-lg bg-[#087F61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#066C53]">Retry connection</button>
        </section>
      </main>
    );
  }

  return (
    <div className="dashboard-canvas h-dvh w-full flex overflow-hidden bg-[#F5F7F8] text-[#1C1F26]">
      {/* Desktop Sidebar */}
      <div className={`hidden md:block h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0' : 'w-[286px]'}`}>
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleNavigation}
          investigationCount={uniqueInvestigationCount > 0 ? uniqueInvestigationCount : null}
          activeConnectorsCount={activeConnectorsCount}
          unavailableConnectorsCount={unavailableConnectorsCount}
          totalConnectorsCount={connectors.length}
          unreadNotificationCount={unreadNotificationCount}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onStartInvestigation={() => openNewInvestigation()}
          isNewInvestigation={currentTab === 'investigations' && currentInvestigation === null}
          isInvestigating={isLoading}
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {isSidebarCollapsed && (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
          title="Open navigation"
          className="fixed left-3 top-1/2 z-40 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/70 bg-white/65 text-[#26313F] shadow-[0_8px_30px_rgba(28,31,38,0.18)] backdrop-blur-xl transition duration-200 hover:scale-105 hover:bg-white/85 hover:shadow-[0_12px_36px_rgba(28,31,38,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:flex"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#171C25]/45 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                handleNavigation(tab);
                setIsMobileMenuOpen(false);
              }}
              investigationCount={uniqueInvestigationCount > 0 ? uniqueInvestigationCount : null}
              activeConnectorsCount={activeConnectorsCount}
              unavailableConnectorsCount={unavailableConnectorsCount}
              totalConnectorsCount={connectors.length}
              unreadNotificationCount={unreadNotificationCount}
              onOpenHelp={() => {
                setIsHelpModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              onStartInvestigation={() => {
                openNewInvestigation();
                setIsMobileMenuOpen(false);
              }}
              isNewInvestigation={currentTab === 'investigations' && currentInvestigation === null}
              isInvestigating={isLoading}
              onToggleCollapse={() => undefined}
            />
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="app-screen-scroll flex-1 flex flex-col min-w-0 h-full min-h-0 overflow-y-auto">
        <Topbar
          currentWorkspace={workspace}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          isBackendHealthy={isBackendHealthy}
          accountLabel={getActiveSession()?.user.displayName || getActiveSession()?.user.email || 'Account'}
          onSignOut={() => { void signOut(); }}
        />

        {/* Global Notification Banner if present */}
        {notification && currentTab !== 'live-search' && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-1.5 text-[11px] text-emerald-800 flex items-center justify-between">
            <span>{notification}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content View */}
        {storageWarning && <div role="alert" className="px-5 py-2 text-xs bg-amber-100 text-amber-950 border-b border-amber-300 flex justify-between">{storageWarning}<button onClick={() => { setSettingsInitialTab('persistence'); setSettingsInstanceKey((key) => key + 1); setCurrentTab('settings'); }} className="underline font-semibold">Open backup options</button></div>}
        <main className="mx-auto w-full max-w-[1380px] flex-1 space-y-6 px-4 py-5 sm:px-6 md:py-7 xl:px-8">
          <Suspense fallback={<div className="rounded-xl border border-[#E4E9EB] bg-white p-6 text-sm text-[#687385]">Loading workspace view…</div>}>
          {currentTab === 'overview' && (
            <OverviewView
              stats={displayStats}
              connectors={connectors}
              investigations={investigations}
              isReviewProcessing={isReviewProcessing}
              onStartInvestigation={openNewInvestigation}
              onSelectInvestigation={handleSelectInvestigation}
              onDeleteInvestigation={handleDeleteInvestigation}
              onSelectConnectorDetails={(conn) => setSelectedConnector(conn)}
              isLoading={isLoading}
              onOpenCustomResolver={() => openCustomVendorSearch(
                (tab) => handleNavigation(tab),
                (tab) => setInvestigationSubTab(tab),
              )}
            />
          )}

          {currentTab === 'investigations' && (
            <InvestigationView
              key={investigationWorkspaceKey}
              currentInvestigation={currentInvestigation}
              investigationDraft={investigationDraft}
              onInvestigate={handleInvestigate}
              onCancelInvestigation={handleCancelInvestigation}
              isLoading={isLoading}
              activeSubTab={investigationSubTab}
              onSubTabChange={setInvestigationSubTab}
              onOpenMonitoring={() => setCurrentTab('monitoring')}
            />
          )}

          {currentTab === 'live-search' && (
            <LiveEvidenceView
              investigations={investigations}
            />
          )}

          {currentTab === 'history' && (
            <InvestigationHistoryView
              investigations={investigations}
              onSelectInvestigation={handleSelectInvestigation}
              onStartInvestigation={openNewInvestigation}
              onDeleteInvestigation={handleDeleteInvestigation}
            />
          )}

          {currentTab === 'vendors' && (
            <VendorsView
              investigations={investigations}
              onStartInvestigation={openNewInvestigation}
              onSelectInvestigation={(invId) => {
                handleSelectInvestigation(invId);
                setCurrentTab('investigations');
              }}
              onCompareInvestigations={(_prevId, _currId) => {
                const selection = { baselineId: _prevId, latestId: _currId };
                setMonitoringSelection(selection);
                const latest = investigations.find((item) => item.id === _currId);
                if (latest) {
                  setCurrentInvestigation(latest);
                  updateWorkspace((current) => ({ ...current, preferences: { ...current.preferences, currentInvestigationId: latest.id } }));
                }
                setCurrentTab('monitoring');
              }}
            />
          )}

          {currentTab === 'monitoring' && (
            <MonitoringView
              investigations={investigations}
              selectedInvestigation={currentInvestigation}
              comparisonSelection={monitoringSelection}
              onTriggerReRun={handleTriggerReRun}
              isLoading={isLoading}
              onInvestigationUpdated={(updated) => {
                setInvestigations((prev) => [updated, ...prev.filter((i) => i.id !== updated.id)]);
                setCurrentInvestigation(updated);
                loadWorkspaceData();
              }}
              onOpenAutomatedMonitoring={(reportId) => {
                setAutomatedMonitorReportId(reportId || null);
                setCurrentTab('auto-monitoring');
              }}
            />
          )}

          {currentTab === 'auto-monitoring' && (
            <AutomatedMonitoringView investigations={investigations} initialReportId={automatedMonitorReportId} />
          )}

          {currentTab === 'notifications' && (
            <MonitoringNotificationsView
              onUnreadCountChange={setUnreadNotificationCount}
              onOpenComparison={async (comparisonId) => {
                try {
                  const response = await apiFetch('/api/workspace');
                  if (response.ok) {
                    const data = await response.json() as { snapshot?: WorkspaceSnapshot | null };
                    if (data.snapshot) {
                      hydrateWorkspace(data.snapshot);
                      const comparison = data.snapshot.comparisons.find((item) => item.comparisonId === comparisonId);
                      if (comparison) setMonitoringSelection({ baselineId: comparison.previousInvestigationId, latestId: comparison.latestInvestigationId });
                      setInvestigations(data.snapshot.investigations);
                    }
                  }
                } catch {
                  // Still take the user to Compare reports if the refresh request fails.
                }
                setCurrentTab('monitoring');
              }}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView key={settingsInstanceKey} connectors={connectors} initialTab={settingsInitialTab} />
          )}
          </Suspense>
        </main>
      </div>

      {/* Methodological Standards Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Connector Details Modal */}
      <ConnectorModal
        connector={selectedConnector}
        onClose={() => setSelectedConnector(null)}
      />
    </div>
  );
}

export default function App() {
  return <AuthGate><DashboardApp /></AuthGate>;
}
