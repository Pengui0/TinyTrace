import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../api/apiFetch.js';
import type { MonitoringNotification } from '../../types/monitoringDiff.js';
import { Bell, Check, ExternalLink, RefreshCw } from 'lucide-react';

interface MonitoringNotificationsViewProps {
  onUnreadCountChange: (count: number) => void;
  onOpenComparison?: (comparisonId: string) => void;
}

const formatDate = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export const MonitoringNotificationsView: React.FC<MonitoringNotificationsViewProps> = ({ onUnreadCountChange, onOpenComparison }) => {
  const [notifications, setNotifications] = useState<MonitoringNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await apiFetch('/api/monitoring/notifications');
      const data = await response.json().catch(() => ({})) as { notifications?: MonitoringNotification[]; error?: string };
      if (!response.ok) throw new Error(data.error || `Could not load notifications (HTTP ${response.status}).`);
      const items = data.notifications || [];
      setNotifications(items);
      onUnreadCountChange(items.filter((item) => !item.readAt).length);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load monitoring notifications.');
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const markRead = async (item: MonitoringNotification) => {
    try {
      const response = await apiFetch(`/api/monitoring/notifications/${encodeURIComponent(item.id)}/read`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Could not update this notification.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this notification.');
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[#E4E9EB] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#087F61]">Monitoring inbox</p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-[#1C1F26]"><Bell className="h-5 w-5 text-[#087F61]" />Notifications</h1>
          <p className="mt-1 text-xs text-[#687385]">Only new or changed findings from automated company checks appear here.</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#D7DFE3] bg-white px-3 text-xs font-semibold text-[#526176] hover:bg-[#F8FAFB]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
      {loading ? <div className="rounded-xl border border-[#E4E9EB] bg-white p-6 text-sm text-[#687385]">Loading notifications…</div>
        : notifications.length === 0 ? <div className="rounded-xl border border-[#E4E9EB] bg-white p-10 text-center"><Bell className="mx-auto h-6 w-6 text-[#8490A0]" /><h2 className="mt-3 text-sm font-semibold text-[#1C1F26]">You’re all caught up</h2><p className="mt-1 text-xs text-[#687385]">New or changed findings from scheduled checks will appear here.</p></div>
          : <div className="space-y-3">{notifications.map((item) => (
            <article key={item.id} className={`rounded-xl border bg-white p-4 shadow-sm ${item.readAt ? 'border-[#E4E9EB]' : 'border-emerald-200 ring-1 ring-emerald-100'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-[#1C1F26]">{item.companyName}</h2>{!item.readAt && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">New</span>}</div>
                  <p className="mt-1 text-xs font-medium text-emerald-800">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#687385]">{item.summary}</p>
                  <p className="mt-2 text-[10px] text-[#8490A0]">Detected {formatDate(item.createdAt)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {onOpenComparison && <button type="button" onClick={() => onOpenComparison(item.comparisonId)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[#D7DFE3] px-2.5 text-[11px] font-semibold text-[#526176] hover:bg-[#F8FAFB]">Open delta <ExternalLink className="h-3 w-3" /></button>}
                  {!item.readAt && <button type="button" onClick={() => void markRead(item)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[#E7F5F0] px-2.5 text-[11px] font-semibold text-[#075842] hover:bg-emerald-100"><Check className="h-3 w-3" /> Mark read</button>}
                </div>
              </div>
              <ul className="mt-3 divide-y divide-[#E4E9EB] rounded-lg border border-[#E4E9EB] bg-[#F8FAFB]">
                {item.changes.map((change) => <li key={change.id} className="px-3 py-2 text-[11px] text-[#526176]"><span className="font-semibold text-[#1C1F26]">{change.diffType === 'NEW' ? 'New' : 'Changed'} · {change.title}</span><span className="ml-2 text-[#687385]">{change.explanation}</span></li>)}
              </ul>
            </article>
          ))}</div>}
    </div>
  );
};
