import { Finding, Investigation } from '../types/vendor.js';
import { RiskFinding } from '../types/riskFinding.js';
import { CrossValidatedFinding } from '../types/crossValidation.js';

const isIdentityConcern = (finding: RiskFinding) =>
  finding.confidence === 'insufficient_evidence' &&
  finding.evidence.some((evidence) => /weak|fuzzy|no match/i.test(evidence.identityMatchNote || ''));

const isManualEscalation = (finding: RiskFinding) =>
  finding.severity >= 5 ||
  finding.confidence === 'conflicting_sources' ||
  finding.status === 'conflicting_evidence' ||
  (finding.status === 'inconclusive' && finding.severity >= 4) ||
  isIdentityConcern(finding);

export function getHumanReviewCount(investigation: Investigation): number {
  const assessment = investigation.assessmentReport;
  if (assessment?.reviewPolicyVersion === 2) return assessment.humanReviewQueue?.length || 0;
  if (assessment?.identityMatchQuality === 'WEAK' || assessment?.identityMatchQuality === 'NO_MATCHING_ENTITY') {
    return investigation.normalizedFindings?.length || investigation.findings.filter((finding) =>
      finding.verificationStatus === 'CONFLICTING_EVIDENCE' || finding.identityMatchStrength === 'WEAK'
    ).length;
  }
  if (investigation.normalizedFindings) return investigation.normalizedFindings.filter(isManualEscalation).length;
  return investigation.findings.filter((finding) =>
    finding.verificationStatus === 'CONFLICTING_EVIDENCE' ||
    finding.identityMatchStrength === 'WEAK' ||
    finding.riskLevel === 'MATERIAL_RISK'
  ).length;
}

export function getAICheckedCount(investigation: Investigation): number {
  return investigation.assessmentReport?.reviewPolicyVersion === 2
    ? investigation.assessmentReport.aiVerificationSummary?.supported || 0
    : investigation.findings.filter((finding) => finding.verificationStatus === 'AI_REVIEWED').length;
}

export function applyFindingReviewResults(findings: Finding[], reviewed: CrossValidatedFinding[]): Finding[] {
  return findings.map((finding, index) => {
    const result = reviewed[index];
    if (!result) return finding;
    const verificationStatus = result.confidence === 'conflicting_sources'
      ? 'CONFLICTING_EVIDENCE'
      : result.needsHumanReview
      ? 'REQUIRES_HUMAN_REVIEW'
      : result.aiVerificationStatus === 'AI_SUPPORTED'
      ? 'AI_REVIEWED'
      : result.confidence === 'multiple_independent_sources'
      ? 'CORROBORATED'
      : 'UNRESOLVED';
    return {
      ...finding,
      verificationStatus,
      notesForOfficer: result.aiVerificationRationale
        ? [finding.notesForOfficer, 'AI verification: ' + result.aiVerificationRationale].filter(Boolean).join(' ')
        : finding.notesForOfficer,
    };
  });
}
