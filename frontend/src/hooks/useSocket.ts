import { useEffect } from 'react';
import {
  initSocket,
  subscribeToUpdates,
  subscribeToPositions,
  subscribeToActivity,
  subscribeToAccount,
  disconnectSocket,
} from '../utils/socket';
import { useBotStore } from '../store/botStore';
import { useAuthStore } from '../store/authStore';

export const useSocket = () => {
  const user = useAuthStore((state) => state.user);
  const botStore = useBotStore();

  useEffect(() => {
    if (!user) return;

    // Get token from localStorage since user object may not have it
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('No auth token found in localStorage');
      return;
    }

    const socket = initSocket(token);

    const unsubscribeUpdates = subscribeToUpdates((data) => {
      botStore.updateBotStatus(data);
    });

    const unsubscribePositions = subscribeToPositions((data) => {
      botStore.updatePositions(data);
    });

    const unsubscribeActivity = subscribeToActivity((data) => {
      botStore.addActivityFeed(data);
    });

    const unsubscribeAccount = subscribeToAccount((data) => {
      botStore.updateAccount(data);
    });

    return () => {
      unsubscribeUpdates?.();
      unsubscribePositions?.();
      unsubscribeActivity?.();
      unsubscribeAccount?.();
      disconnectSocket();
    };
  }, [user, botStore]);
};
