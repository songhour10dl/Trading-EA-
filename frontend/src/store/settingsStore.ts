import { create } from 'zustand';
import { Settings } from '../types/index';

interface SettingsStore {
  settings: Settings;
  updateSettings: (data: Partial<Settings>) => void;
  loadSettings: () => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  riskPercentage: 2,
  maxPositions: 5,
  maxDrawdown: 20,
  selectedStrategy: 'scalping',
  notificationsEnabled: true,
  soundAlertsEnabled: true,
  emailAlertsEnabled: false,
  dailyLossLimit: 500,
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,

  updateSettings: (data) =>
    set((state) => {
      const updated = { ...state.settings, ...data };
      localStorage.setItem('botSettings', JSON.stringify(updated));
      return { settings: updated };
    }),

  loadSettings: () => {
    const stored = localStorage.getItem('botSettings');
    if (stored) {
      try {
        set({ settings: JSON.parse(stored) });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  },

  resetSettings: () => {
    localStorage.removeItem('botSettings');
    set({ settings: defaultSettings });
  },
}));
