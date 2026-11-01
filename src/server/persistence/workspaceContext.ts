import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

const workspaceContext = new AsyncLocalStorage<string>();
export const configuredDefaultWorkspaceId = process.env.SUPABASE_WORKSPACE_ID?.trim() || 'default_ws';
export const internalSchedulerToken = randomBytes(32).toString('hex');

export function getCurrentWorkspaceId(): string {
  return workspaceContext.getStore() || configuredDefaultWorkspaceId;
}

export function runWithWorkspace<T>(workspaceId: string, callback: () => T): T {
  return workspaceContext.run(workspaceId, callback);
}
