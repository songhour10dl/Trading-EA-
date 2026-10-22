import React, { useState, useEffect } from 'react';
import { Card, Button, Input, LoadingSpinner, Badge } from '../components/UI';
import apiClient from '../utils/api';
import { useNotificationStore } from '../store/notificationStore';

export const EAManagementPage: React.FC = () => {
  const [eas, setEas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [displayName, setDisplayName] = useState('My Trading Bot');
  const [selectedEAKey, setSelectedEAKey] = useState<string | null>(null);
  const addToast = useNotificationStore((state) => state.addToast);

  const [creating, setCreating] = useState(false);

  const fetchEAs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ea');
      setEas(response.data || []);
    } catch (error) {
      console.error('Error fetching EAs:', error);
      addToast('Failed to fetch EA instances', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEAs();
  }, []);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    try {
      setCreating(true);
      const response = await apiClient.post('/ea', { displayName });
      const newEA = response.data;
      setShowCreateForm(false);
      setDisplayName('My Trading Bot');
      // Show the new API key immediately without a reload
      setEas((prev) => [newEA, ...prev]);
      setSelectedEAKey(newEA.id);
      addToast('EA instance created! Copy the API key below.', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to create EA instance', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this EA instance? This action cannot be undone.')) {
      return;
    }
    
    try {
      await apiClient.delete(`/ea/${id}`);
      addToast('EA instance deleted', 'success');
      fetchEAs();
    } catch (error) {
      addToast('Failed to delete EA instance', 'error');
    }
  };

  const handleRegenerateKey = async (id: string) => {
    if (!confirm('Regenerate API key? The old key will no longer work.')) {
      return;
    }

    try {
      const response = await apiClient.post(`/ea/${id}/regenerate-key`);
      addToast('API key regenerated successfully', 'success');
      setSelectedEAKey(response.data.apiKey);
      fetchEAs();
    } catch (error) {
      addToast('Failed to regenerate API key', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">EA Instances</h1>
          <p className="text-trading-text-muted">Manage your trading bot instances and API keys</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateForm(true)}
        >
          + Create New EA
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <h2 className="text-lg font-bold mb-4">Create New EA Instance</h2>
          <div className="space-y-4">
            <Input
              label="Display Name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter a name for your bot"
            />
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setDisplayName('My Trading Bot');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={creating}
                disabled={creating || !displayName.trim()}
                onClick={handleCreate}
              >
                Create
              </Button>
            </div>
          </div>
        </Card>
      )}

      {eas.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">No EA Instances</h3>
            <p className="text-trading-text-muted mb-6">Create your first EA instance to get started</p>
            <Button variant="primary" onClick={() => setShowCreateForm(true)}>
              Create EA Instance
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {eas.map((ea) => (
            <Card key={ea.id}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{ea.displayName}</h3>
                    <p className="text-sm text-trading-text-muted">
                      Created: {new Date(ea.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={ea.botState?.status === 'RUNNING' ? 'success' : 'secondary'}>
                    {ea.botState?.status || 'DISCONNECTED'}
                  </Badge>
                </div>

                <div className="bg-slate-900/50 border border-trading-border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold">API Key</label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRegenerateKey(ea.id)}
                      >
                        Regenerate
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSelectedEAKey(ea.id);
                          copyToClipboard(ea.apiKey || 'Key not available');
                        }}
                      >
                        Copy Key
                      </Button>
                    </div>
                  </div>
                  <div className="font-mono text-sm bg-slate-950 p-3 rounded break-all">
                    {selectedEAKey === ea.id ? ea.apiKey : '••••••••••••••••••••••••••••••••'}
                  </div>
                  <p className="text-xs text-trading-text-muted mt-2">
                    Use this API key in your MT5 EA configuration
                  </p>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/50 rounded p-4">
                  <p className="text-sm font-semibold mb-2">📋 MT5 EA Configuration</p>
                  <div className="text-xs space-y-1 text-trading-text-muted font-mono">
                    <div>API_URL: http://localhost:5000</div>
                    <div>API_KEY: {selectedEAKey === ea.id ? ea.apiKey : '[Click Copy Key above]'}</div>
                  </div>
                </div>

                {ea.botState && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-slate-800/30 p-3 rounded">
                      <p className="text-trading-text-muted text-xs mb-1">Status</p>
                      <p className="font-semibold">{ea.botState.status || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-800/30 p-3 rounded">
                      <p className="text-trading-text-muted text-xs mb-1">Balance</p>
                      <p className="font-semibold">${(ea.botState.accountBalance || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-800/30 p-3 rounded">
                      <p className="text-trading-text-muted text-xs mb-1">Equity</p>
                      <p className="font-semibold">${(ea.botState.accountEquity || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-800/30 p-3 rounded">
                      <p className="text-trading-text-muted text-xs mb-1">Positions</p>
                      <p className="font-semibold">{ea.botState.openPositionsCount || 0}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-trading-border">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(ea.id)}
                  >
                    Delete Instance
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
