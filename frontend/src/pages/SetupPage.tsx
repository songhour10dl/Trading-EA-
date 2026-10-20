import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, LoadingSpinner } from '../components/UI';
import { useMutation } from '../hooks/useApi';
import apiClient from '../utils/api';

export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('My Trading Bot');
  const [isChecking, setIsChecking] = useState(true);
  const [hasEA, setHasEA] = useState(false);
  const { mutate: createEA, loading } = useMutation('/ea', 'post');

  useEffect(() => {
    checkExistingEA();
  }, []);

  const checkExistingEA = async () => {
    try {
      const response = await apiClient.get('/ea');
      if (response.data && response.data.length > 0) {
        setHasEA(true);
        // Redirect to dashboard if EA already exists
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (error) {
      console.error('Error checking EA:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreate = async () => {
    const result = await createEA({ displayName });
    if (result) {
      navigate('/dashboard');
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-trading-bg flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (hasEA) {
    return (
      <div className="min-h-screen bg-trading-bg flex items-center justify-center">
        <Card>
          <div className="text-center py-8 px-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">EA Instance Found</h2>
            <p className="text-trading-text-muted">Redirecting to dashboard...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-trading-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🤖</div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Trading Bot</h1>
            <p className="text-trading-text-muted">Let's set up your EA instance</p>
          </div>

          <div className="space-y-4">
            <Input
              label="Bot Name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter a name for your bot"
            />

            <div className="bg-blue-900/20 border border-blue-500/50 rounded p-4 text-sm">
              <p className="font-semibold mb-2">What happens next?</p>
              <ul className="space-y-1 text-trading-text-muted">
                <li>• An EA instance will be created</li>
                <li>• You'll get an API key for MT5 integration</li>
                <li>• Default settings will be initialized</li>
                <li>• You can start configuring your bot</li>
              </ul>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={loading}
              disabled={loading || !displayName.trim()}
              onClick={handleCreate}
            >
              Create EA Instance
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
