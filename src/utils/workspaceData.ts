import type { WorkspaceSnapshot } from '../persistence/localStore.js';

function migrateRiskScore<T extends WorkspaceSnapshot['investigations'][number]>(investigation: T): T {
  const assessment = investigation.assessmentReport;
  const breakdown = assessment?.scoreBreakdown;
  if (!assessment || !breakdown || breakdown.scorePolicyVersion === 2) return investigation;

  const gaps = assessment.coverageGaps?.length || 0;
  const verificationCoveragePoints = assessment.coverageStatus === 'INADEQUATE'
    ? 15
    : assessment.coverageStatus === 'PARTIAL' ? Math.min(15, Math.max(5, gaps * 5)) : 0;
  const weightedTotal = (breakdown.severityPoints || 0)
    + (breakdown.confidencePoints || 0)
    + (breakdown.recencyPoints || 0)
    + verificationCoveragePoints;
  const totalScore = Math.min(100, Math.max(assessment.coverageStatus === 'INADEQUATE' ? 50 : 0, weightedTotal));
  const verificationCoverageRationale = assessment.coverageStatus === 'INADEQUATE'
    ? 'Core due-diligence checks are unavailable; maximum uncertainty points applied (15/15 pts).'
    : assessment.coverageStatus === 'PARTIAL'
      ? `Some required checks are incomplete; uncertainty points reflect coverage gaps (${verificationCoveragePoints}/15 pts).`
      : 'Required due-diligence checks completed; no coverage uncertainty points added (0/15 pts).';

  return {
    ...investigation,
    assessmentReport: {
      ...assessment,
      scoreBreakdown: {
        ...breakdown,
        identityMatchPoints: 0,
        identityMatchRationale: 'Identity matching associates findings with the entity; it does not add risk points.',
        verificationCoveragePoints,
        verificationCoverageRationale,
        scorePolicyVersion: 2,
        totalScore,
      },
      explainableRiskScore: totalScore,
    },
  };
}

/** Remove only the known synthetic walkthrough records from any workspace source. */
export function removeSyntheticDemoData(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  const isSynthetic = (value: unknown) => /\b(?:acme horizon technologies|synthetic demo|fictional demo)\b/i.test(String(value ?? ''));
  const removedIds = new Set<string>();
  const investigations = snapshot.investigations.filter((item) => {
    const remove = item.executionMode === 'DEMO' || /^inv_demo_run_/i.test(item.id) || isSynthetic(item.targetName);
    if (remove) removedIds.add(item.id);
    return !remove;
  }).map((item) => migrateRiskScore({ ...item, executionMode: 'LIVE' as const }));
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
