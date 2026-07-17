/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, Trash2, Archive, Users, RefreshCw, 
  BookOpen, Search, LogIn, ChevronRight, GraduationCap, Code, Sparkles
} from 'lucide-react';
import { Classroom, User } from '../types';
import { socket } from '../lib/socket';

interface ClassroomManagerProps {
  user: User;
  onRefreshStats: () => void;
  initialClassroomId?: string | null;
  onSelectClassroom?: (classroomId: string | null) => void;
}

export default function ClassroomManager({ 
  user, 
  onRefreshStats, 
  initialClassroomId, 
  onSelectClassroom 
}: ClassroomManagerProps) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Create classroom form
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('Semester 4');
  
  // Join classroom form
  const [joinCode, setJoinCode] = useState('');

  // Active detail classroom roster view
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);
  const [classRoster, setClassRoster] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // AI Classroom Audit states
  const [activeTab, setActiveTab] = useState<'roster' | 'ai'>('roster');
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classrooms?userId=${user.id}&role=${user.role}`);
      const data = await response.json();
      if (response.ok) {
        const list = data.classrooms || [];
        setClassrooms(list);
        return list;
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch classrooms.', 'error');
    } finally {
      setLoading(false);
    }
    return [];
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !subject) return;
    setCreating(true);

    try {
      const response = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className, subject, semester, teacherId: user.id })
      });
      const data = await response.json();

      if (response.ok) {
        showToast(`Classroom "${className}" created! Share code: ${data.classroom.id}`);
        setClassName('');
        setSubject('');
        fetchClassrooms();
        onRefreshStats();
      } else {
        showToast(data.error || 'Failed to create class.', 'error');
      }
    } catch (err) {
      showToast('Error sending classroom request.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setJoining(true);

    try {
      const response = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomCode: joinCode, studentId: user.id })
      });
      const data = await response.json();

      if (response.ok) {
        showToast(`Successfully enrolled in "${data.classroom.className}"!`);
        setJoinCode('');
        fetchClassrooms();
        onRefreshStats();
      } else {
        showToast(data.error || 'Failed to enroll.', 'error');
      }
    } catch (err) {
      showToast('Enrollment error occurred.', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteClassroom = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you absolutely sure you want to delete this classroom? All student logs, marks, and rosters will be lost.')) return;

    try {
      const response = await fetch(`/api/classrooms/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Classroom deleted completely.');
        if (selectedClass?.id === id) setSelectedClass(null);
        fetchClassrooms();
        onRefreshStats();
      }
    } catch (err) {
      showToast('Error deleting classroom.', 'error');
    }
  };

  const handleArchiveClassroom = async (classroom: Classroom, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/ai/classrooms/${classroom.id}`, { // fallback to standard PUT
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !classroom.archived })
      });
      // Try direct put classroom
      const directResponse = await fetch(`/api/classrooms/${classroom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !classroom.archived })
      });
      
      if (directResponse.ok) {
        showToast(classroom.archived ? 'Classroom activated!' : 'Classroom archived.');
        fetchClassrooms();
      }
    } catch (err) {
      showToast('Error toggling archive.', 'error');
    }
  };

  const fetchClassRoster = async (classroom: Classroom) => {
    setSelectedClass(classroom);
    setRosterLoading(true);
    setAiAnalysis(null);
    setActiveTab('roster');
    try {
      const response = await fetch(`/api/classrooms/${classroom.id}/students`);
      const data = await response.json();
      if (response.ok) {
        setClassRoster(data.students || []);
      }
    } catch (err) {
      showToast('Failed to load roster.', 'error');
    } finally {
      setRosterLoading(false);
    }
  };

  const handleRunClassroomAI = async () => {
    if (!selectedClass) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/analyze-classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId: selectedClass.id })
      });
      const data = await response.json();
      if (response.ok) {
        setAiAnalysis(data.analysis);
        showToast('Classroom academic audit generated!');
      } else {
        showToast(data.error || 'Failed to analyze classroom.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error during AI classroom audit.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms().then((list) => {
      if (initialClassroomId && list && list.length > 0) {
        const found = list.find(c => c.id === initialClassroomId);
        if (found) {
          fetchClassRoster(found);
        }
      }
    });
  }, [initialClassroomId]);

  useEffect(() => {
    const handleClassroomUpdated = (payload?: { classroomId?: string }) => {
      console.log('[ClassroomManager] Socket event: classroom_updated', payload);
      fetchClassrooms();
      
      // If the current open class is updated, reload its roster
      if (selectedClass && (!payload || !payload.classroomId || payload.classroomId === selectedClass.id)) {
        fetchClassRoster(selectedClass);
      }
    };

    socket.on('classroom_updated', handleClassroomUpdated);
    
    // Also sync if dashboard metrics change
    const handleDashboardUpdated = () => {
      fetchClassrooms();
    };
    socket.on('dashboard_updated', handleDashboardUpdated);

    return () => {
      socket.off('classroom_updated', handleClassroomUpdated);
      socket.off('dashboard_updated', handleDashboardUpdated);
    };
  }, [selectedClass]);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl backdrop-blur-md border text-sm font-bold animate-bounce ${
          toastType === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
        }`}>
          {toastMessage}
        </div>
      )}

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: Action controls (Forms) */}
        <div className="space-y-6 lg:col-span-1">
          {user.role === 'teacher' ? (
            <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                Initialize New Class
              </h3>
              <form onSubmit={handleCreateClassroom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Class Name</label>
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Advanced Calculus"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Subject / Code</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. MATH301"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Academic Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                    <option value="Semester 3">Semester 3</option>
                    <option value="Semester 4">Semester 4</option>
                    <option value="Semester 5">Semester 5</option>
                    <option value="Semester 6">Semester 6</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Initialize Class Code'}
                </button>
              </form>
            </div>
          ) : user.role === 'student' ? (
            <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <LogIn className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                Enroll via Class Code
              </h3>
              <form onSubmit={handleJoinClassroom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Enter Unique Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AB5XQ9"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-xl text-center text-sm font-extrabold tracking-widest text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={joining}
                  className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {joining ? 'Enrolling...' : 'Join Classroom'}
                </button>
              </form>
            </div>
          ) : (
            <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Administration Panel</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Admins can audit student rosters and archive classes on the right.</p>
            </div>
          )}
        </div>

        {/* Right pane: Lists and details (Grid layout) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Classrooms List Grid */}
          <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                Academic Courses Roster
              </h3>
              <button 
                onClick={fetchClassrooms}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors duration-200"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-xs text-slate-400 font-bold">
                Loading academic courses...
              </div>
            ) : classrooms.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 font-semibold">
                No active courses registered under this profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classrooms.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      fetchClassRoster(c);
                      onSelectClassroom?.(c.id);
                    }}
                    className={`p-4 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border transition-all cursor-pointer relative overflow-hidden group ${
                      selectedClass?.id === c.id 
                        ? 'border-cyan-500/40 dark:border-cyan-500/40 shadow-md shadow-cyan-500/5' 
                        : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {c.archived && (
                      <div className="absolute top-2 right-2 bg-slate-100 dark:bg-slate-850 text-[10px] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        Archived
                      </div>
                    )}
                    <h4 className="font-bold text-slate-850 dark:text-white text-sm group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{c.className}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">{c.subject}</p>
                    
                    <div className="flex items-center justify-between mt-4 border-t border-slate-200/60 dark:border-slate-900/60 pt-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                        <Users className="h-3.5 w-3.5" />
                        {c.studentCount ?? 0} students
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase flex items-center gap-1 font-mono">
                        <Code className="h-3 w-3 text-cyan-500 dark:text-cyan-400" />
                        {c.id}
                      </span>
                    </div>

                    {user.role === 'teacher' && (
                      <div className="flex items-center gap-2 justify-end mt-3 border-t border-slate-200/60 dark:border-slate-900/60 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleArchiveClassroom(c, e)}
                          title="Toggle Archive"
                          className="p-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClassroom(c.id, e)}
                          title="Delete Classroom"
                          className="p-1 rounded bg-slate-100 dark:bg-slate-900 border border-rose-200 dark:border-red-950 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Classroom roster & performance details */}
          {selectedClass && (
            <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-3 mb-4 gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <GraduationCap className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                    Course Room: {selectedClass.className}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Subject code: {selectedClass.subject} | Code: {selectedClass.id}</p>
                </div>

                {/* Tab selector */}
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setActiveTab('roster')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        activeTab === 'roster'
                          ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Class Roster
                    </button>
                    {(user.role === 'teacher' || user.role === 'admin') && (
                      <button
                        onClick={() => {
                          setActiveTab('ai');
                          if (!aiAnalysis && !aiLoading) {
                            handleRunClassroomAI();
                          }
                        }}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          activeTab === 'ai'
                            ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Sparkles className="h-3 w-3 animate-pulse text-cyan-500" />
                        AI Assistant
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      if (activeTab === 'roster') {
                        fetchClassRoster(selectedClass);
                      } else {
                        handleRunClassroomAI();
                      }
                    }}
                    disabled={rosterLoading || aiLoading}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors duration-200 disabled:opacity-55"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${(rosterLoading || aiLoading) ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {activeTab === 'roster' ? (
                rosterLoading ? (
                  <div className="text-center py-12 text-xs text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="animate-spin h-5 w-5 text-cyan-500" />
                    Syncing student roster...
                  </div>
                ) : classRoster.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 font-semibold">
                    No students have enrolled in this class yet. Share classroom code "{selectedClass.id}" to join.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-850">
                          <th className="py-2">Student Name</th>
                          <th className="py-2">Roll Number</th>
                          <th className="py-2">Attendance %</th>
                          <th className="py-2">Class Average</th>
                          <th className="py-2 text-right">Risk Factor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-850/60">
                        {classRoster.map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/20 transition-colors duration-150">
                            <td className="py-3 font-semibold text-slate-800 dark:text-white">{student.name}</td>
                            <td className="py-3 text-slate-500 dark:text-slate-400 font-mono">{student.rollNumber}</td>
                            <td className="py-3 text-slate-700 dark:text-slate-300 font-semibold">
                              {Math.round(student.attendance?.percentage || 0)}% 
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal"> ({student.attendance?.present}/{student.attendance?.total})</span>
                            </td>
                            <td className="py-3 font-bold text-slate-800 dark:text-white">{Math.round(student.classSpecificAvg)}%</td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                student.riskLevel === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                student.riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {student.riskLevel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* AI Assistant Panel */
                aiLoading ? (
                  <div className="text-center py-16 text-xs text-slate-400 font-bold flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="animate-spin h-6 w-6 text-cyan-500" />
                    <div className="space-y-1">
                      <p className="text-slate-750 dark:text-slate-200">Gleaning classroom performance matrices...</p>
                      <p className="text-[10px] text-slate-400 font-medium">Pinpointing risk distributions and formulating target revisions via Gemini</p>
                    </div>
                  </div>
                ) : !aiAnalysis ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-600/25 flex items-center justify-center mx-auto">
                      <Sparkles className="h-6 w-6 text-cyan-500 animate-pulse" />
                    </div>
                    <div className="max-w-md mx-auto space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">EduInsight AI Course Assistant</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        Audit this classroom's risk curves, extract challenging topics, and formulate actionable remedial guidelines on demand.
                      </p>
                    </div>
                    <button
                      onClick={handleRunClassroomAI}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold transition-all hover:opacity-90 shadow-md shadow-cyan-500/15 cursor-pointer"
                    >
                      Conduct Classroom Audit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in mt-2 text-xs">
                    
                    {/* Narrative Card */}
                    <div className="p-4 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl space-y-1">
                      <span className="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block">Executive Diagnosis</span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                        "{aiAnalysis.summary}"
                      </p>
                    </div>

                    {/* Flagged and difficult topics grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Flagged students */}
                      <div className="p-4 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl space-y-2">
                        <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-widest block flex items-center gap-1">
                          ⚠️ Flagged Students (At-Risk / Low GPA)
                        </span>
                        {(!aiAnalysis.atRiskStudents || aiAnalysis.atRiskStudents.length === 0) ? (
                          <p className="text-xs text-emerald-500 font-semibold">No students currently flagged in high-risk zones.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {aiAnalysis.atRiskStudents.map((stu: string, i: number) => (
                              <li key={i} className="text-xs text-slate-700 dark:text-slate-300 font-semibold bg-rose-500/5 dark:bg-rose-500/5 p-2 rounded border border-rose-500/10 flex items-center justify-between">
                                <span>{stu}</span>
                                <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold uppercase font-mono">NEEDS HELP</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Difficult Topics */}
                      <div className="p-4 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl space-y-2">
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest block flex items-center gap-1">
                          🧩 Difficult Topics & Conceptual Gaps
                        </span>
                        <ul className="space-y-1.5">
                          {(aiAnalysis.difficultTopics || [
                            'Relational database normal forms and schema decomposition',
                            'Constructing robust multi-way indexing matrices'
                          ]).map((topic: string, i: number) => (
                            <li key={i} className="p-2 bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 rounded text-xs text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                              {topic}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actionable Suggestions for Teachers */}
                    <div className="p-4 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block">
                          💡 Recommended Teaching Improvements
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText((aiAnalysis.teachingImprovements || []).join('\n'));
                            showToast('Copied teaching suggestions!');
                          }}
                          className="text-[10px] text-cyan-500 hover:underline font-bold"
                        >
                          Copy Suggestions
                        </button>
                      </div>
                      <ul className="space-y-2">
                        {(aiAnalysis.teachingImprovements || []).map((tip: string, idx: number) => (
                          <li key={idx} className="p-2.5 bg-cyan-500/5 dark:bg-cyan-500/5 border border-cyan-500/10 rounded-lg text-slate-800 dark:text-slate-300 font-semibold flex items-start gap-3">
                            <span className="h-5 w-5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Interactive revision playbook */}
                    <div className="backdrop-blur-sm bg-gradient-to-tr from-violet-500/5 to-cyan-500/5 border border-violet-500/10 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-widest block">
                        📚 Target Revision & Classroom Playbook
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Revision Plan */}
                        <div className="p-3 bg-white/40 dark:bg-slate-950/30 border border-slate-200/50 dark:border-slate-850 rounded-lg space-y-1.5">
                          <span className="text-[9px] font-bold text-violet-500 uppercase block">Revision Blueprint</span>
                          <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px] font-medium leading-relaxed pl-3 list-decimal">
                            {(aiAnalysis.revisionPlan || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                        {/* Interactive Activities */}
                        <div className="p-3 bg-white/40 dark:bg-slate-950/30 border border-slate-200/50 dark:border-slate-850 rounded-lg space-y-1.5">
                          <span className="text-[9px] font-bold text-cyan-500 uppercase block">Classroom Activities</span>
                          <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px] font-medium leading-relaxed pl-3 list-disc">
                            {(aiAnalysis.classroomActivities || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                        {/* Assessment Recs */}
                        <div className="p-3 bg-white/40 dark:bg-slate-950/30 border border-slate-200/50 dark:border-slate-850 rounded-lg space-y-1.5">
                          <span className="text-[9px] font-bold text-amber-500 uppercase block">Assessment Upgrades</span>
                          <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px] font-medium leading-relaxed pl-3 list-disc">
                            {(aiAnalysis.assessmentRecommendations || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Semester Forecast summary */}
                    <div className="p-3 text-center border-t border-slate-200 dark:border-slate-850 pt-3">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Classroom Forecast</span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic font-semibold">
                        "{aiAnalysis.semesterSummary}"
                      </p>
                    </div>

                  </div>
                )
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
