/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, RefreshCw, 
  Award, CheckCircle, AlertCircle, Sparkles, BookOpen 
} from 'lucide-react';
import { Classroom, ExamType } from '../types';
import { socket } from '../lib/socket';

interface MarksManagerProps {
  user: { id: string; role: string };
  onRefreshStats: () => void;
}

export default function MarksManager({ user, onRefreshStats }: MarksManagerProps) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const [examType, setExamType] = useState<ExamType>('Internal 1');
  const [marksObtained, setMarksObtained] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');

  const [marksList, setMarksList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit inline marks state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMarks, setEditMarks] = useState('');

  // Toast
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchClassrooms = async () => {
    try {
      const response = await fetch(`/api/classrooms?userId=${user.id}&role=${user.role}`);
      const data = await response.json();
      if (response.ok) {
        setClassrooms(data.classrooms || []);
        if (data.classrooms?.length > 0) {
          setSelectedClassId(data.classrooms[0].id);
        }
      }
    } catch (err) {
      showToast('Failed to load courses.', 'error');
    }
  };

  const fetchClassRoster = async (classId: string) => {
    if (!classId) return;
    try {
      const response = await fetch(`/api/classrooms/${classId}/students`);
      const data = await response.json();
      if (response.ok) {
        setStudents(data.students || []);
        if (data.students?.length > 0) {
          setSelectedStudentId(data.students[0].id);
        } else {
          setSelectedStudentId('');
        }
      }
    } catch (err) {
      showToast('Failed to load student list.', 'error');
    }
  };

  const fetchAllGrades = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leaderboard'); // leaderboards has grades summary
      // Fetch list of raw marks
      const marksRes = await fetch('/api/leaderboard'); // fallback/mocks
      // Since server.ts exposes marks inside dashboards or leaderboards, let's grab directly!
      const classIdQuery = selectedClassId ? `?classroomId=${selectedClassId}` : '';
      
      // Let's populate local marksList by querying student detail registries
      if (selectedClassId) {
        const rosterRes = await fetch(`/api/classrooms/${selectedClassId}/students`);
        const rData = await rosterRes.json();
        if (rosterRes.ok) {
          // Flatten marks for all students in classroom
          const flat: any[] = [];
          
          // Alternatively, let's fetch individual profiles to build the full marks ledger
          const studentsList = rData.students || [];
          for (const s of studentsList) {
            const detailRes = await fetch(`/api/dashboard/student/${s.id}`);
            const dData = await detailRes.json();
            if (detailRes.ok) {
              const studentMarks = (dData.marks || []).filter((m: any) => m.classroomId === selectedClassId);
              studentMarks.forEach((m: any) => {
                flat.push({
                  ...m,
                  studentName: s.name,
                  rollNumber: s.rollNumber
                });
              });
            }
          }
          setMarksList(flat);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedClassId || !marksObtained) {
      showToast('Please complete all marks fields.', 'error');
      return;
    }
    setSaving(true);

    try {
      const response = await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          classroomId: selectedClassId,
          examType,
          marksObtained: Number(marksObtained),
          maxMarks: Number(maxMarks)
        })
      });
      const data = await response.json();

      if (response.ok) {
        showToast('Academic marks successfully submitted!');
        setMarksObtained('');
        fetchAllGrades();
        onRefreshStats();
      } else {
        showToast(data.error || 'Failed to submit marks.', 'error');
      }
    } catch (err) {
      showToast('Error sending marks database request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInlineEdit = async (id: string) => {
    if (!editMarks) return;
    try {
      const response = await fetch(`/api/marks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marksObtained: Number(editMarks) })
      });
      if (response.ok) {
        showToast('Academic mark entry updated.');
        setEditingId(null);
        setEditMarks('');
        fetchAllGrades();
        onRefreshStats();
      }
    } catch (err) {
      showToast('Failed to save edit.', 'error');
    }
  };

  const handleDeleteMark = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grade record? This will instantly recalculate the student GPA.')) return;
    try {
      const response = await fetch(`/api/marks/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Grade record deleted.');
        fetchAllGrades();
        onRefreshStats();
      }
    } catch (err) {
      showToast('Failed to delete record.', 'error');
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassRoster(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClassId) {
      fetchAllGrades();
    }
  }, [selectedClassId, selectedStudentId]);

  useEffect(() => {
    const handleClassroomUpdated = (payload?: { classroomId?: string }) => {
      console.log('[MarksManager] Socket event: classroom_updated', payload);
      if (selectedClassId && (!payload || !payload.classroomId || payload.classroomId === selectedClassId)) {
        fetchClassRoster(selectedClassId);
        fetchAllGrades();
      }
    };

    socket.on('classroom_updated', handleClassroomUpdated);
    
    const handleDashboardUpdated = () => {
      fetchAllGrades();
    };
    socket.on('dashboard_updated', handleDashboardUpdated);

    return () => {
      socket.off('classroom_updated', handleClassroomUpdated);
      socket.off('dashboard_updated', handleDashboardUpdated);
    };
  }, [selectedClassId]);

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl backdrop-blur-md border text-sm font-bold animate-bounce flex items-center gap-2 ${
          toastType === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
        }`}>
          {toastType === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast}
        </div>
      )}

      {/* Forms and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Record marks form */}
        <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 h-fit shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
            Add Grades Entry
          </h3>
          <form onSubmit={handleRecordMark} className="space-y-4">
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Select Course Classroom</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
              >
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.className} ({c.id})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Select Enrolled Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
                ))}
                {students.length === 0 && <option value="">No students enrolled yet</option>}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Exam Type</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as ExamType)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="Internal 1">Internal 1</option>
                  <option value="Internal 2">Internal 2</option>
                  <option value="Mid Semester">Mid Semester</option>
                  <option value="Final">Final</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Lab">Lab</option>
                  <option value="Project">Project</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Max Score</label>
                <input
                  type="number"
                  required
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Marks Obtained</label>
              <input
                type="number"
                required
                max={Number(maxMarks)}
                min={0}
                value={marksObtained}
                onChange={(e) => setMarksObtained(e.target.value)}
                placeholder="e.g. 85"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving || !selectedStudentId}
              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Submit Academic Mark'}
            </button>
          </form>
        </div>

        {/* Audit Grade ledger list */}
        <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-850 mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
              Course Grades Audit Ledger
            </h3>
            <button
              onClick={fetchAllGrades}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors duration-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400 font-bold">
              Fetching recorded grades ledger...
            </div>
          ) : marksList.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500 font-semibold">
              No academic marks recorded in this course yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-850 pb-2">
                    <th className="py-2.5">Student</th>
                    <th className="py-2.5">Roll Number</th>
                    <th className="py-2.5">Assessment</th>
                    <th className="py-2.5">Score</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-850/60">
                  {marksList.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-xs transition-colors duration-150">
                      <td className="py-3 font-semibold text-slate-800 dark:text-white">{m.studentName}</td>
                      <td className="py-3 text-slate-500 dark:text-slate-400 font-mono">{m.rollNumber}</td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 font-semibold">{m.examType}</td>
                      <td className="py-3 font-bold">
                        {editingId === m.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={editMarks}
                              onChange={(e) => setEditMarks(e.target.value)}
                              className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-800 dark:text-white text-center focus:outline-none"
                            />
                            <span className="text-slate-400 dark:text-slate-500">/ {m.maxMarks}</span>
                          </div>
                        ) : (
                          <span className={m.marksObtained < 50 ? 'text-rose-500 dark:text-rose-400 font-extrabold' : 'text-emerald-500 dark:text-emerald-400'}>
                            {m.marksObtained} / {m.maxMarks}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {editingId === m.id ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => handleSaveInlineEdit(m.id)}
                              className="p-1 rounded bg-slate-100 hover:bg-emerald-50 dark:bg-slate-950 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-850 hover:border-emerald-300 dark:hover:border-emerald-700/40 cursor-pointer"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-850 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => {
                                setEditingId(m.id);
                                setEditMarks(String(m.marksObtained));
                              }}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-850 cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMark(m.id)}
                              className="p-1 rounded bg-slate-100 hover:bg-rose-50 dark:bg-slate-950 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-850 text-rose-500 dark:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900/40 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
