import React, { useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { Card, Button, Input, Select, LoadingSpinner } from '../components/UI';
import { useMutation } from '../hooks/useApi';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(false);

  const { mutate: saveSettings, loading: saveLoading } = useMutation('/settings', 'post');

  const [formData, setFormData] = useState(settings);

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    const result = await saveSettings(formData);
    if (result) {
      updateSettings(formData);
    }
    setIsLoading(false);
  };

  const handleReset = () => {
    setFormData(settings);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-trading-text-muted">Configure bot parameters and preferences</p>
      </div>

      <Card>
        <h2 className="text-lg font-bold mb-6">Risk Management</h2>

        <Input
          label="Risk Per Trade (%)"
          type="number"
          step="0.1"
          min="0.1"
          max="10"
          value={formData.riskPercentage}
          onChange={(e) => handleChange('riskPercentage', parseFloat(e.target.value))}
        />

        <Input
          label="Daily Loss Limit (USD)"
          type="number"
          step="10"
          value={formData.dailyLossLimit}
          onChange={(e) => handleChange('dailyLossLimit', parseFloat(e.target.value))}
        />

        <Input
          label="Max Drawdown (%)"
          type="number"
          step="0.5"
          min="1"
          max="50"
          value={formData.maxDrawdown}
          onChange={(e) => handleChange('maxDrawdown', parseFloat(e.target.value))}
        />

        <Input
          label="Max Positions"
          type="number"
          step="1"
          min="1"
          max="20"
          value={formData.maxPositions}
          onChange={(e) => handleChange('maxPositions', parseInt(e.target.value))}
        />
      </Card>

      <Card>
        <h2 className="text-lg font-bold mb-6">Strategy</h2>

        <Select
          label="Selected Strategy"
          value={formData.selectedStrategy}
          onChange={(e) => handleChange('selectedStrategy', e.target.value)}
          options={[
            { value: 'scalping', label: 'Scalping' },
            { value: 'swing', label: 'Swing Trading' },
            { value: 'trend', label: 'Trend Following' },
            { value: 'mean_reversion', label: 'Mean Reversion' },
            { value: 'grid', label: 'Grid Trading' },
          ]}
        />
      </Card>

      <Card>
        <h2 className="text-lg font-bold mb-6">Notifications</h2>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notificationsEnabled}
              onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Enable all notifications</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.soundAlertsEnabled}
              onChange={(e) => handleChange('soundAlertsEnabled', e.target.checked)}
              disabled={!formData.notificationsEnabled}
              className="w-4 h-4 disabled:opacity-50"
            />
            <span className="text-sm">Sound alerts</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.emailAlertsEnabled}
              onChange={(e) => handleChange('emailAlertsEnabled', e.target.checked)}
              disabled={!formData.notificationsEnabled}
              className="w-4 h-4 disabled:opacity-50"
            />
            <span className="text-sm">Email alerts</span>
          </label>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          isLoading={saveLoading || isLoading}
          disabled={saveLoading || isLoading}
          onClick={handleSave}
        >
          Save Settings
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={handleReset}
          disabled={saveLoading || isLoading}
        >
          Reset
        </Button>
      </div>
    </div>
  );
};
