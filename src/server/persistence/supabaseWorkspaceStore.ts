import type { Investigation } from '../../types/vendor.js';
import type { Vendor } from '../../types/domain.js';
import type { WorkspaceSnapshot } from '../../persistence/localStore.js';
import type { AutomatedMonitoringJob, MonitoringNotification } from '../../types/monitoringDiff.js';
import { removeSyntheticDemoData } from '../../utils/workspaceData.js';

const WORKSPACE_ID = process.env.SUPABASE_WORKSPACE_ID?.trim() || 'default_ws';

type MonitorJobRow = {
  monitor_id: string; company_name: string; identifier_type: string; identifier_value: string;
  baseline_report_id: string; frequency: AutomatedMonitoringJob['frequency']; enabled: boolean;
  last_checked_at: string | null; next_check_at: string; last_error: string | null;
  created_at: string; updated_at: string;
};

const monitorJobFromRow = (row: MonitorJobRow): AutomatedMonitoringJob => ({
  monitorId: row.monitor_id, companyName: row.company_name, identifierType: row.identifier_type,
  identifierValue: row.identifier_value, baselineReportId: row.baseline_report_id,
  frequency: row.frequency, enabled: row.enabled, lastCheckedAt: row.last_checked_at,
  nextCheckAt: row.next_check_at, lastError: row.last_error,
  createdAt: row.created_at, updatedAt: row.updated_at,
});

type MonitoringNotificationRow = {
  id: string; monitor_id: string; company_name: string; comparison_id: string;
  title: string; summary: string; changes: MonitoringNotification['changes'];
  created_at: string; read_at: string | null;
};

const notificationFromRow = (row: MonitoringNotificationRow): MonitoringNotification => ({
  id: row.id, monitorId: row.monitor_id, companyName: row.company_name,
  comparisonId: row.comparison_id, title: row.title, summary: row.summary,
  changes: row.changes || [], createdAt: row.created_at, readAt: row.read_at,
});

export class SupabaseWorkspaceStore {
  private readonly url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  private readonly secretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  private syntheticMonitoringCleanup: Promise<void> | null = null;

  public isConfigured(): boolean {
    return Boolean(this.url && this.secretKey);
  }

  public getStorageStatus() {
    return {
      mode: this.isConfigured() ? 'SUPABASE_POSTGRES' : 'SUPABASE_NOT_CONFIGURED',
      isDurable: this.isConfigured(),
      activeAdapterName: this.isConfigured() ? 'SupabaseWorkspaceSnapshotStore' : 'SupabaseNotConfigured',
      warning: this.isConfigured()
        ? undefined
        : 'Supabase persistence is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY to the server environment.',
    };
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    if (!this.isConfigured()) {
      throw new Error('Supabase storage is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY to the server environment.');
    }
    return fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.secretKey,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
  }

  public async loadSnapshot(): Promise<{ snapshot: WorkspaceSnapshot | null; revision: number | null; updatedAt: string | null }> {
    const query = new URLSearchParams({
      workspace_id: `eq.${WORKSPACE_ID}`,
      select: 'snapshot,snapshot_version,updated_at',
      limit: '1',
    });
    const response = await this.request(`tinytrace_workspace_snapshots?${query.toString()}`);
    if (!response.ok) throw new Error(await this.safeError(response, 'Supabase could not load the workspace.'));
    const rows = await response.json() as Array<{ snapshot?: WorkspaceSnapshot; snapshot_version?: number; updated_at?: string }>;
    const row = rows[0];
    if (row?.snapshot && !this.validateSnapshot(row.snapshot)) {
      throw new Error('The stored Supabase workspace snapshot is invalid. No data was changed.');
    }
    const cleanedSnapshot = row?.snapshot ? removeSyntheticDemoData(row.snapshot) : null;
    if (row?.snapshot && cleanedSnapshot && JSON.stringify(cleanedSnapshot) !== JSON.stringify(row.snapshot)) {
      await this.saveSnapshot(cleanedSnapshot);
    }
    return {
      snapshot: cleanedSnapshot,
      revision: row?.snapshot_version ?? null,
      updatedAt: row?.updated_at ?? null,
    };
  }

