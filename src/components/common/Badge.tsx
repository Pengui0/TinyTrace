import React from 'react';

export type BadgeTone = 'verified' | 'caution' | 'risk' | 'neutral' | 'subtle';

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'neutral',
  dot = true,
  className = '',
  size = 'md',
}) => {
  const toneClasses: Record<BadgeTone, { bg: string; text: string; border: string; dotColor: string }> = {
    verified: {
      bg: 'bg-[#E7F5F0]',
      text: 'text-[#087F61]',
      border: 'border-[#B8E5D5]',
      dotColor: 'bg-[#087F61]',
    },
    caution: {
      bg: 'bg-[#FFFBEB]',
      text: 'text-[#B45309]',
      border: 'border-[#FDE68A]',
      dotColor: 'bg-[#B45309]',
    },
    risk: {
      bg: 'bg-[#FFF1F0]',
      text: 'text-[#B94444]',
      border: 'border-[#F4D0CD]',
      dotColor: 'bg-[#DC5555]',
    },
    neutral: {
      bg: 'bg-[#F1F5F9]',
      text: 'text-[#475569]',
      border: 'border-[#E2E8F0]',
      dotColor: 'bg-[#64748B]',
    },
    subtle: {
      bg: 'bg-[#F5F7F8]',
      text: 'text-[#687385]',
      border: 'border-[#E4E9EB]',
      dotColor: 'bg-[#8490A0]',
    },
  };

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-1 font-semibold',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const { bg, text, border, dotColor } = toneClasses[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border ${bg} ${text} ${border} ${sizeClasses[size]} select-none ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      <span>{children}</span>
    </span>
  );
};
