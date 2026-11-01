import React from 'react';
import { Investigation } from '../../types/vendor.js';
import { InvestigationDiffView } from './InvestigationDiffView.js';

interface MonitoringViewProps {
  investigations: Investigation[];
  selectedInvestigation: Investigation | null;
  comparisonSelection?: { baselineId: string; latestId: string } | null;
  onTriggerReRun: (inv: Investigation) => void;
  isLoading: boolean;
  onInvestigationUpdated?: (updatedInv: Investigation) => void;
  onOpenAutomatedMonitoring?: (reportId: string) => void;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({
  investigations,
  selectedInvestigation,
  comparisonSelection,
  onTriggerReRun,
  isLoading,
  onInvestigationUpdated,
  onOpenAutomatedMonitoring,
}) => {
  const currentInvestigation = selectedInvestigation && investigations.some((item) => item.id === selectedInvestigation.id)
    ? selectedInvestigation
    : investigations[0] || null;

  return (
    <div className="space-y-6">
      <InvestigationDiffView
        currentInvestigation={currentInvestigation}
        comparisonSelection={comparisonSelection}
        onOpenAutomatedMonitoring={onOpenAutomatedMonitoring}
        allInvestigations={investigations}
        onInvestigationUpdated={(updated) => {
          if (onInvestigationUpdated) {
            onInvestigationUpdated(updated);
          } else {
            onTriggerReRun(updated);
          }
        }}
      />
    </div>
  );
};
