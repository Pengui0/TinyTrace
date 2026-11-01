import React from 'react';
import { SourceConnector } from '../../types/vendor.js';
import { Badge } from '../common/Badge.js';
import { Card } from '../common/Card.js';
import { Database, ShieldCheck, AlertCircle, FileText, Globe } from 'lucide-react';

interface SourceHealthGridProps {
  connectors: SourceConnector[];
  onConfigureClick?: (connector: SourceConnector) => void;
}

export const SourceHealthGrid: React.FC<SourceHealthGridProps> = ({
  connectors,
  onConfigureClick,
}) => {
  const getIcon = (category: string) => {
    switch (category) {
      case 'REGISTRY':
        return <Database className="w-4 h-4 text-[#687385]" />;
      case 'TAX':
        return <FileText className="w-4 h-4 text-[#687385]" />;
      case 'LEGAL':
        return <ShieldCheck className="w-4 h-4 text-[#687385]" />;
      case 'DEBARMENT':
        return <AlertCircle className="w-4 h-4 text-[#687385]" />;
      case 'MEDIA':
      default:
        return <Globe className="w-4 h-4 text-[#687385]" />;
    }
  };

  const getStatusBadge = (status: SourceConnector['status']) => {
    switch (status) {
      case 'HEALTHY':
        return <Badge tone="verified" size="sm">Active</Badge>;
      case 'CONFIGURED':
        return <Badge tone="caution" size="sm">Configured · Untested</Badge>;
      case 'DEGRADED':
        return <Badge tone="caution" size="sm">Degraded</Badge>;
      case 'UNAVAILABLE':
        return <Badge tone="neutral" size="sm">Unavailable</Badge>;
      case 'NOT_CONFIGURED':
      default:
        return <Badge tone="subtle" size="sm">Not Configured</Badge>;
    }
  };

  return (
    <Card
      header="Official Due Diligence Connectors"
      headerAction={
        <span className="text-[11px] text-[#687385]">
          Independent Evidence Sources
        </span>
      }
      noPadding
      className="flex h-full flex-col"
    >
      <div className="flex flex-1 flex-col divide-y divide-[#E4E9EB]">
        {connectors.map((c) => (
          <div
            key={c.id}
            className="flex flex-1 flex-col justify-between gap-3 p-3.5 hover:bg-[#F5F7F8]/60 transition-colors sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-[#F5F7F8] border border-[#E4E9EB] mt-0.5">
                {getIcon(c.category)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#1C1F26]">{c.name}</span>
                  {getStatusBadge(c.status)}
                </div>
                <p className="mt-0.5 text-[11px] text-[#687385] leading-relaxed max-w-xl">
                  {c.coverageNote}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto text-xs shrink-0">
              {c.latencyMs && (
                <span className="font-mono text-[10px] text-[#8490A0] tabular-nums">
                  {c.latencyMs}ms
                </span>
              )}
              {onConfigureClick && (
                <button
                  onClick={() => onConfigureClick(c)}
                  className="text-[11px] text-[#687385] hover:text-[#1C1F26] underline underline-offset-2 cursor-pointer"
                >
                  Details
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
