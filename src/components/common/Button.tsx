import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition duration-150 cursor-pointer select-none border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'text-xs px-3 py-2 rounded-lg gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-lg gap-2',
    lg: 'text-base px-5 py-3 rounded-xl gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-[#087F61] text-white border-[#087F61] shadow-sm hover:-translate-y-px hover:bg-[#066C53] hover:shadow-md active:translate-y-0 active:bg-[#055942]',
    secondary:
      'bg-[#F1F5F6] text-[#171C25] border-[#E4E9EB] hover:bg-[#E9EFF0] active:bg-[#E1E8EA]',
    outline:
      'bg-white text-[#171C25] border-[#D7DFE3] shadow-sm hover:-translate-y-px hover:border-[#B8D8CE] hover:bg-[#FAFCFB] active:translate-y-0',
    danger:
      'bg-[#B91C1C] text-white border-[#B91C1C] hover:bg-[#991B1B] active:bg-[#7F1D1D]',
    ghost:
      'bg-transparent text-[#687385] border-transparent hover:bg-[#EEF2F3] hover:text-[#171C25]',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          ></path>
        </svg>
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};
