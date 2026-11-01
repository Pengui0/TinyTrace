import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/apiFetch.js';
import type { Investigation } from '../../types/vendor.js';
import type { AutomatedMonitoringFrequency, AutomatedMonitoringJob } from '../../types/monitoringDiff.js';
import { Badge } from '../common/Badge.js';
import { BellRing, CalendarClock, CirclePause, CirclePlay, LoaderCircle, Plus, RefreshCw, Trash2 } from 'lucide-react';

interface AutomatedMonitoringViewProps {
  investigations: Investigation[];
  initialReportId?: string | null;
}

const frequencies: Array<{ value: AutomatedMonitoringFrequency; label: string }> = [
  { value: 'DAILY', label: 'Every day' },
  { value: 'WEEKLY', label: 'Every week' },
  { value: 'MONTHLY', label: 'Every month' },
];

const formatDate = (value: string | null) => value
  ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not checked yet';

export const AutomatedMonitoringView: React.FC<AutomatedMonitoringViewProps> = ({ investigations, initialReportId }) => {
  const liveReports = useMemo(() => investigations.filter((item) => item.status === 'COMPLETED'), [investigations]);
  const [selectedReportId, setSelectedReportId] = useState(initialReportId || liveReports[0]?.id || '');
  const [frequency, setFrequency] = useState<AutomatedMonitoringFrequency>('WEEKLY');
  const [jobs, setJobs] = useState<AutomatedMonitoringJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialReportId && liveReports.some((report) => report.id === initialReportId)) setSelectedReportId(initialReportId);
  }, [initialReportId, liveReports]);

  const refreshJobs = useCallback(async () => {
    try {
      const response = await apiFetch('/api/monitoring/jobs');
      const data = await response.json().catch(() => ({})) as { jobs?: AutomatedMonitoringJob[]; error?: string };
      if (!response.ok) throw new Error(data.error || `Could not load monitors (HTTP ${response.status}).`);
      setJobs(data.jobs || []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load automated monitors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshJobs();
    const timer = window.setInterval(() => void refreshJobs(), 30_000);
    return () => window.clearInterval(timer);
  }, [refreshJobs]);

  const createMonitor = async () => {
    if (!selectedReportId) return;
    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch('/api/monitoring/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: selectedReportId, frequency }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || `Could not schedule monitoring (HTTP ${response.status}).`);
      await refreshJobs();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not schedule monitoring.');
    } finally {
      setSaving(false);
    }
  };

  const toggleMonitor = async (job: AutomatedMonitoringJob) => {
    setSaving(true);
    try {
      const response = await apiFetch(`/api/monitoring/jobs/${encodeURIComponent(job.monitorId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !job.enabled }),
      });
      if (!response.ok) throw new Error('Could not update this monitor.');
      await refreshJobs();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this monitor.');
    } finally {
      setSaving(false);
    }
  };

  const removeMonitor = async (job: AutomatedMonitoringJob) => {
    setSaving(true);
    try {
      const response = await apiFetch(`/api/monitoring/jobs/${encodeURIComponent(job.monitorId)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not remove this monitor.');
      await refreshJobs();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove this monitor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[#E4E9EB] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#087F61]">Background monitoring</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-[#1C1F26]">Automated monitoring</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#687385]">Schedule repeated live checks for saved company reports. Reports and comparisons stay in Compare reports; this screen manages schedules.</p>
        </div>
        <button type="button" onClick={() => void refreshJobs()} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#D7DFE3] bg-white px-3 text-xs font-semibold text-[#526176] hover:bg-[#F8FAFB]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </header>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
        <div className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4" /> Checks run in the TinyTrace server</div>
        <p className="mt-1 leading-relaxed text-emerald-900">The server checks due schedules every minute and continues while you are away, as long as the host keeps one TinyTrace instance running. Each scheduled live check uses your configured investigation providers and may consume their API credits.</p>
      </div>

      <section className="rounded-xl border border-[#E4E9EB] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-[#1C1F26]">Add a company monitor</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_190px_auto] lg:items-end">
          <label className="block min-w-0 text-[11px] font-semibold text-[#526176]">Completed live report
            <select value={selectedReportId} onChange={(event) => setSelectedReportId(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-[#D7DFE3] bg-white px-3 text-sm text-[#1C1F26]" disabled={liveReports.length === 0}>
              {liveReports.length === 0 && <option value="">No completed live reports available</option>}
              {liveReports.map((report) => <option key={report.id} value={report.id}>{report.targetName} · {report.identifierValue || 'Name only'} · {new Date(report.createdAt).toLocaleDateString()}</option>)}
            </select>
          </label>
          <label className="block text-[11px] font-semibold text-[#526176]">Check frequency
            <select value={frequency} onChange={(event) => setFrequency(event.target.value as AutomatedMonitoringFrequency)} className="mt-1 block min-h-10 w-full rounded-lg border border-[#D7DFE3] bg-white px-3 text-sm text-[#1C1F26]">
              {frequencies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => void createMonitor()} disabled={saving || !selectedReportId} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#087F61] px-4 text-xs font-semibold text-white hover:bg-[#066C53] disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" /> {saving ? 'Saving…' : 'Start automated checks'}</button>
        </div>
        {liveReports.length === 0 && <p className="mt-2 text-[11px] text-amber-800">Run and save a live investigation before setting up its monitor.</p>}
      </section>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}

      <section className="overflow-hidden rounded-xl border border-[#E4E9EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#E4E9EB] bg-[#F8FAFB] px-4 py-3"><h2 className="text-sm font-semibold text-[#1C1F26]">Company monitors</h2><Badge tone="neutral">{jobs.filter((job) => job.enabled).length} active</Badge></div>
        {loading ? <div className="flex items-center gap-2 p-5 text-xs text-[#687385]"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading saved monitors…</div>
          : jobs.length === 0 ? <div className="p-6 text-center text-xs text-[#687385]">No automated monitors yet. Add a completed live report above.</div>
            : <div className="divide-y divide-[#E4E9EB]">{jobs.map((job) => (
              <article key={job.monitorId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[#1C1F26]">{job.companyName}</h3><Badge tone={job.enabled ? 'verified' : 'neutral'}>{job.enabled ? 'Active' : 'Paused'}</Badge><span className="rounded bg-[#F1F5F6] px-2 py-0.5 text-[10px] font-medium text-[#526176]">{frequencies.find((item) => item.value === job.frequency)?.label}</span></div>
                  <p className="mt-1 text-[11px] text-[#687385]">Last checked: {formatDate(job.lastCheckedAt)} · Next check: {job.enabled ? formatDate(job.nextCheckAt) : 'Paused'}</p>
                  {job.lastError && <p className="mt-1 text-[11px] text-rose-700">Last run issue: {job.lastError}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" disabled={saving} onClick={() => void toggleMonitor(job)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#D7DFE3] px-3 text-xs font-semibold text-[#526176] hover:bg-[#F8FAFB] disabled:opacity-50">{job.enabled ? <CirclePause className="h-3.5 w-3.5" /> : <CirclePlay className="h-3.5 w-3.5" />}{job.enabled ? 'Pause' : 'Resume'}</button>
                  <button type="button" disabled={saving} onClick={() => void removeMonitor(job)} aria-label={`Remove monitoring for ${job.companyName}`} className="inline-flex min-h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </article>
            ))}
        </div>}
      </section>
      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[#687385]"><BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#087F61]" />Only new or changed findings create notifications. A finding missing from a later search is not treated as cleared.</p>
    </div>
  );
};
