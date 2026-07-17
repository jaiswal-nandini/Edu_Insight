import { useState, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      } else {
        setError('Failed to fetch leaderboard ranks.');
      }
    } catch (err) {
      console.error('[useLeaderboard] fetch error:', err);
      setError('Connection error loading leaderboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    const handleLeaderboardUpdate = () => {
      console.log('[useLeaderboard] Socket event: leaderboard_updated');
      fetchLeaderboard();
    };

    socket.on('leaderboard_updated', handleLeaderboardUpdate);

    return () => {
      socket.off('leaderboard_updated', handleLeaderboardUpdate);
    };
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    fetchLeaderboard,
    loading,
    error,
  };
}
