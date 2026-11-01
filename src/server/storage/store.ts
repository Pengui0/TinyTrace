import { Investigation, SourceConnector, WorkspaceStats } from '../../types/vendor.js';
import type { Vendor } from '../../types/domain.js';
import { getCurrentWorkspaceId } from '../persistence/workspaceContext.js';

/**
 * TinyTrace In-Memory / File Persistent Store
 * Ensures truthful metrics: counts reflect actual stored records.
 * No fabricated statistics or mock metrics.
 */

class DataStore {
  private investigationsByWorkspace = new Map<string, Map<string, Investigation>>();
  private vendorsByWorkspace = new Map<string, Map<string, { id: string; name: string; cin: string | null; gstin: string | null; addedAt: string }>>();

  private get investigations(): Map<string, Investigation> {
    const workspaceId = getCurrentWorkspaceId();
    let records = this.investigationsByWorkspace.get(workspaceId);
    if (!records) { records = new Map(); this.investigationsByWorkspace.set(workspaceId, records); }
    return records;
  }

  private get trackedVendors(): Map<string, { id: string; name: string; cin: string | null; gstin: string | null; addedAt: string }> {
    const workspaceId = getCurrentWorkspaceId();
    let records = this.vendorsByWorkspace.get(workspaceId);
    if (!records) { records = new Map(); this.vendorsByWorkspace.set(workspaceId, records); }
    return records;
  }

  public getStats(): WorkspaceStats {
    const totalInv = this.investigations.size;
    const totalVen = this.trackedVendors.size;
    
    let pendingReviews = 0;
    let highRiskFlags = 0;

    for (const inv of this.investigations.values()) {
      pendingReviews += inv.findingsCount.requiresReview || 0;
      highRiskFlags += inv.findingsCount.materialRisk || 0;
    }

    return {
      totalInvestigations: totalInv > 0 ? totalInv : null,
      totalTrackedVendors: totalVen > 0 ? totalVen : null,
      pendingReviews: totalInv > 0 ? pendingReviews : null,
      highRiskFlags: totalInv > 0 ? highRiskFlags : null,
      connectorsActive: this.getConnectors().filter(c => c.status === 'HEALTHY').length,
      connectorsTotal: this.getConnectors().length,
    };
  }

  public getConnectors(): SourceConnector[] {
    const hasIndiaCos = Boolean(process.env.INDIACOS_API_KEY && process.env.INDIACOS_API_KEY.trim().length > 0);
    const hasTinyFish = Boolean(process.env.TINYFISH_API_KEY && process.env.TINYFISH_API_KEY.trim().length > 0);

    return [
      {
        id: 'indiacos_mca',
        name: 'MCA21 Company & LLP Registry',
        category: 'REGISTRY',
        isConfigured: hasIndiaCos,
        status: hasIndiaCos ? 'CONFIGURED' : 'NOT_CONFIGURED',
        lastChecked: '',
        coverageNote: 'Official Ministry of Corporate Affairs registered entities, DIN status, capital structures, and directors.',
      },
      {
        id: 'indiacos_gstn',
        name: 'GSTN Tax Registration Portal',
        category: 'TAX',
        isConfigured: hasIndiaCos,
        status: hasIndiaCos ? 'CONFIGURED' : 'NOT_CONFIGURED',
        lastChecked: '',
        coverageNote: 'Goods and Services Tax filing status, active states, jurisdiction, and return frequency.',
      },
      {
        id: 'ecourts_litigation',
        name: 'E-Courts & Tribunal Registry (NCLT / HC)',
        category: 'LEGAL',
        isConfigured: false,
        status: 'NOT_INTEGRATED',
        lastChecked: '',
        coverageNote: 'No direct court repository connection is configured. Court sources may still be searched through the live web research workflow; coverage is not equivalent to a direct registry integration.',
      },
      {
        id: 'gem_blacklist',
        name: 'GeM & CPPP Debarment Registry',
        category: 'DEBARMENT',
        isConfigured: false,
        status: 'NOT_INTEGRATED',
        lastChecked: '',
        coverageNote: 'No direct GeM/CPPP roster connection is configured. Procurement sources may still be searched through the live web research workflow; coverage is not equivalent to a direct registry integration.',
      },
      {
        id: 'tinyfish_media',
        name: 'TinyFish Web Agent & Adverse Media',
        category: 'MEDIA',
        isConfigured: hasTinyFish,
        status: hasTinyFish ? 'CONFIGURED' : 'NOT_CONFIGURED',
        lastChecked: '',
        coverageNote: 'Real-time agentic extraction across national business press, regulatory enforcement notices, and tribunals.',
      },
    ];
  }

  public getAllInvestigations(): Investigation[] {
    return Array.from(this.investigations.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getInvestigation(id: string): Investigation | undefined {
    return this.investigations.get(id);
  }

  public deleteInvestigation(id: string): boolean {
    return this.investigations.delete(id);
  }

  public createInvestigation(inv: Investigation): Investigation {
    this.investigations.set(inv.id, inv);
    return inv;
  }

  public hydrateWorkspace(investigations: Investigation[], vendors: Vendor[]): void {
    this.investigations.clear();
    this.trackedVendors.clear();
    investigations.forEach((investigation) => this.investigations.set(investigation.id, investigation));
    vendors.forEach((vendor) => this.trackedVendors.set(vendor.id, {
      id: vendor.id,
      name: vendor.canonicalName,
      cin: vendor.cin,
      gstin: vendor.gstins[0] || null,
      addedAt: vendor.firstSeenAt,
    }));
    investigations.forEach((investigation) => {
      const id = `ven_${investigation.id}`;
      if (this.trackedVendors.has(id)) return;
      this.trackedVendors.set(id, {
        id,
        name: investigation.targetName,
        cin: investigation.identifierType === 'CIN' ? investigation.identifierValue : null,
        gstin: investigation.identifierType === 'GSTIN' ? investigation.identifierValue : null,
        addedAt: investigation.createdAt,
      });
    });
  }

  public resetWorkspaceData(): void {
    this.investigations.clear();
    this.trackedVendors.clear();
  }

  public getAllVendors() {
    return Array.from(this.trackedVendors.values());
  }

  public deleteVendor(id: string): boolean {
    return this.trackedVendors.delete(id);
  }
}

export const store = new DataStore();
