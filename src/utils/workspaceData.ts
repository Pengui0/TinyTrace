import type { WorkspaceSnapshot } from '../persistence/localStore.js';

/** Remove only the known synthetic walkthrough records from any workspace source. */
export function removeSyntheticDemoData(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  const isSynthetic = (value: unknown) => /\b(?:acme horizon technologies|synthetic demo|fictional demo)\b/i.test(String(value ?? ''));
  const removedIds = new Set<string>();
  const investigations = snapshot.investigations.filter((item) => {
    const remove = item.executionMode === 'DEMO' || /^inv_demo_run_/i.test(item.id) || isSynthetic(item.targetName);
    if (remove) removedIds.add(item.id);
    return !remove;
  }).map((item) => ({ ...item, executionMode: 'LIVE' as const }));
  const vendors = snapshot.vendors.filter((vendor) => !/^ven_demo_/i.test(vendor.id) && !isSynthetic(vendor.canonicalName));
  const comparisons = snapshot.comparisons.filter((comparison) => {
    const value = JSON.stringify(comparison);
    return !isSynthetic(value) && ![...removedIds].some((id) => value.includes(id));
  });
  const monitoringConfigs = Object.fromEntries(Object.entries(snapshot.monitoringConfigs).filter(([key, config]) => {
    const value = JSON.stringify(config);
    return !/^inv_demo_run_|^ven_demo_/i.test(key) && !isSynthetic(value) && ![...removedIds].some((id) => value.includes(id));
  }));
  const preferences: Record<string, unknown> = { ...snapshot.preferences, executionMode: 'LIVE' };
  const savedSettings = preferences.settings;
  if (savedSettings && typeof savedSettings === 'object' && !Array.isArray(savedSettings)) {
    const settings = { ...(savedSettings as Record<string, unknown>) };
    delete settings.mockTestResults;
    delete settings.tinyfishMockScenario;
    if (settings.tinyfishTestResult && typeof settings.tinyfishTestResult === 'object' && (settings.tinyfishTestResult as { isMock?: boolean }).isMock) {
      delete settings.tinyfishTestResult;
    }
    preferences.settings = settings;
  }
  return {
    ...snapshot,
    investigations,
    vendors,
    comparisons,
    monitoringConfigs,
    searchHistory: snapshot.searchHistory.filter((entry) => !isSynthetic(entry)),
    preferences: {
      ...preferences,
      currentInvestigationId: removedIds.has(String(snapshot.preferences.currentInvestigationId)) ? null : snapshot.preferences.currentInvestigationId,
    },
  };
}
