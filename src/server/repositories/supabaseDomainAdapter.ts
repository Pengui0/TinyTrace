import type {
  Evidence, Investigation, PaginationParams, PaginatedResult, Relationship, RunComparison, Signal, Vendor,
} from '../../types/domain.js';
import type { IUnitOfWork } from './interfaces.js';
import {
  validateEvidence, validateInvestigation, validateRelationship, validateRunComparison,
  validateSignal, validateVendor,
} from '../validation/domainValidators.js';
import { getCurrentWorkspaceId } from '../persistence/workspaceContext.js';

type RecordType = 'vendor' | 'investigation' | 'signal' | 'evidence' | 'relationship' | 'comparison';
type Row<T> = { record_id: string; payload: T };

class SupabaseDomainRecords {
  private readonly url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  private readonly key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  isConfigured() { return Boolean(this.url && this.key); }

  async request(path: string, init: RequestInit = {}) {
    if (!this.isConfigured()) throw new Error('Supabase domain storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
    const response = await fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: this.key, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { message?: string; hint?: string };
      throw new Error([detail.message, detail.hint].filter(Boolean).join(' ') || `Supabase domain storage failed (HTTP ${response.status}).`);
    }
    return response;
  }

  private filters(type: RecordType, extra: Record<string, string> = {}) {
    return new URLSearchParams({ workspace_id: `eq.${getCurrentWorkspaceId()}`, record_type: `eq.${type}`, ...extra });
  }

  async get<T>(type: RecordType, id: string): Promise<T | null> {
    const query = this.filters(type, { record_id: `eq.${id}`, select: 'payload', limit: '1' });
    const response = await this.request(`tinytrace_domain_records?${query}`);
    const rows = await response.json() as Array<{ payload: T }>;
    return rows[0]?.payload ?? null;
  }

  async list<T>(type: RecordType): Promise<T[]> {
    const query = this.filters(type, { select: 'payload', order: 'created_at.desc' });
    const response = await this.request(`tinytrace_domain_records?${query}`);
    return (await response.json() as Array<{ payload: T }>).map((row) => row.payload);
  }

  async save<T extends { id: string }>(type: RecordType, value: T): Promise<T> {
    const query = new URLSearchParams({ on_conflict: 'workspace_id,record_type,record_id', select: 'record_id' });
    await this.request(`tinytrace_domain_records?${query}`, {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ workspace_id: getCurrentWorkspaceId(), record_type: type, record_id: value.id, payload: value }),
    });
    return value;
  }

  async delete(type: RecordType, id: string): Promise<boolean> {
    const response = await this.request(`tinytrace_domain_records?${this.filters(type, { record_id: `eq.${id}`, select: 'record_id' })}`, {
      method: 'DELETE', headers: { Prefer: 'return=representation' },
    });
    return (await response.json() as unknown[]).length > 0;
  }

  async count(type: RecordType): Promise<number> { return (await this.list(type)).length; }
  async clear(): Promise<void> {
    await this.request(`tinytrace_domain_records?${this.filters('vendor')}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    for (const type of ['investigation', 'signal', 'evidence', 'relationship', 'comparison'] as const) {
      await this.request(`tinytrace_domain_records?${this.filters(type)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    }
  }
  async checkConnection(): Promise<{ success: boolean; details: string[] }> {
    try {
      const query = new URLSearchParams({ select: 'record_id', limit: '1' });
      await this.request(`tinytrace_domain_records?${query}`);
      return { success: true, details: ['[PASS] Supabase domain repository table is reachable.'] };
    } catch (error) {
      return { success: false, details: [`[FAIL] ${error instanceof Error ? error.message : 'Supabase domain repository check failed.'}`] };
    }
  }
}

function paginate<T>(items: T[], params?: PaginationParams): PaginatedResult<T> {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));
  const offset = params?.offset ?? (page - 1) * limit;
  return { items: items.slice(offset, offset + limit), total: items.length, page, limit, hasMore: offset + limit < items.length };
}

