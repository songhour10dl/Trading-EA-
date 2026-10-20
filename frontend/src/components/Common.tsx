import React from 'react';
import { useNotificationStore } from '../store/notificationStore';

export const ToastContainer: React.FC = () => {
  const toasts = useNotificationStore((state) => state.toasts);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg font-mono text-sm animate-slide-in ${
            toast.type === 'success' ? 'bg-green-900/80 text-green-200' : ''
          } ${toast.type === 'error' ? 'bg-red-900/80 text-red-200' : ''} ${
            toast.type === 'warning' ? 'bg-amber-900/80 text-amber-200' : ''
          } ${toast.type === 'info' ? 'bg-blue-900/80 text-blue-200' : ''}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Error caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-trading-dark">
          <div className="bg-trading-card border border-red-500/50 rounded-lg p-8 max-w-md">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-trading-text-muted mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-mono"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ConnectionStatusProps {
  connected: boolean;
  label?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected, label = 'Connection' }) => {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className="text-trading-text-muted">
        {label}: <span className={connected ? 'text-green-400' : 'text-red-400'}>{connected ? 'Online' : 'Offline'}</span>
      </span>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-trading-card border border-trading-border rounded-lg p-6 max-w-sm">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-trading-text-muted mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-mono disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-mono text-white disabled:opacity-50"
          >
            {isLoading ? '...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
