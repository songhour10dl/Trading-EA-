import React, { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Card, Table, Badge, LoadingSpinner, StatCard, Select } from '../components/UI';
import { formatCurrency, formatPercent } from '../utils/formatting';

export const TradeHistoryPage: React.FC = () => {
  const { data: tradeData, loading, error, refetch } = useApi<any>('/trades');
  const { data: metricsData, loading: metricsLoading } = useApi<any>('/trades/metrics');
  const [period, setPeriod] = useState('all');

  const trades = useMemo(() => {
    const list = Array.isArray(tradeData) ? tradeData : Array.isArray(tradeData?.data) ? tradeData.data : [];
    if (period === 'all') return list;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(period));
    return list.filter((trade: any) => trade.exitTime && new Date(trade.exitTime) >= cutoff);
  }, [tradeData, period]);

  const metrics = useMemo(() => {
    const base = metricsData && typeof metricsData === 'object' ? metricsData : {};
    const closed = trades.filter((trade: any) => trade.exitTime != null && trade.profitLoss != null);
    const wins = closed.filter((trade: any) => Number(trade.profitLoss) > 0);
    const losses = closed.filter((trade: any) => Number(trade.profitLoss) < 0);
    const grossWin = wins.reduce((sum: number, trade: any) => sum + Number(trade.profitLoss), 0);
    const grossLoss = Math.abs(losses.reduce((sum: number, trade: any) => sum + Number(trade.profitLoss), 0));
    const totalProfit = closed.reduce((sum: number, trade: any) => sum + Number(trade.profitLoss || 0), 0);
    return {
      totalTrades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: closed.length ? wins.length / closed.length * 100 : 0,
      totalProfit,
      avgWinner: wins.length ? grossWin / wins.length : 0,
      profitFactor: grossLoss ? grossWin / grossLoss : 0,
      serverClosedTrades: base.closedTrades,
    };
  }, [metricsData, trades]);

  if (loading || metricsLoading) return <div className="flex min-h-[55vh] items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const rows = trades.map((trade: any) => {
    const profit = Number(trade.realizedPL ?? trade.profitLoss ?? 0);
    const closed = Boolean(trade.exitTime);
    const entry = trade.entryTime ? new Date(trade.entryTime).toLocaleString() : '—';
    const exit = trade.exitTime ? new Date(trade.exitTime).toLocaleString() : 'Open';
    return [
      <div><p className="font-semibold text-white">{trade.symbol || '—'}</p><p className="mt-1 text-[10px] text-[#768397] mono-data">{trade.ticket}</p></div>,
      <Badge variant={trade.direction === 'BUY' ? 'success' : 'danger'}>{trade.direction || '—'}</Badge>,
      <span className="text-xs text-[#9ba8b9]">{trade.strategy || '—'}</span>,
      <span className="mono-data">{formatCurrency(Number(trade.entryPrice) || 0, 5)}</span>,
      <span className="mono-data">{closed ? formatCurrency(Number(trade.exitPrice) || 0, 5) : '—'}</span>,
      <span className="mono-data">{Number(trade.lotSize) || 0}</span>,
      <span className={`mono-data font-medium ${profit > 0 ? 'text-emerald-300' : profit < 0 ? 'text-rose-300' : 'text-[#a5afbd]'}`}>{closed ? formatCurrency(profit) : 'Open'}</span>,
      <span className="text-xs text-[#8190a4]">{entry}<br /><span className="text-[#5f6c7d]">{exit}</span></span>,
    ];
  });

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="eyebrow">Performance / Ledger</p><h1 className="page-title mt-2 text-3xl font-bold text-white md:text-[38px]">Trade history</h1><p className="mt-2 text-sm text-[#8995a6]">Completed executions across your connected EA instances.</p></div>
        <div className="flex items-center gap-3"><div className="w-36"><Select aria-label="History period" options={[{ value: 'all', label: 'All time' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} value={period} onChange={(event) => setPeriod(event.target.value)} /></div><button onClick={() => void refetch()} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-[#c7d1df] transition hover:bg-white/[.08]">Refresh ↻</button></div>
      </div>

      {error && <Card className="border-rose-300/20"><p className="text-sm text-rose-200">History could not be loaded: {error}</p></Card>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        <StatCard label="Closed trades" value={metrics.totalTrades} subvalue={`${metrics.wins} wins · ${metrics.losses} losses`} icon="⌁" />
        <StatCard label="Win rate" value={formatPercent(metrics.winRate)} subvalue="Closed-trade outcomes" icon="↗" />
        <StatCard label="Profit factor" value={metrics.profitFactor.toFixed(2)} subvalue="Gross profit / gross loss" icon="◌" />
        <StatCard label="Net result" value={<span className={metrics.totalProfit >= 0 ? 'text-emerald-200' : 'text-rose-200'}>{formatCurrency(metrics.totalProfit)}</span>} subvalue={`Average winner ${formatCurrency(metrics.avgWinner)}`} icon="$" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[.06] px-5 py-5 md:px-6"><div><h2 className="font-semibold text-white">Execution ledger</h2><p className="mt-1 text-xs text-[#778497]">{trades.length} records · newest first</p></div><span className="eyebrow">LIVE SYNC</span></div>
        {trades.length === 0 ? <div className="px-6 py-16 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[.08] bg-white/[.025] text-xl text-[#8997a9]">⌁</div><p className="font-medium text-white">No trade records yet</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7e8a9b]">Closed EA trades are synchronized at close. Ensure the EA is connected and has the latest build; manual and historical trades are not backfilled automatically.</p></div> : <Table headers={['Instrument / ticket', 'Side', 'Strategy', 'Entry price', 'Exit price', 'Size', 'Net P/L', 'Opened / closed']} rows={rows} />}
      </Card>
    </div>
  );
};
