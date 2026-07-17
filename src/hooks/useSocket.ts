import { useState, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      console.log('[useSocket] Connected');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('[useSocket] Disconnected');
    };

    const onConnectError = (err: Error) => {
      console.error('[useSocket] Connect Error:', err);
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Initial check
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  const connect = useCallback(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socket.connected) {
      socket.disconnect();
    }
  }, []);

  return {
    socket,
    isConnected,
    connect,
    disconnect,
  };
}