  public async saveSnapshot(snapshot: WorkspaceSnapshot): Promise<{ revision: number; updatedAt: string | null }> {
    snapshot = removeSyntheticDemoData(snapshot);
    const query = new URLSearchParams({ on_conflict: 'workspace_id', select: 'snapshot_version,updated_at' });
    const response = await this.request(`tinytrace_workspace_snapshots?${query.toString()}`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        workspace_id: WORKSPACE_ID,
        snapshot_version: 1,
        snapshot,
      }),
    });
    if (!response.ok) throw new Error(await this.safeError(response, 'Supabase could not save the workspace.'));
    const rows = await response.json() as Array<{ snapshot_version?: number; updated_at?: string }>;
    return { revision: rows[0]?.snapshot_version ?? 1, updatedAt: rows[0]?.updated_at ?? null };
  }

  public async clearSnapshot(): Promise<void> {
    const query = new URLSearchParams({ workspace_id: `eq.${WORKSPACE_ID}` });
    const response = await this.request(`tinytrace_workspace_snapshots?${query.toString()}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
    if (!response.ok) throw new Error(await this.safeError(response, 'Supabase could not clear the workspace.'));
    for (const table of ['tinytrace_monitor_jobs', 'tinytrace_monitor_notifications']) {
      const childQuery = new URLSearchParams({ workspace_id: `eq.${WORKSPACE_ID}` });
      const childResponse = await this.request(`${table}?${childQuery}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
      if (!childResponse.ok) throw new Error(await this.safeError(childResponse, `Supabase could not clear ${table}.`));
    }
  }

  public async listMonitorJobs(): Promise<AutomatedMonitoringJob[]> {
    await this.removeSyntheticMonitoringRows();
    const query = new URLSearchParams({ workspace_id: `eq.${WORKSPACE_ID}`, select: '*', order: 'created_at.desc' });
    const response = await this.request(`tinytrace_monitor_jobs?${query}`);
    if (!response.ok) throw new Error(await this.safeError(response, 'Could not load automated monitors.'));
    return (await response.json() as MonitorJobRow[]).map(monitorJobFromRow);
  }

  public async listDueMonitorJobs(now: Date): Promise<AutomatedMonitoringJob[]> {
    const query = new URLSearchParams({
      workspace_id: `eq.${WORKSPACE_ID}`, enabled: 'eq.true', next_check_at: `lte.${now.toISOString()}`,
      select: '*', order: 'next_check_at.asc', limit: '20',
    });
    const response = await this.request(`tinytrace_monitor_jobs?${query}`);
    if (!response.ok) throw new Error(await this.safeError(response, 'Could not load due monitoring jobs.'));
    return (await response.json() as MonitorJobRow[]).map(monitorJobFromRow);
  }

  public async saveMonitorJob(job: AutomatedMonitoringJob): Promise<AutomatedMonitoringJob> {
    const query = new URLSearchParams({ on_conflict: 'monitor_id', select: '*' });
    const response = await this.request(`tinytrace_monitor_jobs?${query}`, {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        monitor_id: job.monitorId, workspace_id: WORKSPACE_ID, company_name: job.companyName,
        identifier_type: job.identifierType, identifier_value: job.identifierValue,
        baseline_report_id: job.baselineReportId, frequency: job.frequency, enabled: job.enabled,
        last_checked_at: job.lastCheckedAt, next_check_at: job.nextCheckAt, last_error: job.lastError,
      }),
    });
    if (!response.ok) throw new Error(await this.safeError(response, 'Could not save automated monitor.'));
    const rows = await response.json() as MonitorJobRow[];
    if (!rows[0]) throw new Error('Supabase did not return the saved automated monitor.');
    return monitorJobFromRow(rows[0]);
  }

  public async updateMonitorJob(monitorId: string, patch: Partial<Pick<AutomatedMonitoringJob, 'enabled' | 'baselineReportId' | 'lastCheckedAt' | 'nextCheckAt' | 'lastError'>>): Promise<void> {
    const query = new URLSearchParams({ monitor_id: `eq.${monitorId}`, workspace_id: `eq.${WORKSPACE_ID}` });
    const body: Record<string, unknown> = {};
    if (patch.enabled !== undefined) body.enabled = patch.enabled;
    if (patch.baselineReportId !== undefined) body.baseline_report_id = patch.baselineReportId;
    if (patch.lastCheckedAt !== undefined) body.last_checked_at = patch.lastCheckedAt;
    if (patch.nextCheckAt !== undefined) body.next_check_at = patch.nextCheckAt;
    if (patch.lastError !== undefined) body.last_error = patch.lastError;
    const response = await this.request(`tinytrace_monitor_jobs?${query}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await this.safeError(response, 'Could not update automated monitor.'));
  }

  public async deleteMonitorJob(monitorId: string): Promise<void> {
    const query = new URLSearchParams({ monitor_id: `eq.${monitorId}`, workspace_id: `eq.${WORKSPACE_ID}` });
    const response = await this.request(`tinytrace_monitor_jobs?${query}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    if (!response.ok) throw new Error(await this.safeError(response, 'Could not delete automated monitor.'));
  }

  public async listMonitoringNotifications(unreadOnly = false): Promise<MonitoringNotification[]> {
    await this.removeSyntheticMonitoringRows();
    const filters: Record<string, string> = { workspace_id: `eq.${WORKSPACE_ID}`, select: '*', order: 'created_at.desc', limit: '100' };
    if (unreadOnly) filters.read_at = 'is.null';
    const response = await this.request(`tinytrace_monitor_notifications?${new URLSearchParams(filters)}`);
    if (!response.ok) throw new Error(await this.safeError(response, 'Could not load monitoring notifications.'));
    return (await response.json() as MonitoringNotificationRow[]).map(notificationFromRow);
  }

  public async saveMonitoringNotification(notification: MonitoringNotification): Promise<void> {
    const response = await this.request('tinytrace_monitor_notifications?on_conflict=id', {
      method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({
        id: notification.id, workspace_id: WORKSPACE_ID, monitor_id: notification.monitorId,
        company_name: notification.companyName, comparison_id: notification.comparisonId,
        title: notification.title, summary: notification.summary, changes: notification.changes,
        created_at: notification.createdAt, read_at: notification.readAt,
      }),
    });
    if (!response.ok) throw new Error(await this.safeError(response, 'Could not save monitoring notification.'));
  }

  public async markMonitoringNotificationRead(id: string): Promise<void> {
    const query = new URLSearchParams({ id: `eq.${id}`, workspace_id: `eq.${WORKSPACE_ID}` });
    const response = await this.request(`tinytrace_monitor_notifications?${query}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ read_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(await this.safeError(response, 'Could not mark notification as read.'));
  }

  public async checkConnection(): Promise<{ success: boolean; assertionsPassed: number; assertionsFailed: number; details: string[] }> {
    try {
      await this.loadSnapshot();
      await Promise.all([
        this.request(`tinytrace_monitor_jobs?${new URLSearchParams({ select: 'monitor_id', limit: '1' })}`),
        this.request(`tinytrace_monitor_notifications?${new URLSearchParams({ select: 'id', limit: '1' })}`),
      ]).then(async (responses) => {
        for (const response of responses) {
          if (!response.ok) throw new Error(await this.safeError(response, 'A monitoring table is unavailable.'));
        }
      });
      return { success: true, assertionsPassed: 3, assertionsFailed: 0, details: [
        '[PASS] Supabase workspace snapshot table is reachable.',
        '[PASS] Automated monitoring schedule table is reachable.',
        '[PASS] Monitoring notification table is reachable.',
      ] };
    } catch (error) {
      return {
        success: false,
        assertionsPassed: 0,
        assertionsFailed: 1,
        details: [`[FAIL] ${error instanceof Error ? error.message : 'Supabase connection failed.'}`],
      };
    }
  }

  public validateSnapshot(value: unknown): value is WorkspaceSnapshot {
    if (!value || typeof value !== 'object') return false;
    const snapshot = value as Partial<WorkspaceSnapshot>;
    return Array.isArray(snapshot.investigations)
      && snapshot.investigations.every((item) => Boolean(item && typeof item.id === 'string' && typeof item.targetName === 'string'))
      && Array.isArray(snapshot.vendors)
      && Array.isArray(snapshot.comparisons)
      && Boolean(snapshot.monitoringConfigs && typeof snapshot.monitoringConfigs === 'object' && !Array.isArray(snapshot.monitoringConfigs))
      && Boolean(snapshot.preferences && typeof snapshot.preferences === 'object' && !Array.isArray(snapshot.preferences))
      && Array.isArray(snapshot.searchHistory);
  }

  public hydrateServerCache(snapshot: WorkspaceSnapshot, restore: (investigations: Investigation[], vendors: Vendor[]) => void): void {
    restore(snapshot.investigations, snapshot.vendors);
  }

  private async safeError(response: Response, fallback: string): Promise<string> {
    try {
      const body = await response.json() as { message?: string; hint?: string; code?: string };
      const detail = [body.message, body.hint].filter(Boolean).join(' ');
      return detail ? `${fallback} ${detail}` : `${fallback} (HTTP ${response.status}${body.code ? `, ${body.code}` : ''}).`;
    } catch {
      return `${fallback} (HTTP ${response.status}).`;
    }
  }

  private async removeSyntheticMonitoringRows(): Promise<void> {
    if (!this.syntheticMonitoringCleanup) {
      this.syntheticMonitoringCleanup = (async () => {
        const cleanupTargets = [
          {
            table: 'tinytrace_monitor_notifications',
            or: '(company_name.ilike.*Acme Horizon Technologies*,company_name.ilike.*synthetic demo*,monitor_id.like.mon_demo_*)',
          },
          {
            table: 'tinytrace_monitor_jobs',
            or: '(company_name.ilike.*Acme Horizon Technologies*,company_name.ilike.*synthetic demo*,monitor_id.like.mon_demo_*,baseline_report_id.like.inv_demo_run_*)',
          },
        ];
        for (const target of cleanupTargets) {
          const filters = new URLSearchParams({ workspace_id: `eq.${WORKSPACE_ID}`, or: target.or });
          const response = await this.request(`${target.table}?${filters.toString()}`, {
            method: 'DELETE', headers: { Prefer: 'return=minimal' },
          });
          if (!response.ok) throw new Error(await this.safeError(response, `Supabase could not remove obsolete synthetic ${target.table}.`));
        }
      })().catch((error) => {
        this.syntheticMonitoringCleanup = null;
        throw error;
      });
    }
    await this.syntheticMonitoringCleanup;
  }
}

export const supabaseWorkspaceStore = new SupabaseWorkspaceStore();
