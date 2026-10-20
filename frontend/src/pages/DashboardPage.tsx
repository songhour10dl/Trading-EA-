import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBotStore } from '../store/botStore';
import { useApi } from '../hooks/useApi';
import { useSocket } from '../hooks/useSocket';
import { Card, StatCard, Badge, LoadingSpinner, Table } from '../components/UI';
import { formatCurrency, formatPercent, getStatusColor, getStatusBgColor, formatDateTime } from '../utils/formatting';
import { ConnectionStatus } from '../components/Common';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  useSocket();
  
  const { data: initialData, loading, error } = useApi('/bot/status');
  const botState = useBotStore();

  useEffect(() => {
    if (error && (error.includes('No EA instance found') || error.includes('no ea'))) {
      navigate('/ea');
    }
  }, [error, navigate]);

  useEffect(() => {
    if (initialData) {
      botState.updateBotStatus({
        ...initialData.bot,
        status: (initialData.bot?.status ?? 'stopped').toLowerCase(),
      });
      botState.updateAccount(initialData.account ?? {});
      botState.updatePositions(initialData.positions ?? []);
    }
  }, [initialData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const floatingPLColor = (botState?.account?.floatingPL ?? 0) >= 0 ? 'text-green-400' : 'text-red-400';
  const todayPLColor = (botState?.account?.todayPL ?? 0) >= 0 ? 'text-green-400' : 'text-red-400';
  const marginLevelColor = (botState?.account?.marginLevel ?? 0) > 50 ? 'text-green-400' : (botState?.account?.marginLevel ?? 0) > 30 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] border border-white/[.08] bg-[#101721] p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_50%,rgba(104,211,170,.12),transparent_43%),linear-gradient(110deg,rgba(255,255,255,.018),transparent_50%)]" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <p className="eyebrow">Portfolio / Live overview</p>
            <h1 className="page-title mt-3 max-w-xl text-3xl font-bold leading-tight text-white md:text-[42px]">Clarity for every market move.</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#8c99aa]">A precise view of your account, execution health, and open market exposure.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ConnectionStatus connected={botState?.bot?.status === 'running'} label="Bot service" />
              <ConnectionStatus connected={botState?.mt5?.connected ?? false} label="MT5 terminal" />
              <span className="rounded-full border border-white/[.07] bg-black/10 px-3 py-1.5 text-[11px] text-[#929eae]">Account <span className="ml-1 mono-data text-[#d9e2eb]">{botState?.mt5?.accountNumber ?? '—'}</span></span>
            </div>
          </div>
          <div className="relative mx-auto h-[190px] w-full max-w-[340px] [perspective:900px]">
            <div className="absolute inset-5 rounded-full bg-emerald-200/[.09] blur-3xl" />
            <div className="absolute inset-x-5 top-6 h-36 rounded-[26px] border border-emerald-100/[.15] bg-[linear-gradient(140deg,rgba(39,57,63,.82),rgba(17,25,34,.92)_52%,rgba(25,43,44,.82))] shadow-[0_26px_55px_rgba(0,0,0,.38),inset_0_1px_0_rgba(255,255,255,.09)] transition-transform duration-500 hover:[transform:rotateY(-8deg)_rotateX(5deg)_translateY(-4px)]">
              <div className="flex items-center justify-between px-5 pt-4"><span className="eyebrow !text-[8px]">ACCOUNT EQUITY</span><span className="flex items-center gap-1.5 text-[9px] text-emerald-200"><i className="h-1.5 w-1.5 rounded-full bg-emerald-300" />SYNC</span></div>
              <div className="px-5 pt-1 mono-data text-[25px] text-white">{formatCurrency(botState?.account?.equity ?? 0)}</div>
              <svg viewBox="0 0 300 58" className="mt-1 h-[58px] w-full overflow-visible px-3" role="img" aria-label="Decorative equity trend">
                <defs><linearGradient id="equity-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8be5be" stopOpacity=".25"/><stop offset="1" stopColor="#8be5be" stopOpacity="0"/></linearGradient></defs>
                <path d="M0 46 C18 43 21 28 38 32 S57 41 72 33 S93 38 108 28 S130 35 146 21 S169 29 184 26 S205 32 222 16 S245 25 260 13 S282 18 300 5 L300 58 L0 58Z" fill="url(#equity-fill)" />
                <path d="M0 46 C18 43 21 28 38 32 S57 41 72 33 S93 38 108 28 S130 35 146 21 S169 29 184 26 S205 32 222 16 S245 25 260 13 S282 18 300 5" fill="none" stroke="#91edc6" strokeWidth="2" />
              </svg>
              <div className="absolute -bottom-3 right-8 rounded-xl border border-white/10 bg-[#111a20] px-3 py-2 shadow-xl"><span className="eyebrow !text-[8px]">FLOATING P/L</span><p className={`mt-1 mono-data text-xs ${(botState?.account?.floatingPL ?? 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{formatCurrency(botState?.account?.floatingPL ?? 0)}</p></div>
            </div>
            <div className="absolute left-1 top-12 h-4 w-4 rounded-full border border-emerald-100/30 bg-emerald-200/10 shadow-[0_0_25px_rgba(134,230,192,.25)] animate-[soft-pulse_3s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="EA Status"
          value={<span className={getStatusColor(botState?.bot?.status)}>{botState?.bot?.status ?? 'unknown'}</span>}
          subvalue={`Uptime: ${Math.floor((botState?.bot?.uptime ?? 0) / 3600)}h`}
          icon="◈"
        />
        <StatCard
          label="Trading Status"
          value={<span className={botState?.tradingEnabled ? 'text-green-400' : 'text-red-400'}>{botState?.tradingEnabled ? 'Enabled' : 'Disabled'}</span>}
          subvalue={`Positions: ${botState?.positionsCount ?? 0}`}
          icon="⌁"
        />
        <StatCard
          label="Account Balance"
          value={<span className="text-trading-text">{formatCurrency(botState?.account?.balance ?? 0)}</span>}
          subvalue={`Equity: ${formatCurrency(botState?.account?.equity ?? 0)}`}
          icon="$"
        />
        <StatCard
          label="Floating P/L"
          value={<span className={floatingPLColor}>{formatCurrency(botState?.account?.floatingPL ?? 0)}</span>}
          subvalue={`Today: ${formatCurrency(botState?.account?.todayPL ?? 0)}`}
          icon="↗"
        />
        <StatCard
          label="Margin Used"
          value={<span className="text-trading-text">{formatCurrency(botState?.account?.marginUsed ?? 0)}</span>}
          subvalue={`Level: ${formatPercent(botState?.account?.marginLevel ?? 0)}`}
          icon="⌄"
        />
        <StatCard
          label="Margin Available"
          value={<span className="text-trading-text">{formatCurrency(botState?.account?.marginFree ?? 0)}</span>}
          subvalue={`Total: ${formatCurrency(botState?.account?.margin ?? 0)}`}
          icon="▤"
        />
        <StatCard
          label="Strategy"
          value={<span className="text-trading-text font-mono">{botState?.strategyName || 'N/A'}</span>}
          subvalue={`Market: ${botState?.marketState ?? 'N/A'}`}
          icon="⚙"
        />
        <StatCard
          label="Connection"
          value={<span className={botState?.mt5?.connected ? 'text-green-400' : 'text-red-400'}>{botState?.mt5?.connected ? 'Connected' : 'Disconnected'}</span>}
          subvalue={`Server: ${botState?.mt5?.server ?? 'N/A'}`}
          icon="◎"
        />
      </div>

      <Card>
        <div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Account timeline</p><h2 className="mt-1 font-semibold text-white">Recent activity</h2></div><span className="eyebrow !text-[9px]">LAST 10 EVENTS</span></div>
        {(botState?.activityFeed?.length ?? 0) === 0 ? (
          <p className="text-trading-text-muted">No activity yet</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(botState?.activityFeed || []).slice(0, 10).map((item) => (
              <div
                key={item?.id ?? Math.random()}
                className={`p-3 rounded border ${
                  item?.severity === 'error'
                    ? 'border-red-500/30 bg-red-900/10'
                    : item?.severity === 'warning'
                    ? 'border-amber-500/30 bg-amber-900/10'
                    : item?.severity === 'success'
                    ? 'border-green-500/30 bg-green-900/10'
                    : 'border-blue-500/30 bg-blue-900/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{item?.title ?? 'N/A'}</p>
                    <p className="text-xs text-trading-text-muted mt-1">{item?.description ?? 'N/A'}</p>
                  </div>
                  <Badge
                    variant={
                      item?.severity === 'error'
                        ? 'danger'
                        : item?.severity === 'warning'
                        ? 'warning'
                        : item?.severity === 'success'
                        ? 'success'
                        : 'info'
                    }
                  >
                    {item?.type ?? 'INFO'}
                  </Badge>
                </div>
                <p className="text-xs text-trading-text-muted mt-2">{item?.timestamp ? formatDateTime(item.timestamp) : 'N/A'}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
