import React from 'react';

export interface MetricCounterProps {
  label: string;
  value: number | null | undefined;
  subtext: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'verified' | 'caution' | 'risk';
}

export const MetricCounter: React.FC<MetricCounterProps> = ({
  label,
  value,
  subtext,
  icon,
  tone = 'default',
}) => {
  const isPresent = typeof value === 'number';

  const toneTextClasses = {
    default: 'text-[#171C25]',
    verified: 'text-[#087F61]',
    caution: 'text-[#B45309]',
    risk: 'text-[#DC5555]',
  };

  const toneIconClasses = {
    default: 'text-[#3986C9] bg-[#EFF6FC] border-[#D7E8F6]',
    verified: 'text-[#087F61] bg-[#E7F5F0] border-[#B8E5D5]',
    caution: 'text-[#B45309] bg-[#FFF7E8] border-[#F5E1BB]',
    risk: 'text-[#DC5555] bg-[#FFF1F0] border-[#F4D0CD]',
  };

  return (
    <div className="flex min-h-[142px] flex-col justify-between rounded-2xl border border-[#E4E9EB] bg-white p-4 shadow-[0_4px_16px_rgba(23,28,37,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(23,28,37,0.07)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-[#687385]">{label}</div>
        {icon && <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${toneIconClasses[tone]}`}>{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={`text-[32px] leading-none font-semibold tabular-nums tracking-[-0.04em] ${
            isPresent ? toneTextClasses[tone] : 'text-[#8490A0]'
          }`}
        >
          {isPresent ? value : '—'}
        </span>
      </div>
      <div className="mt-2 text-[11px] leading-4 text-[#8490A0]">{subtext}</div>
    </div>
  );
};
