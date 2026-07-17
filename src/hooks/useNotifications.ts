import { useState, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import { Notification } from '../types';

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/notifications/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else {
        setError('Failed to load notifications.');
      }
    } catch (err) {
      console.error('[useNotifications] fetch error:', err);
      setError('Connection error loading notifications.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (!userId) return;

    const handleNewNotification = (notif: Notification) => {
      console.log('[useNotifications] Socket event: new_notification', notif);
      if (notif.userId === userId) {
        setNotifications((prev) => {
          // Prevent duplicates
          if (prev.some((n) => n.id === notif.id)) return prev;
          return [notif, ...prev];
        });
      }
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [userId]);

  return {
    notifications,
    setNotifications,
    fetchNotifications,
    loading,
    error,
  };
}
