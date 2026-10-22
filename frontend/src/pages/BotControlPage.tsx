import React, { useState } from 'react';
import { useBotStore } from '../store/botStore';
import { Card, Button, StatCard, Badge, LoadingSpinner } from '../components/UI';
import { useMutation } from '../hooks/useApi';
import { ConfirmDialog } from '../components/Common';
import { formatNumber } from '../utils/formatting';

export const BotControlPage: React.FC = () => {
  const botState = useBotStore();
  const [confirmAction, setConfirmAction] = useState<{
    action: string;
    title: string;
    message: string;
  } | null>(null);

  const { mutate: pauseBot, loading: pauseLoading } = useMutation('/bot/pause', 'post');
  const { mutate: resumeBot, loading: resumeLoading } = useMutation('/bot/resume', 'post');
  const { mutate: stopBot, loading: stopLoading } = useMutation('/bot/stop', 'post');
  const { mutate: emergencyStop, loading: emergencyLoading } = useMutation('/bot/emergency-stop', 'post');

  const handleAction = async (action: string) => {
    let result = null;
    switch (action) {
      case 'pause':
        result = await pauseBot({});
        break;
      case 'resume':
        result = await resumeBot({});
        break;
      case 'stop':
        result = await stopBot({});
        break;
      case 'emergency':
        result = await emergencyStop({});
        break;
    }
    if (result) {
      setConfirmAction(null);
    }
  };

  const isRunning = botState?.bot?.status === 'running';
  const isPaused = botState?.bot?.status === 'paused';
  const isStopped = botState?.bot?.status === 'stopped';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Bot Control</h1>
        <p className="text-trading-text-muted">Manage EA execution and emergency actions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          label="Current Status"
          value={<span className={botState?.bot?.status === 'running' ? 'text-green-400' : 'text-red-400'}>{botState?.bot?.status?.toUpperCase() ?? 'UNKNOWN'}</span>}
          subvalue={`Version: ${botState?.bot?.version ?? 'N/A'}`}
          icon="🤖"
        />
        <StatCard
          label="Trading Enabled"
          value={botState?.tradingEnabled ? 'YES' : 'NO'}
          subvalue={`Positions: ${botState?.positionsCount ?? 0}`}
          icon="📊"
        />
      </div>

      <Card>
        <h2 className="text-lg font-bold mb-6">Bot Commands</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Normal Operations</h3>

            <Button
              variant="success"
              className="w-full"
              disabled={isRunning || pauseLoading || resumeLoading}
              isLoading={resumeLoading}
              onClick={() =>
                setConfirmAction({
                  action: 'resume',
                  title: 'Resume Bot',
                  message: 'Resume trading bot?',
                })
              }
            >
              Resume Bot
            </Button>

            <Button
              variant="success"
              className="w-full"
              disabled={!isRunning || pauseLoading || resumeLoading}
              isLoading={pauseLoading}
              onClick={() =>
                setConfirmAction({
                  action: 'pause',
                  title: 'Pause Bot',
                  message: 'Pause trading bot? Existing positions will remain open.',
                })
              }
            >
              Pause Bot
            </Button>

            <Button
              variant="secondary"
              className="w-full"
              disabled={isStopped || stopLoading}
              isLoading={stopLoading}
              onClick={() =>
                setConfirmAction({
                  action: 'stop',
                  title: 'Stop Bot',
                  message: 'Stop trading bot? This will close all pending positions.',
                })
              }
            >
              Stop Bot
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-red-400">Emergency Actions</h3>

            <Button
              variant="danger"
              className="w-full"
              isLoading={emergencyLoading}
              onClick={() =>
                setConfirmAction({
                  action: 'emergency',
                  title: 'Emergency Stop',
                  message: 'This will immediately close ALL positions and stop the bot. This action cannot be undone. Continue?',
                })
              }
            >
              🚨 Emergency Stop
            </Button>

            <p className="text-xs text-red-400 mt-2">
              Emergency stop will close all positions immediately at market price.
            </p>
          </div>
        </div>

        <div className="border-t border-trading-border pt-6">
          <h3 className="font-semibold mb-4">Advanced Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div className="bg-slate-800/30 p-3 rounded">
              <p className="text-trading-text-muted text-xs mb-1">EA Version</p>
              <p>{botState?.bot?.version ?? 'N/A'}</p>
            </div>
            <div className="bg-slate-800/30 p-3 rounded">
              <p className="text-trading-text-muted text-xs mb-1">Last Update</p>
              <p className="text-xs">{botState?.bot?.lastUpdate ? new Date(botState.bot.lastUpdate).toLocaleString() : 'N/A'}</p>
            </div>
            <div className="bg-slate-800/30 p-3 rounded">
              <p className="text-trading-text-muted text-xs mb-1">MT5 Server</p>
              <p>{botState?.mt5?.server || 'N/A'}</p>
            </div>
            <div className="bg-slate-800/30 p-3 rounded">
              <p className="text-trading-text-muted text-xs mb-1">Account</p>
              <p>{botState?.mt5?.accountNumber || 'N/A'}</p>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        onConfirm={() => confirmAction && handleAction(confirmAction.action)}
        onCancel={() => setConfirmAction(null)}
        isLoading={pauseLoading || resumeLoading || stopLoading || emergencyLoading}
      />
    </div>
  );
};
