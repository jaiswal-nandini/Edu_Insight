import { useState, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import { User, AIAnalysis } from '../types';

export function useDashboard(user: User | null) {
  const [studentData, setStudentData] = useState<any | null>(null);
  const [teacherData, setTeacherData] = useState<any | null>(null);
  const [adminData, setAdminData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      if (user.role === 'student') {
        const res = await fetch(`/api/dashboard/student/${user.id}`);
        const data = await res.json();
        if (res.ok) {
          setStudentData(data);
        } else {
          setError(data.error || 'Failed to fetch student metrics.');
        }
      } else if (user.role === 'teacher') {
        const res = await fetch(`/api/dashboard/teacher/${user.id}`);
        const data = await res.json();
        if (res.ok) {
          setTeacherData(data);
        } else {
          setError(data.error || 'Failed to fetch teacher metrics.');
        }
      } else if (user.role === 'admin') {
        const res = await fetch('/api/dashboard/admin');
        const data = await res.json();
        if (res.ok) {
          setAdminData(data);
        } else {
          setError(data.error || 'Failed to fetch admin metrics.');
        }
      }
    } catch (err) {
      console.error('[useDashboard] fetch error:', err);
      setError('Connection timeout or offline. Re-routing API payloads...');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    } else {
      setStudentData(null);
      setTeacherData(null);
      setAdminData(null);
    }
  }, [user, fetchDashboardStats]);

  useEffect(() => {
    if (!user) return;

    const handleDashboardUpdate = (payload?: { userId?: string }) => {
      console.log('[useDashboard] Socket event: dashboard_updated', payload);
      // For student/teacher, check if the update is relevant to them or if it's broad
      if (!payload || !payload.userId || payload.userId === user.id || user.role === 'admin') {
        fetchDashboardStats();
      }
    };

    const handleGlobalAlertsUpdate = () => {
      console.log('[useDashboard] Socket event: global_alerts_updated');
      fetchDashboardStats();
    };

    const handleAIAnalysisCompleted = (analysis: AIAnalysis) => {
      console.log('[useDashboard] Socket event: ai_analysis_completed', analysis);
      if (user.role === 'student' && analysis.studentId === user.id) {
        setStudentData((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            aiAnalysis: analysis,
          };
        });
      }
    };

    socket.on('dashboard_updated', handleDashboardUpdate);
    socket.on('global_alerts_updated', handleGlobalAlertsUpdate);
    socket.on('ai_analysis_completed', handleAIAnalysisCompleted);

    return () => {
      socket.off('dashboard_updated', handleDashboardUpdate);
      socket.off('global_alerts_updated', handleGlobalAlertsUpdate);
      socket.off('ai_analysis_completed', handleAIAnalysisCompleted);
    };
  }, [user, fetchDashboardStats]);

  return {
    studentData,
    teacherData,
    adminData,
    setStudentData,
    setTeacherData,
    setAdminData,
    fetchDashboardStats,
    loading,
    error,
  };
}
