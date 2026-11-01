import React, { useState } from 'react';
import { Radio, Search } from 'lucide-react';
import type { Investigation } from '../../types/vendor.js';
import { LiveStreamingWorkbench } from './LiveStreamingWorkbench.js';

interface LiveEvidenceViewProps {
  investigations: Investigation[];
}

export const LiveEvidenceView: React.FC<LiveEvidenceViewProps> = ({ investigations }) => {
  const [targetName, setTargetName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [selectedHistoryId, setSelectedHistoryId] = useState('');

  const useHistoryReport = (reportId: string) => {
    setSelectedHistoryId(reportId);
    if (!reportId) {
      setTargetName('');
      setIdentifier('');
      return;
    }
    const report = investigations.find((item) => item.id === reportId);
    if (!report) return;
    setTargetName(report.targetName);
    setIdentifier(report.identifierType === 'NAME' ? '' : report.identifierValue);
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-2 border-b border-[#E4E9EB] pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <Radio className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">Separate live workspace</p>
            <h1 className="text-xl font-bold tracking-tight text-[#1C1F26]">Live Search & Evidence</h1>
          </div>
          <span className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-800">LAYER 1 ONLY · LIVE</span>
        </div>
        <p className="max-w-3xl text-xs leading-relaxed text-[#687385]">
          Run and review the bounded registry, court, procurement, and adverse-media workstreams here. This workspace is separate from the standard investigation report and history.
        </p>
      </header>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1C1F26]">
            <Search className="h-4 w-4 text-emerald-700" /> Search target
          </div>
        </div>
        <label className="mb-3 block space-y-1 text-[11px] font-medium text-[#687385]">
          Choose a saved report as the live-search target
          <select value={selectedHistoryId} onChange={(event) => useHistoryReport(event.target.value)} className="w-full rounded-lg border border-[#D7DFE3] bg-white px-3 py-2.5 text-sm text-[#171C25] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
            <option value="">Select from report history…</option>
            {investigations.map((report) => (
              <option key={report.id} value={report.id}>
                {report.targetName} · {report.identifierValue || report.identifierType} · {report.status === 'PARTIAL_FAILURE' ? 'Partial coverage' : report.status} · {new Date(report.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1 text-[11px] font-medium text-[#687385]">
            Company or vendor name
            <input value={targetName} onChange={(event) => { setSelectedHistoryId(''); setTargetName(event.target.value); }} placeholder="Enter company name" className="w-full rounded-lg border border-[#D7DFE3] bg-white px-3 py-2.5 text-sm text-[#171C25] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="space-y-1 text-[11px] font-medium text-[#687385]">
            CIN, GSTIN, PAN, or other identifier (optional)
            <input value={identifier} onChange={(event) => { setSelectedHistoryId(''); setIdentifier(event.target.value); }} placeholder="Add an exact identifier to improve matching" className="w-full rounded-lg border border-[#D7DFE3] bg-white px-3 py-2.5 text-sm text-[#171C25] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
          </label>
        </div>
      </div>

      {targetName.trim() ? (
        <LiveStreamingWorkbench
          key={`${targetName.trim().toUpperCase()}|${identifier.trim().toUpperCase()}`}
          targetName={targetName.trim()}
          identifiers={identifier.trim() ? [identifier.trim()] : []}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-[#D7DFE3] bg-white px-5 py-8 text-center">
          <p className="text-sm font-semibold text-[#1C1F26]">Choose a target to begin</p>
          <p className="mt-1 text-xs text-[#687385]">Select a saved report or enter a company name, then launch the live agent to load results.</p>
        </div>
      )}
    </section>
  );
};
