import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  variant?: 'underline' | 'segmented';
}

export function Tabs<T extends string = string>({
  items,
  activeId,
  onChange,
  className = '',
  variant = 'underline',
}: TabsProps<T>) {
  if (variant === 'segmented') {
    return (
      <div
        className={`flex flex-wrap items-stretch gap-1 p-1 w-full min-w-0 bg-[#F1F5F6] rounded-xl border border-[#E4E9EB] ${className}`}
        role="tablist"
      >
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={tab.disabled || undefined}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`flex flex-1 basis-[180px] min-w-0 items-center justify-center gap-1.5 px-3 py-2 text-xs text-center whitespace-normal break-words font-medium rounded-lg transition-colors cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-45 ${
                isActive
                  ? 'bg-white text-[#087F61] shadow-sm font-semibold ring-1 ring-[#E4E9EB]'
                  : 'text-[#687385] hover:text-[#171C25] hover:bg-white/70'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span className="min-w-0">{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="text-[11px] tabular-nums text-[#8490A0] ml-1">
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex border-b border-[#E4E9EB] gap-6 ${className}`} role="tablist">
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled || undefined}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 pb-2.5 text-sm font-medium transition-colors cursor-pointer relative disabled:cursor-not-allowed disabled:opacity-45 ${
              isActive
                ? 'text-[#1C1F26] font-semibold'
                : 'text-[#687385] hover:text-[#1C1F26]'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="text-xs tabular-nums text-[#8490A0]">
                ({tab.count})
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#087F61]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
