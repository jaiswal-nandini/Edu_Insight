import { useState, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import { User, Complaint } from '../types';

export function useComplaints(user: User | null) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchComplaints = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/complaints?role=${user.role}&userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      } else {
        setError('Failed to fetch complaints.');
      }
    } catch (err) {
      console.error('[useComplaints] fetch error:', err);
      setError('Connection error loading complaints.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchComplaints();
    } else {
      setComplaints([]);
    }
  }, [user, fetchComplaints]);

  useEffect(() => {
    if (!user) return;

    const handleComplaintsUpdate = () => {
      console.log('[useComplaints] Socket event: complaints_updated');
      fetchComplaints();
    };

    socket.on('complaints_updated', handleComplaintsUpdate);

    return () => {
      socket.off('complaints_updated', handleComplaintsUpdate);
    };
  }, [user, fetchComplaints]);

  return {
    complaints,
    setComplaints,
    fetchComplaints,
    loading,
    error,
  };
}
