import React, { useEffect, useState } from 'react';
import { useBotStore } from '../store/botStore';
import { Card, Table, Button, Badge, Modal, Input } from '../components/UI';
import { formatCurrency, formatPercent, getDirectionColor, calculateDuration } from '../utils/formatting';
import { useMutation } from '../hooks/useApi';
import { ConfirmDialog } from '../components/Common';
import apiClient from '../utils/api';

export const PositionsPage: React.FC = () => {
  const positions = useBotStore((state) => state.positions);
  const updatePositions = useBotStore((state) => state.updatePositions);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [newSL, setNewSL] = useState('');
  const [newTP, setNewTP] = useState('');
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [positionToClose, setPositionToClose] = useState<string | null>(null);
  const [commandMessage, setCommandMessage] = useState<string | null>(null);

  const { mutate: closePosition, loading: closeLoading } = useMutation(`/positions/close`, 'post');
  const { mutate: modifyPosition, loading: modifyLoading } = useMutation(`/positions/modify`, 'post');

  useEffect(() => {
    let active = true;
    const refreshPositions = async () => {
      try {
        setRefreshing(true);
        const response = await apiClient.get('/bot/status');
        if (active) updatePositions(response.data?.data?.positions ?? []);
      } catch (error) {
        console.error('Failed to refresh positions:', error);
      } finally {
        if (active) setRefreshing(false);
      }
    };

    refreshPositions();
    const timer = window.setInterval(refreshPositions, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [updatePositions]);

  const handleModify = async () => {
    if (!selectedPosition || !newSL || !newTP) return;
    const success = await modifyPosition({
      ticket: selectedPosition.ticket,
      stopLoss: parseFloat(newSL),
      takeProfit: parseFloat(newTP),
    });
    if (success) {
      setCommandMessage('Modify command queued. The EA applies it on its next command poll.');
      setIsModifyOpen(false);
      setNewSL('');
      setNewTP('');
    }
  };

  const handleClose = async () => {
    if (!positionToClose) return;
    const success = await closePosition({ ticket: positionToClose });
    if (success) {
      setCommandMessage('Close command queued. The position closes when the EA receives it.');
      setCloseConfirm(false);
      setPositionToClose(null);
    }
  };

  const tableRows = positions.map((pos) => [
    <span className="font-mono text-sm">{pos?.symbol ?? 'N/A'}</span>,
    <span className={`${getDirectionColor(pos?.direction)} font-bold`}>{pos?.direction ?? 'N/A'}</span>,
    <span className="font-mono text-sm">{pos?.ticket ?? 'N/A'}</span>,
    <span className="text-xs">{pos?.strategy ?? 'N/A'}</span>,
    <span className="font-mono">{formatCurrency(pos?.entryPrice ?? 0, 5)}</span>,
    <span className="font-mono">{formatCurrency(pos?.currentPrice ?? 0, 5)}</span>,
    <span className="font-mono">{pos?.lotSize ?? 0}</span>,
    <span className="font-mono text-sm">{formatCurrency(pos?.stopLoss ?? 0, 5)}</span>,
    <span className="font-mono text-sm">{formatCurrency(pos?.takeProfit ?? 0, 5)}</span>,
    <span className={(pos?.floatingPL ?? 0) >= 0 ? 'text-green-400 font-mono' : 'text-red-400 font-mono'}>
      {formatCurrency(pos?.floatingPL ?? 0)} ({formatPercent(pos?.floatingPLPercent ?? 0)})
    </span>,
    <span className="text-xs">{pos?.openTime ? calculateDuration(pos.openTime) : 'N/A'}</span>,
    <span className="text-xs">{formatPercent(pos?.risk ?? 0, 3)}</span>,
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setSelectedPosition(pos);
          setNewSL(pos?.stopLoss?.toString() ?? '');
          setNewTP(pos?.takeProfit?.toString() ?? '');
          setIsModifyOpen(true);
        }}
      >
        Modify
      </Button>
      <Button
        size="sm"
        variant="danger"
        onClick={() => {
          setPositionToClose(pos?.ticket ?? null);
          setCloseConfirm(true);
        }}
      >
        Close
      </Button>
    </div>,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Live Positions</h1>
        <p className="text-trading-text-muted">
          {positions.length} open position(s){refreshing ? ' · refreshing' : ''}
        </p>
        {commandMessage && <p className="text-sm text-amber-300 mt-2">{commandMessage}</p>}
      </div>

      {positions.length === 0 ? (
        <Card>
          <p className="text-trading-text-muted text-center py-8">No open positions</p>
        </Card>
      ) : (
        <Card>
          <Table
            headers={['Symbol', 'Direction', 'Ticket', 'Strategy', 'Entry', 'Current', 'Lot', 'SL', 'TP', 'Floating P/L', 'Duration', 'Risk %', 'Actions']}
            rows={tableRows}
          />
        </Card>
      )}

      <Modal isOpen={isModifyOpen} onClose={() => setIsModifyOpen(false)} title="Modify Position">
        {selectedPosition && (
          <div>
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/50 rounded text-sm">
              <p className="font-mono">{selectedPosition?.symbol ?? 'N/A'}</p>
              <p className="text-trading-text-muted text-xs mt-1">Ticket: {selectedPosition?.ticket ?? 'N/A'}</p>
            </div>

            <Input
              label="Stop Loss"
              type="number"
              step="0.00001"
              value={newSL}
              onChange={(e) => setNewSL(e.target.value)}
              placeholder="Enter new SL"
            />

            <Input
              label="Take Profit"
              type="number"
              step="0.00001"
              value={newTP}
              onChange={(e) => setNewTP(e.target.value)}
              placeholder="Enter new TP"
            />

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setIsModifyOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="success"
                isLoading={modifyLoading}
                disabled={modifyLoading || !newSL || !newTP}
                onClick={handleModify}
              >
                Update
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={closeConfirm}
        title="Close Position"
        message={`Are you sure you want to close position ${positionToClose}?`}
        onConfirm={handleClose}
        onCancel={() => setCloseConfirm(false)}
        isLoading={closeLoading}
      />
    </div>
  );
};
