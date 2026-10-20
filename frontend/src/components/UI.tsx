import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      className={`app-surface rounded-2xl p-5 md:p-6 ${onClick ? 'cursor-pointer hover-lift' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'font-medium rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98]';

  const variantClasses = {
    primary: 'bg-[#a4edcf] hover:bg-[#b9f5dc] text-[#0a1611] shadow-[0_7px_24px_rgba(134,230,192,.12)]',
    secondary: 'border border-white/10 bg-white/[.045] hover:bg-white/[.08] text-[#e8edf5]',
    danger: 'border border-red-300/15 bg-red-400/10 hover:bg-red-400/20 text-red-200',
    success: 'border border-emerald-200/15 bg-emerald-300/10 hover:bg-emerald-300/20 text-emerald-100',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? '...' : children}
    </button>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className = '' }) => {
  const variantClasses = {
    success: 'border border-emerald-200/15 bg-emerald-300/[.08] text-emerald-200',
    danger: 'border border-red-300/15 bg-red-400/[.08] text-red-200',
    warning: 'border border-amber-200/15 bg-amber-300/[.08] text-amber-200',
    info: 'border border-sky-200/15 bg-sky-300/[.08] text-sky-200',
  };

  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-mono ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

interface TableProps {
  headers: string[];
  rows: React.ReactNode[][];
  className?: string;
}

export const Table: React.FC<TableProps> = ({ headers, rows, className = '' }) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-trading-border">
            {headers.map((header, idx) => (
              <th key={idx} className="eyebrow whitespace-nowrap px-4 py-4 text-left !text-[9px] !tracking-[.12em]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-white/[.045] text-[#c8d1de] transition-colors hover:bg-white/[.025]">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="whitespace-nowrap px-4 py-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-trading-text-muted hover:text-trading-text">
            ✕
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
};

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizeClasses[size]} border-2 border-trading-border border-t-blue-500 rounded-full animate-spin`} />
  );
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subvalue?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subvalue, icon, trend }) => {
  return (
    <Card className="hover-lift relative overflow-hidden">
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-200/[.035] blur-2xl" />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="eyebrow">{label}</p>
          <p className="mono-data mt-4 text-[26px] font-medium tracking-[-.045em] text-[#f1f5f8]">{value}</p>
          {subvalue && <p className="mt-2 text-xs text-[#7e8a9b]">{subvalue}</p>}
        </div>
        {icon && <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[.07] bg-white/[.035] text-sm text-[#9daaba]">{icon}</div>}
      </div>
      {trend && (
        <div className="mt-2 text-xs">
          {trend === 'up' && <span className="text-green-400">↑ Trending up</span>}
          {trend === 'down' && <span className="text-red-400">↓ Trending down</span>}
          {trend === 'neutral' && <span className="text-gray-400">→ Neutral</span>}
        </div>
      )}
    </Card>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-semibold mb-2">{label}</label>}
      <input
        className={`w-full bg-trading-darker border border-trading-border rounded px-3 py-2 text-trading-text placeholder-trading-text-muted focus:outline-none focus:border-blue-500 transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className = '', ...props }) => {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-semibold mb-2">{label}</label>}
      <select
        className={`w-full bg-trading-darker border border-trading-border rounded px-3 py-2 text-trading-text focus:outline-none focus:border-blue-500 transition-colors ${className}`}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
};
