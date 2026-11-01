import type { AutomatedMonitoringFrequency } from '../types/monitoringDiff.js';

export function getNextMonitoringCheck(frequency: AutomatedMonitoringFrequency, from = new Date()): Date {
  const next = new Date(from);
  if (frequency === 'DAILY') {
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }
  if (frequency === 'WEEKLY') {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }

  const dayOfMonth = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDayOfMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
  return next;
}
