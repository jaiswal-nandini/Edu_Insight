/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, LayoutDashboard, BookOpen, Trophy, Sparkles, 
  MessageSquare, Award, Users, Bell, LogOut, Calendar, 
  ChevronRight, AlertTriangle, TrendingUp, Compass, Loader2,
  CheckCircle, ShieldAlert, Circle, RefreshCw, Sun, Moon, Search
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, LineChart, Line, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, PieChart, Pie, Cell 
} from 'recharts';

import AuthLayout from './components/AuthLayout';
import DashboardCards from './components/DashboardCards';
import ClassroomManager from './components/ClassroomManager';
import Leaderboard from './components/Leaderboard';
import StudentManager from './components/StudentManager';
import MarksManager from './components/MarksManager';
import ComplaintSystem from './components/ComplaintSystem';
import AIInsightsView from './components/AIInsightsView';
import UserProfilePage from './components/UserProfilePage';
import CommandPalette from './components/CommandPalette';
import AIAssistantChat from './components/AIAssistantChat';
import { User, Notification } from './types';
import { useSocket } from './hooks/useSocket';
import { useNotifications } from './hooks/useNotifications';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useDashboard } from './hooks/useDashboard';
import { useRealtime } from './hooks/useRealtime';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [globalStudents, setGlobalStudents] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Hook state managers
  const { isConnected } = useSocket();
  const { notifications, setNotifications } = useNotifications(user?.id);
  const { leaderboard } = useLeaderboard();
  const {
    studentData,
    teacherData,
    adminData,
    setStudentData,
    setTeacherData,
    setAdminData,
    fetchDashboardStats,
    loading,
    error,
  } = useDashboard(user);

  // Derive classrooms list for dynamic room registrations
  const classrooms =
    user?.role === 'student'
      ? studentData?.classrooms || []
      : user?.role === 'teacher'
      ? teacherData?.classrooms || []
      : [];

  // Core end-to-end Socket room coordination
  useRealtime(user, classrooms);

  // Persist theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('aura_theme') as 'dark' | 'light' || 'dark';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('aura_theme', theme);
  }, [theme]);

  // Load students for Search palette
  useEffect(() => {
    if (user && (user.role === 'teacher' || user.role === 'admin')) {
      fetch('/api/admin/users')
        .then(res => res.json())
        .then(data => {
          if (data.users) {
            setGlobalStudents(data.users.filter((u: any) => u.role === 'student'));
          }
        })
        .catch(console.error);
    }
  }, [user]);

  // Command palette keyboard trigger
  useEffect(() => {
    const handleSearchKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleSearchKey);
    return () => window.removeEventListener('keydown', handleSearchKey);
  }, []);

  // Lightweight router mechanism
  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    handlePathRouting(path);
  };

  const handlePathRouting = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0 || parts[0] === 'dashboard') {
      setActiveTab('dashboard');
      setSelectedClassroomId(null);
      setSelectedStudentId(null);
    } else if (parts[0] === 'classrooms') {
      setActiveTab('classrooms');
      setSelectedClassroomId(null);
    } else if (parts[0] === 'classroom' && parts[1]) {
      setActiveTab('classroom-detail');
      setSelectedClassroomId(parts[1]);
    } else if (parts[0] === 'students') {
      setActiveTab('students');
      setSelectedStudentId(null);
    } else if (parts[0] === 'student' && parts[1]) {
      setActiveTab('student-profile');
      setSelectedStudentId(parts[1]);
    } else if (parts[0] === 'leaderboard') {
      setActiveTab('leaderboard');
    } else if (parts[0] === 'marks') {
      setActiveTab('marks');
    } else if (parts[0] === 'complaints') {
      setActiveTab('complaints');
    } else if (parts[0] === 'ai_insights') {
      setActiveTab('ai_insights');
    } else if (parts[0] === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
  };

  useEffect(() => {
    const onPopState = () => {
      handlePathRouting(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    if (user) {
      handlePathRouting(window.location.pathname);
    }
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [user]);

  // Persist session locally
  useEffect(() => {
    const savedUser = localStorage.getItem('aura_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('aura_user');
      }
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('aura_user', JSON.stringify(loggedInUser));
    navigateTo('/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('aura_user');
    setStudentData(null);
    setTeacherData(null);
    setAdminData(null);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return <AuthLayout onLoginSuccess={handleLoginSuccess} />;
  }

  // Calculate unread notifications
  const unreadNotifs = notifications.filter(n => n.status === 'unread');

  // Chart cell colors
  const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 relative transition-colors duration-300">
      
      {/* Background radial elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 dark:bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-600/5 dark:bg-violet-600/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-900/60 flex flex-col justify-between p-6 z-10 sticky top-0 h-screen transition-colors duration-300">
        <div className="space-y-8">
          
          {/* Logo */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <GraduationCap className="h-5.5 w-5.5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-cyan-600 to-blue-500 dark:from-cyan-400 dark:to-blue-200 bg-clip-text text-transparent uppercase font-display">
                EduInsight
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 w-fit">
              <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isConnected ? '🟢 Live' : '🔴 Offline'}
              </span>
            </div>
          </div>

          {/* Navigation links based on Role */}
          <nav className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-3">Principal Space</span>
            
            {/* Common dashboard link */}
            <button
              onClick={() => navigateTo('/dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview Portal
            </button>

            {/* Student Specific navigation */}
            {user.role === 'student' && (
              <>
                <button
                  onClick={() => navigateTo('/classrooms')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'classrooms' || activeTab === 'classroom-detail'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  My Classrooms
                </button>
                <button
                  onClick={() => navigateTo('/leaderboard')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                  Ranks Leaderboard
                </button>
                <button
                  onClick={() => navigateTo('/ai_insights')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'ai_insights'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Study Counselor
                </button>
                <button
                  onClick={() => navigateTo('/complaints')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'complaints'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Submit Feedback
                </button>
              </>
            )}

            {/* Teacher Specific navigation */}
            {user.role === 'teacher' && (
              <>
                <button
                  onClick={() => navigateTo('/classrooms')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'classrooms' || activeTab === 'classroom-detail'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Manage Classrooms
                </button>
                <button
                  onClick={() => navigateTo('/leaderboard')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                  Class Leaderboard
                </button>
                <button
                  onClick={() => navigateTo('/marks')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'marks'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Award className="h-4 w-4" />
                  Manage Marks
                </button>
                <button
                  onClick={() => navigateTo('/students')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'students' || activeTab === 'student-profile'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Students Explorer
                </button>
                <button
                  onClick={() => navigateTo('/complaints')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'complaints'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Feedback Logs
                </button>
              </>
            )}

            {/* Admin Specific navigation */}
            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => navigateTo('/classrooms')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'classrooms' || activeTab === 'classroom-detail'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Manage Classrooms
                </button>
                <button
                  onClick={() => navigateTo('/students')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'students' || activeTab === 'student-profile'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Students Registry
                </button>
                <button
                  onClick={() => navigateTo('/complaints')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'complaints'
                      ? 'bg-cyan-500/5 dark:bg-cyan-500/10 border-l-[3px] border-cyan-500 text-cyan-600 dark:text-cyan-400 font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Compliancy Center
                </button>
              </>
            )}

          </nav>
        </div>

        {/* User profile bottom item */}
        <div className="border-t border-slate-200 dark:border-slate-900 pt-4 flex items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5 truncate max-w-[130px]">
            <h5 className="font-extrabold text-slate-800 dark:text-white truncate">{user.name}</h5>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">{user.role}</span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

      </aside>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="flex-1 flex flex-col z-10 overflow-x-hidden">
        
        {/* HEADER */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-900/40 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-20 transition-all duration-300">
          <div>
            <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 tracking-widest uppercase">
              {activeTab === 'dashboard' ? 'Overview' : activeTab.replace('_', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Quick search button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all duration-200"
            >
              <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <span className="hidden sm:inline font-semibold">Search...</span>
              <kbd className="hidden sm:inline text-[9px] font-mono bg-white dark:bg-slate-950 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase">
                ⌘K
              </kbd>
            </button>

            {/* Light/Dark mode switcher */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all duration-200"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-500" />
              )}
            </button>
            
            {/* Sync trigger button */}
            <button 
              onClick={fetchDashboardStats} 
              disabled={loading}
              title="Sync Data"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all duration-200 disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Notification drop system */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer relative transition-all duration-200"
              >
                <Bell className="h-3.5 w-3.5" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-cyan-500 rounded-full animate-ping" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 backdrop-blur-xl bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-2xl p-4 space-y-3 z-50 transition-colors duration-300">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Platform Notifications</span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-cyan-600 dark:text-cyan-400 font-bold">{unreadNotifs.length} Unread</span>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => handleMarkRead(notif.id)}
                        className={`p-2.5 rounded-xl border text-[11px] leading-relaxed cursor-pointer transition-all ${
                          notif.status === 'unread'
                            ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-800 dark:text-cyan-200 font-bold'
                            : 'bg-slate-50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {notif.message}
                        <span className="block text-[8px] text-slate-400 dark:text-slate-500 mt-1">{new Date(notif.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-center py-4 text-[11px] text-slate-500">No active alerts or notices.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User name card */}
            <div className="hidden sm:flex items-center gap-2 p-1 pr-3 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-850 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors duration-300">
              <div className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black">
                {user.name.charAt(0)}
              </div>
              <span className="max-w-[100px] truncate">{user.name}</span>
            </div>

          </div>
        </header>

        {/* WORKSPACE VIEWS */}
        <div className="p-8 space-y-8 flex-1 overflow-y-auto z-10">
          
          {loading && !studentData && !teacherData && !adminData && (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3 font-semibold text-xs text-slate-400">
              <Loader2 className="animate-spin h-6 w-6 text-cyan-400" />
              Syncing student-teacher records with cloud core...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. DASHBOARD OVERVIEW VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              
              {/* Dynamic Welcome */}
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                  Welcome Back, {user.name}
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 tracking-widest">
                    {user.role}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aura Analytics Academic Engine is online and tracking active courses.</p>
              </div>

              {/* STAT CARDS SECTION */}
              {user.role === 'student' && studentData && (
                <DashboardCards role="student" data={studentData} />
              )}
              {user.role === 'teacher' && teacherData && (
                <DashboardCards role="teacher" data={teacherData} />
              )}
              {user.role === 'admin' && adminData && (
                <DashboardCards role="admin" data={adminData} />
              )}

              {/* VISUAL CHARTS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Chart 1: Left */}
                {user.role === 'student' && studentData && (
                  <div className="backdrop-blur-md bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-cyan-500 dark:text-cyan-400" /> Grade Progression Timeline
                    </h3>
                    <div className="h-72">
                      {studentData.marks?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={studentData.marks}>
                            <defs>
                              <linearGradient id="colorMarks" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                            <XAxis dataKey="examType" stroke="#64748b" style={{ fontSize: '10px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '10px' }} domain={[0, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#020617' : '#ffffff', border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: '12px', color: theme === 'dark' ? '#ffffff' : '#0f172a' }} />
                            <Area type="monotone" dataKey="marksObtained" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMarks)" strokeWidth={2} name="Score" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                          No assessment logs registered yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {user.role === 'teacher' && teacherData && (
                  <div className="backdrop-blur-md bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                      <Award className="h-4 w-4 text-cyan-500 dark:text-cyan-400" /> Class Grade Averages
                    </h3>
                    <div className="h-72">
                      {teacherData.classrooms?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={teacherData.classrooms}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                            <XAxis dataKey="className" stroke="#64748b" style={{ fontSize: '10px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#020617' : '#ffffff', border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: '12px', color: theme === 'dark' ? '#ffffff' : '#0f172a' }} />
                            <Bar dataKey="studentCount" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Enrolled Students">
                              {teacherData.classrooms.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                          No active classes.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {user.role === 'admin' && adminData && (
                  <div className="backdrop-blur-md bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-500 dark:text-cyan-400" /> Platform Infrastructure Size
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Students', count: adminData.metrics.totalStudents },
                          { name: 'Faculty', count: adminData.metrics.totalTeachers },
                          { name: 'Classes', count: adminData.metrics.totalClasses },
                          { name: 'Feedback', count: adminData.metrics.totalComplaints }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                          <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
                          <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                          <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#020617' : '#ffffff', border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: '12px', color: theme === 'dark' ? '#ffffff' : '#0f172a' }} />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Platform Count">
                            <Cell fill="#06b6d4" />
                            <Cell fill="#8b5cf6" />
                            <Cell fill="#10b981" />
                            <Cell fill="#ef4444" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Chart 2: Right */}
                {user.role === 'student' && studentData && (
                  <div className="backdrop-blur-md bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-violet-500 dark:text-violet-400" /> Classroom Attendance
                    </h3>
                    <div className="h-72">
                      {studentData.attendance?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={studentData.attendance.map((a: any) => ({
                            classroomId: a.classroomId,
                            percentage: Math.round((a.present / a.total) * 100)
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                            <XAxis dataKey="classroomId" stroke="#64748b" style={{ fontSize: '10px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '10px' }} domain={[0, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#020617' : '#ffffff', border: theme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0', borderRadius: '12px', color: theme === 'dark' ? '#ffffff' : '#0f172a' }} />
                            <Bar dataKey="percentage" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Attendance %" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                          No attendance logs logged.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {user.role === 'teacher' && teacherData && (
                  <div className="backdrop-blur-md bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500 dark:text-rose-400" /> Academic Risk Distribution
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Risk Flags', value: teacherData.metrics.atRiskStudents || 0 },
                              { name: 'Standard / Safe', value: Math.max(0, teacherData.metrics.totalStudents - teacherData.metrics.atRiskStudents) || 1 }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#ef4444" />
                            <Cell fill="#10b981" />
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {user.role === 'admin' && adminData && (
                  <div className="backdrop-blur-md bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500 dark:text-rose-400" /> Safety Alerts & Global Warnings
                    </h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {adminData.globalAlerts?.map((alert: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 text-xs flex items-center justify-between transition-colors duration-200">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{alert.message}</span>
                          </div>
                          <span className="text-[10px] bg-red-950/40 text-red-400 border border-red-950 px-2 py-0.5 rounded uppercase font-bold font-mono">
                            {alert.severity}
                          </span>
                        </div>
                      ))}
                      {(!adminData.globalAlerts || adminData.globalAlerts.length === 0) && (
                        <p className="text-center py-12 text-slate-500">All campus metrics are green. No alerts!</p>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Row Activity logs for Admins/Teachers */}
              {(user.role === 'admin' || user.role === 'teacher') && (
                <div className="backdrop-blur-md bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Auditing Log Trail</h3>
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] text-slate-400 dark:text-slate-500 uppercase border-b border-slate-200 dark:border-slate-850">
                          <th className="py-2">User Index</th>
                          <th className="py-2">Operation Action</th>
                          <th className="py-2">Operation details</th>
                          <th className="py-2 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-850/60 text-slate-700 dark:text-slate-300">
                        {user.role === 'admin' && adminData?.activityLogs?.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-950/10">
                            <td className="py-2.5 font-bold">{log.userId}</td>
                            <td className="py-2.5 text-cyan-600 dark:text-cyan-400 font-semibold">{log.action}</td>
                            <td className="py-2.5 font-medium">{log.details}</td>
                            <td className="py-2.5 text-right text-slate-400 dark:text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                        {user.role === 'teacher' && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-500">Continuous system status: Operating normally. Live API synchronization active.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* 2. CLASSROOM MANAGER TAB */}
          {(activeTab === 'classrooms' || activeTab === 'classroom-detail') && (
            <ClassroomManager 
              user={user} 
              onRefreshStats={fetchDashboardStats} 
              initialClassroomId={selectedClassroomId}
              onSelectClassroom={(id) => id ? navigateTo(`/classroom/${id}`) : navigateTo('/classrooms')}
            />
          )}

          {/* 3. LEADERBOARD TAB */}
          {activeTab === 'leaderboard' && (
            <Leaderboard leaderboard={leaderboard} />
          )}

          {/* 4. MARKS MANAGER TAB */}
          {activeTab === 'marks' && (
            <MarksManager user={user} onRefreshStats={fetchDashboardStats} />
          )}

          {/* 5. STUDENTS EXPLORER TAB */}
          {activeTab === 'students' && (
            <StudentManager 
              user={user} 
              onSelectStudent={(id) => id ? navigateTo(`/student/${id}`) : navigateTo('/students')}
            />
          )}

          {/* DEDICATED STUDENT PROFILE TAB */}
          {activeTab === 'student-profile' && selectedStudentId && (
            <UserProfilePage 
              profileId={selectedStudentId} 
              viewerRole={user.role} 
              onBack={() => navigateTo('/students')} 
            />
          )}

          {/* 6. AI CONSELOR TAB */}
          {activeTab === 'ai_insights' && (
            <AIInsightsView user={user} initialAnalysis={studentData?.aiAnalysis || null} />
          )}

          {/* 7. COMPLAINTS SYSTEM TAB */}
          {activeTab === 'complaints' && (
            <ComplaintSystem user={user} onRefreshStats={fetchDashboardStats} />
          )}

        </div>

      </main>

      {/* Floating global search modal */}
      <CommandPalette 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        user={user}
        classrooms={classrooms}
        students={globalStudents}
        onNavigate={navigateTo}
        onSync={fetchDashboardStats}
      />

      {/* Floating AI Chat widget */}
      <AIAssistantChat user={user} />

    </div>
  );
}
