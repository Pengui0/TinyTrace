import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  headerAction,
  footer,
  noPadding = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-[#E4E9EB] shadow-[0_4px_18px_rgba(23,28,37,0.035)] overflow-hidden ${className}`}
      {...props}
    >
      {(header || headerAction) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3.5 bg-[#F8FAFB] border-b border-[#E4E9EB]">
          <div className="min-w-0 flex-1 text-sm font-semibold text-[#1C1F26]">{header}</div>
          {headerAction && <div className="min-w-0 max-w-full">{headerAction}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
      {footer && (
        <div className="px-4 py-3 bg-[#F8FAFB] border-t border-[#E4E9EB] text-xs text-[#687385]">
          {footer}
        </div>
      )}
    </div>
  );
};
