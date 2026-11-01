import React from 'react';
import { Investigation, SourceConnector, WorkspaceStats } from '../../types/vendor.js';
import { MetricCounter } from './MetricCounter.js';
import { SourceHealthGrid } from './SourceHealthGrid.js';
import { EmptyState } from '../common/EmptyState.js';
import { Button } from '../common/Button.js';
import { Badge, BadgeTone } from '../common/Badge.js';
import { getAICheckedCount, getHumanReviewCount } from '../../utils/reviewPolicy.js';
import {
  ArrowRight,
  Building2,
  FileText,
  Layers3,
  Plus,
  Search,
  SearchCheck,
  ShieldCheck,
  Trash2,
  UsersRound,
  TriangleAlert,
} from 'lucide-react';

interface OverviewViewProps {
  stats: WorkspaceStats | null;
  connectors: SourceConnector[];
  investigations: Investigation[];
  onStartInvestigation: () => void;
  onSelectInvestigation: (id: string) => void;
  onDeleteInvestigation: (id: string) => Promise<void>;
  onSelectConnectorDetails: (connector: SourceConnector) => void;
  isLoading: boolean;
  isReviewProcessing: boolean;
  onOpenCustomResolver?: () => void;
}

const formatDate = (value: string) => new Date(value).toLocaleString(undefined, {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

const reviewState = (investigation: Investigation, isReviewProcessing: boolean): { label: string; tone: BadgeTone } => {
  if (isReviewProcessing && investigation.assessmentReport?.reviewPolicyVersion !== 3) {
    return { label: 'AI verification running', tone: 'neutral' };
  }
  const humanReviews = getHumanReviewCount(investigation);
  if (investigation.assessmentReport?.reviewPolicyVersion !== 3) {
    return {
      label: humanReviews > 0 ? `${humanReviews} human review${humanReviews === 1 ? '' : 's'} · AI unavailable` : 'AI verification unavailable',
      tone: humanReviews > 0 ? 'caution' : 'neutral',
    };
  }
  if (humanReviews > 0) {
    return { label: `${humanReviews} human review${humanReviews === 1 ? '' : 's'}`, tone: 'caution' };
  }
  if (getAICheckedCount(investigation) > 0) return { label: 'AI web-verified', tone: 'verified' };
  if (investigation.findingsCount.materialRisk > 0) {
    return { label: `${investigation.findingsCount.materialRisk} material risk${investigation.findingsCount.materialRisk === 1 ? '' : 's'}`, tone: 'risk' };
  }
  if (investigation.coverageGaps?.length || investigation.status === 'PARTIAL_FAILURE') {
    return { label: 'Partial coverage', tone: 'caution' };
  }
  if (investigation.status === 'FAILED') return { label: 'Run incomplete', tone: 'risk' };
  if (investigation.status === 'CANCELLED') return { label: 'Run cancelled', tone: 'caution' };
  return { label: 'No review items', tone: 'verified' };
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  connectors,
  investigations,
  onStartInvestigation,
  onSelectInvestigation,
  onDeleteInvestigation,
  onSelectConnectorDetails,
  isLoading,
  onOpenCustomResolver,
  isReviewProcessing,
}) => {
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const deleteReport = async (investigation: Investigation) => {
    const prompt = `Delete ${investigation.targetName} from report history? This removes its saved report and duplicate runs for the same identifier.`;
    if (!window.confirm(prompt)) return;
    setDeleting(investigation.id);
    try { await onDeleteInvestigation(investigation.id); }
    catch (error) { window.alert(error instanceof Error ? error.message : 'Unable to delete this report.'); }
    finally { setDeleting(null); }
  };

  const recentInvestigations = [...investigations]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 6);

  return (
    <div className="flex min-h-full flex-col space-y-6 sm:space-y-7">
      <section className="flex flex-col gap-4 border-b border-[#E4E9EB] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#087F61]">Vendor intelligence workspace</p>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[#171C25] sm:text-[30px]">
            Vendor Due Diligence Overview
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#687385]">
            Evidence-backed registry verification, director tracing, and multi-source risk review.
          </p>
        </div>
        <Button variant="primary" size="md" icon={<Plus className="h-4 w-4" />} onClick={onStartInvestigation} className="shrink-0 shadow-[0_5px_14px_rgba(8,127,97,0.16)]">
          Investigate a vendor
        </Button>
      </section>

      <section className="relative isolate overflow-hidden rounded-2xl border border-white/80 bg-[linear-gradient(125deg,rgba(255,255,255,0.97),rgba(235,247,243,0.9))] p-4 shadow-[0_12px_35px_rgba(31,73,81,0.07)] backdrop-blur-xl sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full bg-emerald-100/45 blur-3xl" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-white/75 text-[#087F61] shadow-sm">
                <Layers3 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[#171C25] sm:text-base">Quick-start a due diligence run</h2>
                <p className="mt-1 text-xs leading-5 text-[#687385] sm:text-sm">
                  Start a live investigation from a company name or identifier.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-900">
              <ShieldCheck className="h-3.5 w-3.5 text-[#087F61]" /> Evidence-first review
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            <button
              type="button"
              onClick={onStartInvestigation}
              className="group flex min-h-[58px] items-center gap-3 rounded-xl border border-[#DDE6E8] bg-white/80 px-3.5 py-3 text-left text-sm font-semibold text-[#171C25] shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F5F0] text-[#087F61]"><SearchCheck className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">Start a live investigation<span className="block text-xs font-normal text-[#687385]">Enter the company details to verify</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#8490A0] transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={onOpenCustomResolver || onStartInvestigation}
              className="group flex min-h-[58px] items-center gap-3 rounded-xl border border-[#087F61] bg-[#087F61] px-3.5 py-3 text-left text-sm font-semibold text-white shadow-[0_7px_18px_rgba(8,127,97,0.18)] transition hover:-translate-y-0.5 hover:bg-[#066C53] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15"><Search className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">Custom vendor search & resolver<span className="block text-xs font-normal text-emerald-50/80">Search by legal name or identifier</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Workspace metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCounter label="Total investigations" value={stats?.totalInvestigations} subtext="Recorded in this workspace" icon={<FileText className="h-4 w-4" />} />
        <MetricCounter label="Tracked vendors" value={stats?.totalTrackedVendors} subtext="Corporate entities on record" icon={<Layers3 className="h-4 w-4" />} tone="verified" />
        <MetricCounter label="Human reviews needed" value={stats?.pendingReviews} subtext="Critical, conflicting, or AI-escalated items" icon={<UsersRound className="h-4 w-4" />} tone={stats?.pendingReviews ? 'caution' : 'default'} />
        <MetricCounter label="Material risk flags" value={stats?.highRiskFlags} subtext="Corroborated risk findings" icon={<TriangleAlert className="h-4 w-4" />} tone={stats?.highRiskFlags ? 'risk' : 'default'} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E4E9EB] bg-white shadow-[0_5px_20px_rgba(23,28,37,0.035)]">
        <div className="flex flex-col gap-3 border-b border-[#E4E9EB] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E7F5F0] text-[#087F61]"><FileText className="h-4 w-4" /></span>
            <div>
              <h2 className="text-sm font-semibold text-[#171C25] sm:text-base">Recent vendor investigations</h2>
              <p className="mt-0.5 text-xs text-[#687385]">Latest reports saved in this workspace</p>
            </div>
          </div>
          <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={onStartInvestigation}>New run</Button>
        </div>

        {isLoading ? (
          <div role="status" className="flex items-center gap-3 px-5 py-10 text-sm text-[#687385]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#D7DFE3] border-t-[#087F61]" /> Loading workspace records…
          </div>
        ) : recentInvestigations.length === 0 ? (
          <EmptyState
            icon={<SearchCheck className="h-5 w-5" />}
            title="No vendor investigations yet"
            description="Start with a legal name, CIN, GSTIN, PAN, or Director DIN. Reports and their sources will appear here."
            action={<Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={onStartInvestigation}>Investigate a vendor</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-[#F8FAFB]">
                <tr className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#687385]">
                  <th className="px-5 py-3">Vendor / entity</th>
                  <th className="px-4 py-3">Identity</th>
                  <th className="px-4 py-3">Sources</th>
                  <th className="px-4 py-3">Last run</th>
                  <th className="px-4 py-3">Review status</th>
                  <th className="w-24 px-4 py-3 text-right"><span className="sr-only">Report actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E9EB]">
                {recentInvestigations.map((investigation) => {
                  const review = reviewState(investigation, isReviewProcessing);
                  return (
                    <tr
                      key={investigation.id}
                      tabIndex={0}
                      onClick={() => onSelectInvestigation(investigation.id)}
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectInvestigation(investigation.id); } }}
                      className="group cursor-pointer transition-colors hover:bg-[#F8FAFB] focus-visible:bg-[#F8FAFB]"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E9EB] bg-[#F8FAFB] text-[#087F61]"><Building2 className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <div className="max-w-[280px] truncate text-xs font-semibold text-[#171C25]">{investigation.targetName}</div>
                            <div className="mt-0.5 text-[10px] text-[#8490A0]">Corporate entity · {investigation.status === 'COMPLETED' ? 'Report saved' : investigation.status === 'PARTIAL_FAILURE' ? 'Coverage gaps recorded' : investigation.status === 'FAILED' ? 'Run incomplete' : investigation.status === 'CANCELLED' ? 'Run cancelled' : investigation.status.replace(/_/g, ' ').toLowerCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="inline-flex max-w-[210px] truncate rounded-md border border-[#E4E9EB] bg-[#F8FAFB] px-2 py-1 font-mono text-[10px] text-[#526176]">{investigation.identifierType}: {investigation.identifierValue || 'Name only'}</span></td>
                      <td className="px-4 py-3.5 text-xs text-[#526176]">{investigation.sourcesChecked.length} sources</td>
                      <td className="px-4 py-3.5 text-xs tabular-nums text-[#687385]">{formatDate(investigation.completedAt || investigation.createdAt)}</td>
                      <td className="px-4 py-3.5"><Badge tone={review.tone} size="sm">{review.label}</Badge></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            aria-label={`Delete ${investigation.targetName} from report history`}
                            title="Delete report and duplicate runs"
                            disabled={deleting === investigation.id}
                            onClick={(event) => { event.stopPropagation(); void deleteReport(investigation); }}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ArrowRight className="h-4 w-4 text-[#8490A0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#087F61]" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex-1">
        <SourceHealthGrid connectors={connectors} onConfigureClick={onSelectConnectorDetails} />
      </div>
    </div>
  );
};
