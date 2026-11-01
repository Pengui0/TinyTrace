import { apiFetch } from '../../api/apiFetch.js';
import React, { useState, useEffect } from 'react';
import { Vendor } from '../../types/domain.js';
import { EmptyState } from '../common/EmptyState.js';
import { Button } from '../common/Button.js';
import { Card } from '../common/Card.js';
import { Badge } from '../common/Badge.js';
import { VendorProfileView } from './VendorProfileView.js';
import { Building2, Plus, Search, ShieldCheck, MapPin, Tag, ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import { Investigation } from '../../types/vendor.js';
import { loadWorkspace, updateWorkspace } from '../../persistence/localStore.js';

interface VendorsViewProps {
  onStartInvestigation: () => void;
  onSelectInvestigation?: (invId: string) => void;
  onCompareInvestigations?: (prevId: string, currId: string) => void;
  investigations?: Investigation[];
}

export const VendorsView: React.FC<VendorsViewProps> = ({
  onStartInvestigation,
  onSelectInvestigation,
  onCompareInvestigations,
  investigations = [],
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchVendors = (query = '') => {
    setIsLoading(true);
    const url = query ? `/api/vendors?q=${encodeURIComponent(query)}` : '/api/vendors';
    apiFetch(url)
      .then((res) => res.json())
      .then((data) => {
        const fromServer: Vendor[] = data.vendors || [];
        setVendors(fromServer);
        if (!query && fromServer.length) {
          updateWorkspace((workspace) => {
            const merged = new Map(workspace.vendors.map((vendor) => [vendor.id, vendor]));
            fromServer.forEach((vendor) => merged.set(vendor.id, vendor));
            return { ...workspace, vendors: [...merged.values()] };
          });
        }
        if (data.storageStatus) setStorageStatus(data.storageStatus);
      })
      .catch((err) => console.error('Error fetching vendors:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchVendors();
  }, [investigations]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVendors(searchQuery);
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    const confirmed = window.confirm(
      `Delete ${vendor.canonicalName} from the vendor directory? Its saved investigation reports and evidence will be retained.`
    );
    if (!confirmed) return;

    setDeletingVendorId(vendor.id);
    setDeleteError(null);
    try {
      const response = await apiFetch(`/api/vendors/${encodeURIComponent(vendor.id)}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Vendor record could not be deleted.');
      updateWorkspace((workspace) => ({ ...workspace, vendors: workspace.vendors.filter((item) => item.id !== vendor.id) }));
      fetchVendors(searchQuery);
    } catch (error: any) {
      setDeleteError(error.message || 'Vendor record could not be deleted.');
    } finally {
      setDeletingVendorId(null);
    }
  };

  const getRiskBadge = (status: Vendor['latestRiskStatus']) => {
    switch (status) {
      case 'MATERIAL_RISK':
        return <Badge tone="risk" size="sm">Material Risk</Badge>;
      case 'CAUTION':
        return <Badge tone="caution" size="sm">Caution</Badge>;
      case 'VERIFIED_CLEAR':
        return <Badge tone="verified" size="sm">Verified Clear</Badge>;
      case 'UNKNOWN':
      default:
        return null;
    }
  };

  // If a vendor is selected, drill down into full Vendor Profile with report history
  if (selectedVendorId) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedVendorId(null)}
          className="text-xs font-semibold text-[#687385] hover:text-[#1C1F26] flex items-center gap-1.5 cursor-pointer pb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Vendor Directory
        </button>
        <VendorProfileView
          vendorId={selectedVendorId}
          investigations={investigations.length ? investigations : loadWorkspace().investigations}
          onSelectInvestigation={(invId) => {
            if (onSelectInvestigation) onSelectInvestigation(invId);
          }}
          onCompareInvestigations={onCompareInvestigations}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E4E9EB]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C1F26]">
            Vendor Master Directory
          </h1>
          <p className="mt-1 text-xs text-[#687385]">
            Corporate entities verified and under procurement due diligence in this workspace. Click any vendor to inspect historical audit reports and trends.
          </p>
        </div>
      </div>

      {/* Persistence State Banner */}
      <div className="p-3 bg-[#F5F7F8] border border-[#E4E9EB] rounded text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#8490A0]">Repository Storage:</span>
          <span className="font-mono text-[#1C1F26] text-[11px]">
            {storageStatus?.activeAdapterName || 'SupabaseNotConfigured'}
          </span>
          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            {storageStatus?.isDurable ? 'Durable Supabase PostgreSQL' : 'Supabase Not Configured'}
          </span>
        </div>
        <span className="text-[11px] text-[#687385]">
          {vendors.length} Vendor{vendors.length === 1 ? '' : 's'} on record
        </span>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8490A0] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by legal name, CIN, GSTIN, or alias..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D7DFE3] rounded text-[#1C1F26] focus:outline-none focus:border-[#1C1F26]"
          />
        </div>
        <Button type="submit" variant="secondary" size="md">
          Search
        </Button>
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => {
              setSearchQuery('');
              fetchVendors('');
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {deleteError && <div role="alert" className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{deleteError}</div>}

      {/* Vendor Table or Empty State */}
      <Card
        header="Tracked Corporate Entities"
        headerAction={
          <span className="text-xs text-[#687385]">
            Click any row to open Vendor Profile & Report History
          </span>
        }
        noPadding={vendors.length > 0}
      >
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#8490A0]">
            Loading vendor records from repository...
          </div>
        ) : vendors.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-5 h-5" />}
            title="No vendors tracked in this workspace yet"
            description="Vendors are automatically registered upon running due diligence investigations. Use the primary action to run an investigation."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={onStartInvestigation}
              >
                Investigate a vendor
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-[#E4E9EB]">
            {vendors.map((v) => (
              <div
                key={v.id}
                onClick={() => setSelectedVendorId(v.id)}
                className="p-4 space-y-2 hover:bg-[#F5F7F8] transition-colors cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#1C1F26] hover:underline flex items-center gap-1.5">
                      {v.canonicalName}
                      <ExternalLink className="w-3 h-3 text-[#687385]" />
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F5F7F8] border border-[#E4E9EB] text-[#687385]">
                      ID: {v.id}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      RoC: {v.companyStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRiskBadge(v.latestRiskStatus)}
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); void handleDeleteVendor(v); }}
                      disabled={deletingVendorId === v.id}
                      aria-label={`Delete ${v.canonicalName} from vendor directory`}
                      title="Delete vendor record"
                      className="inline-flex min-h-8 items-center gap-1 rounded border border-rose-200 bg-white px-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingVendorId === v.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#687385]">
                  <div>
                    <span className="text-[#8490A0]">CIN: </span>
                    <span className="font-mono text-[#1C1F26]">{v.cin || 'Not Available'}</span>
                  </div>
                  <div>
                    <span className="text-[#8490A0]">GSTINs: </span>
                    <span className="font-mono text-[#1C1F26]">
                      {v.gstins.length > 0 ? v.gstins.join(', ') : 'None on record'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8490A0]">Last Checked: </span>
                    <span className="text-[#1C1F26]">{new Date(v.lastCheckedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {v.inputNames.length > 1 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8490A0]">
                    <Tag className="w-3 h-3" />
                    <span>Aliases: {v.inputNames.join(' · ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
