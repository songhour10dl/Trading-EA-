export const formatCurrency = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value: number, decimals = 2): string => {
  return `${(value).toFixed(decimals)}%`;
};

export const formatNumber = (value: number, decimals = 2): string => {
  return value.toFixed(decimals);
};

export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'running':
    case 'open':
    case 'WIN':
    case 'connected':
    case 'bullish':
      return 'text-green-400';
    case 'paused':
    case 'sideways':
      return 'text-amber-400';
    case 'stopped':
    case 'closed':
    case 'LOSS':
    case 'disconnected':
    case 'error':
    case 'bearish':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
};

export const getStatusBgColor = (status: string): string => {
  switch (status) {
    case 'running':
    case 'open':
    case 'WIN':
    case 'connected':
    case 'bullish':
      return 'bg-green-900/20';
    case 'paused':
    case 'sideways':
      return 'bg-amber-900/20';
    case 'stopped':
    case 'closed':
    case 'LOSS':
    case 'disconnected':
    case 'error':
    case 'bearish':
      return 'bg-red-900/20';
    default:
      return 'bg-gray-900/20';
  }
};

export const getDirectionColor = (direction: 'BUY' | 'SELL'): string => {
  return direction === 'BUY' ? 'text-green-400' : 'text-red-400';
};

export const getDirectionBgColor = (direction: 'BUY' | 'SELL'): string => {
  return direction === 'BUY' ? 'bg-green-900/20' : 'bg-red-900/20';
};

export const calculateDuration = (startTime: string): string => {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diff = now - start;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export const truncateAddress = (address: string, chars = 6): string => {
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
};