export class SupabaseDomainUnitOfWork implements IUnitOfWork {
  private readonly records = new SupabaseDomainRecords();
  public readonly vendors = {
    findById: (id: string) => this.records.get<Vendor>('vendor', id),
    findByCIN: async (cin: string) => (await this.records.list<Vendor>('vendor')).find((item) => item.cin?.toUpperCase() === cin.trim().toUpperCase()) || null,
    findByGSTIN: async (gstin: string) => (await this.records.list<Vendor>('vendor')).find((item) => item.gstins.some((value) => value.toUpperCase() === gstin.trim().toUpperCase())) || null,
    findOrCreateByInput: async (params: { canonicalName: string; cin?: string | null; gstin?: string | null; pan?: string | null; sourceReference: string }) => {
      const vendors = await this.records.list<Vendor>('vendor');
      let vendor = vendors.find((item) => Boolean(params.cin && item.cin?.toUpperCase() === params.cin.toUpperCase()) || Boolean(params.gstin && item.gstins.some((v) => v.toUpperCase() === params.gstin?.toUpperCase())) || item.canonicalName.toLowerCase() === params.canonicalName.trim().toLowerCase());
      if (vendor) {
        vendor = { ...vendor, inputNames: vendor.inputNames.includes(params.canonicalName) ? vendor.inputNames : [...vendor.inputNames, params.canonicalName], cin: vendor.cin || params.cin || null, gstins: params.gstin && !vendor.gstins.includes(params.gstin) ? [...vendor.gstins, params.gstin] : vendor.gstins, lastCheckedAt: new Date().toISOString() };
        return this.records.save('vendor', validateVendor(vendor));
      }
      return this.records.save('vendor', validateVendor({ canonicalName: params.canonicalName, inputNames: [params.canonicalName], cin: params.cin || null, gstins: params.gstin ? [params.gstin] : [], pan: params.pan || null, sourceReference: params.sourceReference }));
    },
    search: async (query?: string, pagination?: PaginationParams) => {
      const term = query?.trim().toLowerCase();
      const items = await this.records.list<Vendor>('vendor');
      return paginate(term ? items.filter((item) => item.canonicalName.toLowerCase().includes(term) || item.cin?.toLowerCase().includes(term) || item.gstins.some((value) => value.toLowerCase().includes(term)) || item.inputNames.some((value) => value.toLowerCase().includes(term)) ) : items, pagination);
    },
    save: (value: Vendor) => this.records.save('vendor', validateVendor(value)),
    update: async (id: string, updates: Partial<Vendor>) => { const value = await this.records.get<Vendor>('vendor', id); if (!value) throw new Error(`Vendor not found with ID: ${id}`); return this.records.save('vendor', validateVendor({ ...value, ...updates, id })); },
    delete: (id: string) => this.records.delete('vendor', id), count: () => this.records.count('vendor'),
  };
  public readonly investigations = {
    findById: (id: string) => this.records.get<Investigation>('investigation', id),
    findByVendorId: async (vendorId: string, pagination?: PaginationParams) => paginate((await this.records.list<Investigation>('investigation')).filter((item) => item.vendorId === vendorId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)), pagination),
    findLatestByVendorId: async (vendorId: string) => (await this.records.list<Investigation>('investigation')).filter((item) => item.vendorId === vendorId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] || null,
    listRecent: async (pagination?: PaginationParams) => paginate((await this.records.list<Investigation>('investigation')).sort((a, b) => b.startedAt.localeCompare(a.startedAt)), pagination),
    save: (value: Investigation) => this.records.save('investigation', validateInvestigation(value)),
    update: async (id: string, updates: Partial<Investigation>) => { const value = await this.records.get<Investigation>('investigation', id); if (!value) throw new Error(`Investigation not found with ID: ${id}`); return this.records.save('investigation', validateInvestigation({ ...value, ...updates, id })); },
    delete: (id: string) => this.records.delete('investigation', id), count: () => this.records.count('investigation'),
  };
  public readonly signals = {
    findById: (id: string) => this.records.get<Signal>('signal', id),
    findByInvestigationId: async (id: string) => (await this.records.list<Signal>('signal')).filter((item) => item.investigationId === id),
    findByVendorId: async (id: string) => (await this.records.list<Signal>('signal')).filter((item) => item.vendorId === id),
    save: (value: Signal) => this.records.save('signal', validateSignal(value)),
    saveBatch: async (values: Signal[]) => Promise.all(values.map((value) => this.records.save('signal', validateSignal(value)))),
    update: async (id: string, updates: Partial<Signal>) => { const value = await this.records.get<Signal>('signal', id); if (!value) throw new Error(`Signal not found with ID: ${id}`); return this.records.save('signal', validateSignal({ ...value, ...updates, id })); },
    delete: (id: string) => this.records.delete('signal', id), count: () => this.records.count('signal'),
  };
  public readonly evidence = {
    findById: (id: string) => this.records.get<Evidence>('evidence', id),
    findByIds: async (ids: string[]) => { const wanted = new Set(ids); return (await this.records.list<Evidence>('evidence')).filter((item) => wanted.has(item.id)); },
    save: (value: Evidence) => this.records.save('evidence', validateEvidence(value)),
    saveBatch: async (values: Evidence[]) => Promise.all(values.map((value) => this.records.save('evidence', validateEvidence(value)))),
    delete: (id: string) => this.records.delete('evidence', id), count: () => this.records.count('evidence'),
  };
  public readonly relationships = {
    findById: (id: string) => this.records.get<Relationship>('relationship', id),
    findByEntityId: async (id: string) => (await this.records.list<Relationship>('relationship')).filter((item) => item.sourceEntityId === id || item.targetEntityId === id),
    save: (value: Relationship) => this.records.save('relationship', validateRelationship(value)),
    saveBatch: async (values: Relationship[]) => Promise.all(values.map((value) => this.records.save('relationship', validateRelationship(value)))),
    delete: (id: string) => this.records.delete('relationship', id), count: () => this.records.count('relationship'),
  };
  public readonly comparisons = {
    findById: (id: string) => this.records.get<RunComparison>('comparison', id),
    findByRunIds: async (previousRunId: string, currentRunId: string) => (await this.records.list<RunComparison>('comparison')).find((item) => item.previousRunId === previousRunId && item.currentRunId === currentRunId) || null,
    save: (value: RunComparison) => this.records.save('comparison', validateRunComparison(value)),
    delete: (id: string) => this.records.delete('comparison', id),
  };

  getStorageMode() {
    const configured = this.records.isConfigured();
    return { mode: configured ? 'SUPABASE_POSTGRES' as const : 'SUPABASE_NOT_CONFIGURED' as const, isDurable: configured, activeAdapterName: configured ? 'SupabaseDomainRepository' : 'SupabaseNotConfigured', warning: configured ? undefined : 'Set SUPABASE_URL and SUPABASE_SECRET_KEY to enable durable domain-record storage.' };
  }
  clearAllForTesting() { return this.records.clear(); }
  checkConnection() { return this.records.checkConnection(); }
}
