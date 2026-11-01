import type { MonitoringNotification } from '../../types/monitoringDiff.js';
import type { WorkspaceSnapshot } from '../../persistence/localStore.js';
import { supabaseWorkspaceStore } from '../persistence/supabaseWorkspaceStore.js';
import { store } from '../storage/store.js';
import { getNextMonitoringCheck } from '../../utils/monitoringSchedule.js';
import { configuredDefaultWorkspaceId, internalSchedulerToken, runWithWorkspace } from '../persistence/workspaceContext.js';

export class MonitoringScheduler {
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  public start(port: number): void {
    if (this.timer) return;
    const poll = () => void this.runDueChecks(port);
    this.timer = setInterval(poll, 60_000);
    poll();
    console.log('[TinyTrace Monitoring] Background scheduler started (60-second due-job polling).');
  }

  private async runDueChecks(port: number): Promise<void> {
    if (this.running || !supabaseWorkspaceStore.isConfigured()) return;
    this.running = true;
    try {
      const dueJobs = await supabaseWorkspaceStore.listDueMonitorJobs(new Date());
      for (const job of dueJobs) {
        await this.runJob(port, job);
      }
    } catch (error) {
      console.error('[TinyTrace Monitoring] Could not poll due monitor jobs:', error instanceof Error ? error.message : error);
    } finally {
      this.running = false;
    }
  }

  private runJob(port: number, job: Awaited<ReturnType<typeof supabaseWorkspaceStore.listMonitorJobs>>[number]): Promise<void> {
    return runWithWorkspace(job.workspaceId || configuredDefaultWorkspaceId, () => this.executeJob(port, job));
  }

  private async executeJob(port: number, job: Awaited<ReturnType<typeof supabaseWorkspaceStore.listMonitorJobs>>[number]): Promise<void> {
    try {
      const stored = await supabaseWorkspaceStore.loadSnapshot();
      const snapshot = stored.snapshot;
      if (!snapshot) throw new Error('Workspace snapshot is unavailable.');
      const baseline = snapshot.investigations.find((report) => report.id === job.baselineReportId);
      if (!baseline) throw new Error('The saved baseline report no longer exists. Select a report again to restart this monitor.');
      if (baseline.executionMode === 'DEMO') throw new Error('Automated monitoring only runs on live investigation reports.');

      supabaseWorkspaceStore.hydrateServerCache(snapshot, (investigations, vendors) => store.hydrateWorkspace(investigations, vendors));
      const response = await fetch(`http://127.0.0.1:${port}/api/investigations/${encodeURIComponent(baseline.id)}/rerun`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tinytrace-scheduler-token': internalSchedulerToken,
          'x-tinytrace-workspace-id': job.workspaceId || configuredDefaultWorkspaceId,
        },
        body: JSON.stringify({ useMock: false, freshRun: true }),
        signal: AbortSignal.timeout(180_000),
      });
      const result = await response.json().catch(() => ({})) as {
        error?: string;
        investigation?: WorkspaceSnapshot['investigations'][number];
        comparison?: WorkspaceSnapshot['comparisons'][number];
      };
      if (!response.ok || !result.investigation || !result.comparison) {
        throw new Error(result.error || `Automated investigation failed (HTTP ${response.status}).`);
      }
      if (result.investigation.status !== 'COMPLETED') {
        throw new Error('The automated run did not complete, so its result was not used to advance the monitoring baseline.');
      }

      // Reruns take time. Merge against the latest database copy so edits made while
      // providers were working (for example, workspace preferences) are not overwritten.
      const latestStored = await supabaseWorkspaceStore.loadSnapshot();
      const latestSnapshot = latestStored.snapshot || snapshot;
      const updatedSnapshot: WorkspaceSnapshot = {
        ...latestSnapshot,
        investigations: [result.investigation, ...latestSnapshot.investigations.filter((item) => item.id !== result.investigation!.id)],
        comparisons: [result.comparison, ...latestSnapshot.comparisons.filter((item) => item.comparisonId !== result.comparison!.comparisonId)],
      };
      await supabaseWorkspaceStore.saveSnapshot(updatedSnapshot);

      const completedAt = new Date().toISOString();
      await supabaseWorkspaceStore.updateMonitorJob(job.monitorId, {
        baselineReportId: result.investigation.id,
        lastCheckedAt: completedAt,
        nextCheckAt: getNextMonitoringCheck(job.frequency, new Date(completedAt)).toISOString(),
        lastError: null,
      });

      // A disappearance in search results is not evidence of resolution. Notify only on new or changed findings.
      const changes = [...result.comparison.newSignals, ...result.comparison.changedSignals];
      if (changes.length > 0) {
        const notification: MonitoringNotification = {
          id: `ntf_${result.comparison.comparisonId}`,
          monitorId: job.monitorId,
          companyName: job.companyName,
          comparisonId: result.comparison.comparisonId,
          title: `${changes.length} new or changed finding${changes.length === 1 ? '' : 's'}`,
          summary: `${result.comparison.newSignals.length} new finding(s) and ${result.comparison.changedSignals.length} changed finding(s) detected. Findings missing from a later search are not treated as cleared.`,
          changes,
          createdAt: completedAt,
          readAt: null,
        };
        await supabaseWorkspaceStore.saveMonitoringNotification(notification);
      }
      console.log(`[TinyTrace Monitoring] Completed scheduled check for ${job.companyName}; ${changes.length} new/changed findings.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Automated monitoring run failed.';
      await supabaseWorkspaceStore.updateMonitorJob(job.monitorId, {
        lastError: message,
        nextCheckAt: getNextMonitoringCheck(job.frequency).toISOString(),
      }).catch((saveError) => {
        console.error('[TinyTrace Monitoring] Could not persist monitor error:', saveError);
      });
      console.error(`[TinyTrace Monitoring] Scheduled check failed for ${job.companyName}: ${message}`);
    }
  }
}

export const monitoringScheduler = new MonitoringScheduler();
