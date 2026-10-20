import io, { Socket } from 'socket.io-client';

const SOCKET_IO_URL = import.meta.env.VITE_SOCKET_IO_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  socket = io(SOCKET_IO_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const subscribeToUpdates = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('botUpdate', callback);
    return () => socket?.off('botUpdate', callback);
  }
};

export const subscribeToPositions = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('positionsUpdate', callback);
    return () => socket?.off('positionsUpdate', callback);
  }
};

export const subscribeToActivity = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('activityFeed', callback);
    return () => socket?.off('activityFeed', callback);
  }
};

export const subscribeToAccount = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('accountUpdate', callback);
    return () => socket?.off('accountUpdate', callback);
  }
};

export const emit = (event: string, data: any) => {
  socket?.emit(event, data);
};
