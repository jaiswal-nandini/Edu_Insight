/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Plus, AlertTriangle, CheckCircle, Clock, 
  ThumbsUp, EyeOff, RefreshCw, BarChart2, Users, AlertOctagon, User,
  Sparkles
} from 'lucide-react';
import { Complaint, User as UserType } from '../types';
import { socket } from '../lib/socket';

interface ComplaintSystemProps {
  user: UserType;
  onRefreshStats?: () => void;
}

export default function ComplaintSystem({ user, onRefreshStats }: ComplaintSystemProps) {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // AI Analysis states
  const [aiAnalyses, setAiAnalyses] = useState<Record<string, any>>({});
  const [aiLoadingIds, setAiLoadingIds] = useState<Record<string, boolean>>({});
  const [expandedAiIds, setExpandedAiIds] = useState<Record<string, boolean>>({});

  // Form states
  const [teachersList, setTeachersList] = useState<UserType[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Teaching Methodology');
  const [severity, setSeverity] = useState('low');
  const [anonymous, setAnonymous] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'ledger' | 'submit' | 'analytics'>('ledger');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/complaints?role=${user.role}&userId=${user.id}`);
      const data = await response.json();
      if (response.ok) {
        setComplaints(data.complaints || []);
      }
    } catch (err) {
      showToast('Error syncing complaint database.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (response.ok) {
        const teachers = (data.users || []).filter((u: any) => u.role === 'teacher');
        setTeachersList(teachers);
        if (teachers.length > 0) {
          setSelectedTeacherId(teachers[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || !selectedTeacherId) return;
    setSubmitting(true);

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          teacherId: selectedTeacherId,
          text,
          category,
          severity,
          anonymous
        })
      });

      if (response.ok) {
        showToast('Feedback submitted securely!');
        setText('');
        setAnonymous(false);
        setActiveTab('ledger');
        fetchComplaints();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (err) {
      showToast('Error sending feedback request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (id: string) => {
    if (user.role !== 'student') {
      showToast('Only enrolled students can upvote complaints.');
      return;
    }
    try {
      const response = await fetch(`/api/complaints/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.id })
      });
      if (response.ok) {
        fetchComplaints();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const response = await fetch(`/api/complaints/${id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolverId: user.id })
      });
      if (response.ok) {
        showToast('Feedback marked as RESOLVED.');
        fetchComplaints();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComplaints();
    if (user.role === 'student') {
      fetchFaculty();
    }
  }, []);

  useEffect(() => {
    const handleComplaintsUpdate = () => {
      console.log('[ComplaintSystem] Socket event: complaints_updated');
      fetchComplaints();
    };

    socket.on('complaints_updated', handleComplaintsUpdate);

    return () => {
      socket.off('complaints_updated', handleComplaintsUpdate);
    };
  }, []);

  // ---------------------------------------------------------
  // COMPLAINT ANALYTICS ENGINE
  // ---------------------------------------------------------
  const totalComplaintsCount = complaints.length;
  const pendingCount = complaints.filter(c => c.status === 'pending').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length;
  const highPriorityCount = complaints.filter(c => c.severity === 'high').length;

  // Breakdown by category
  const categoryStats: Record<string, number> = {};
  complaints.forEach(c => {
    categoryStats[c.category] = (categoryStats[c.category] || 0) + 1;
  });

  // Most complained teacher
  const teacherStats: Record<string, { count: number; name: string }> = {};
  complaints.forEach(c => {
    if (!teacherStats[c.teacherId]) {
      teacherStats[c.teacherId] = { count: 0, name: c.teacherName || 'Faculty' };
    }
    teacherStats[c.teacherId].count++;
  });
  
  const sortedTeachersByComplaints = Object.entries(teacherStats).sort((a, b) => b[1].count - a[1].count);
  const mostComplainedTeacher = sortedTeachersByComplaints.length > 0 ? sortedTeachersByComplaints[0][1] : null;

  const handleAnalyzeComplaint = async (complaintId: string) => {
    if (expandedAiIds[complaintId]) {
      setExpandedAiIds(prev => ({ ...prev, [complaintId]: false }));
      return;
    }
    if (aiAnalyses[complaintId]) {
      setExpandedAiIds(prev => ({ ...prev, [complaintId]: true }));
      return;
    }

    setAiLoadingIds(prev => ({ ...prev, [complaintId]: true }));
    try {
      const response = await fetch('/api/ai/analyze-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId })
      });
      const data = await response.json();
      if (response.ok) {
        setAiAnalyses(prev => ({ ...prev, [complaintId]: data.analysis }));
        setExpandedAiIds(prev => ({ ...prev, [complaintId]: true }));
        showToast('EduInsight AI Complaint Audit Generated!');
      } else {
        showToast(data.error || 'Failed to analyze complaint.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error requesting AI complaint audit.');
    } finally {
      setAiLoadingIds(prev => ({ ...prev, [complaintId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-cyan-950/90 border border-cyan-500/30 text-cyan-300 font-bold backdrop-blur-md shadow-2xl animate-bounce text-xs">
          {toast}
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-850 pb-px">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 text-xs font-bold border-b-2 uppercase tracking-wider cursor-pointer transition-colors ${
            activeTab === 'ledger' 
              ? 'border-cyan-500 text-cyan-400' 
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Feedback Logs
        </button>
        {user.role === 'student' && (
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 text-xs font-bold border-b-2 uppercase tracking-wider cursor-pointer transition-colors ${
              activeTab === 'submit' 
                ? 'border-cyan-500 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Submit Feedback
          </button>
        )}
        {(user.role === 'admin' || user.role === 'teacher') && (
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-xs font-bold border-b-2 uppercase tracking-wider cursor-pointer transition-colors ${
              activeTab === 'analytics' 
                ? 'border-cyan-500 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Complaint Analytics
          </button>
        )}
      </div>

      {/* RENDER TAB content */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Academic Feedback Logs</h3>
            <button 
              onClick={fetchComplaints}
              className="p-1.5 rounded-lg bg-slate-950/50 border border-slate-850 text-slate-400 hover:text-white cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="text-center py-12 text-xs text-slate-400 font-bold">
                Syncing complaint ledgers...
              </div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 font-semibold">
                No active complaints or department feedback registered.
              </div>
            ) : (
              complaints.map((c) => (
                <div 
                  key={c.id} 
                  className="p-5 backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4 relative overflow-hidden group"
                >
                  {/* Category & Status headers */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white uppercase">{c.category}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                          c.severity === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          c.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {c.severity} priority
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Filing Target: <span className="text-slate-350 font-bold">{c.teacherName}</span>
                      </p>
                    </div>

                    <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      c.status === 'resolved' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {c.status === 'resolved' ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Resolved
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          Pending Review
                        </>
                      )}
                    </span>
                  </div>

                  {/* Body text */}
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    "{c.text}"
                  </p>

                  {/* AI Analysis Dropdown panel */}
                  {expandedAiIds[c.id] && aiAnalyses[c.id] && (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-4 animate-fade-in text-xs text-slate-300">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" /> EduInsight AI Mitigation Strategy
                        </span>
                        <button
                          onClick={() => {
                            const analysis = aiAnalyses[c.id];
                            const report = `AI COMPLAINT AUDIT REPORT
Sentiment: ${analysis.sentiment}
Toxicity check: ${analysis.toxicity}
Urgency rating: ${analysis.urgency.toUpperCase()} (${analysis.urgencyExplanation})
Standardized category: ${analysis.category}

TEACHER RECOMMENDATIONS:
${(analysis.teacherSuggestions || []).map((s: string, i: number) => `${i+1}. ${s}`).join('\n')}

ADMINISTRATIVE ACTION PLAN:
${(analysis.adminSuggestions || []).map((s: string, i: number) => `${i+1}. ${s}`).join('\n')}`;
                            navigator.clipboard.writeText(report);
                            showToast('AI Audit Report copied!');
                          }}
                          className="text-[10px] text-cyan-500 hover:underline font-bold cursor-pointer"
                        >
                          Copy Report
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                        <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-850">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block mb-0.5">Sentiment analysis</span>
                          <span className="font-extrabold text-slate-200">{aiAnalyses[c.id].sentiment}</span>
                        </div>
                        <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-850">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block mb-0.5">Toxicity level</span>
                          <span className={`font-extrabold uppercase ${aiAnalyses[c.id].toxicity.toLowerCase().includes('toxic') ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {aiAnalyses[c.id].toxicity}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-850">
                          <span className="text-[8px] font-bold text-slate-500 uppercase block mb-0.5">Standard category</span>
                          <span className="font-extrabold text-slate-200">{aiAnalyses[c.id].category}</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[11px] leading-relaxed">
                        <span className="font-bold text-amber-400 uppercase tracking-wider text-[8.5px] block mb-0.5">Urgency Factor ({aiAnalyses[c.id].urgency.toUpperCase()})</span>
                        <p className="font-semibold text-slate-300">{aiAnalyses[c.id].urgencyExplanation}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-violet-400 uppercase block">Teacher Corrective Actions</span>
                          <ul className="space-y-1 pl-3.5 list-decimal text-[11px] font-medium text-slate-300 leading-relaxed">
                            {(aiAnalyses[c.id].teacherSuggestions || []).map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-cyan-400 uppercase block">Institutional Admin Resolutions</span>
                          <ul className="space-y-1 pl-3.5 list-decimal text-[11px] font-medium text-slate-300 leading-relaxed">
                            {(aiAnalyses[c.id].adminSuggestions || []).map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions & signatures bar */}
                  <div className="flex justify-between items-center border-t border-slate-900/60 pt-3 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 font-semibold">
                      {c.anonymous ? (
                        <span className="flex items-center gap-1 text-[10px] uppercase text-slate-500">
                          <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                          Anonymous Report
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] uppercase text-cyan-400">
                          <User className="h-3.5 w-3.5 text-cyan-400" />
                          {c.studentName}
                        </span>
                      )}
                      
                      {/* Admin Auditing helper block */}
                      {user.role === 'admin' && c.anonymous && (
                        <span className="text-[9px] bg-red-950/25 text-red-400 border border-red-900/30 px-1.5 py-0.5 rounded font-extrabold uppercase font-mono">
                          Admin Audit ID: {c.studentId || 'unknown'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleUpvote(c.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded bg-slate-950/60 border hover:border-cyan-500/40 transition-all cursor-pointer text-[10px] font-extrabold uppercase ${
                          user.role === 'student' && c.upvotedBy?.includes(user.id)
                            ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5'
                            : 'border-slate-850 text-slate-400'
                        }`}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        Upvote ({c.upvotes})
                      </button>

                      {(user.role === 'teacher' || user.role === 'admin') && (
                        <button
                          onClick={() => handleAnalyzeComplaint(c.id)}
                          disabled={aiLoadingIds[c.id]}
                          className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-60 text-white text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
                        >
                          {aiLoadingIds[c.id] ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Auditing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" />
                              {expandedAiIds[c.id] ? 'Hide Audit' : 'EduInsight AI Audit'}
                            </>
                          )}
                        </button>
                      )}

                      {c.status === 'pending' && (user.role === 'teacher' || user.role === 'admin') && (
                        <button
                          onClick={() => handleResolve(c.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:opacity-90 text-white font-bold rounded text-[10px] uppercase cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'submit' && (
        <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 max-w-xl mx-auto">
          <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan-400" />
            Submit Academic Feedback Report
          </h3>
          <form onSubmit={handleSubmitComplaint} className="space-y-4">
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Select Target Instructor</label>
              <select
                required
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
              >
                {teachersList.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.department})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Teaching Methodology">Teaching Methodology</option>
                  <option value="Course Workload">Course Workload</option>
                  <option value="Grading Discrepancy">Grading Discrepancy</option>
                  <option value="Laboratory Access">Laboratory Access</option>
                  <option value="Administrative Support">Administrative Support</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Feedback Text</label>
              <textarea
                required
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Provide a clear, detailed, constructive description of your concern so the department can act appropriately."
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
              <input
                id="anon"
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 bg-slate-950 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0 border-slate-800"
              />
              <label htmlFor="anon" className="text-xs text-slate-300 font-semibold cursor-pointer select-none flex items-center gap-1">
                <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                Submit Anonymous (Hides your identity from the Instructor)
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'File Security Complaint Report'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Summary stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Filed Complaints</span>
              <h4 className="text-2xl font-black text-white mt-1">{totalComplaintsCount}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Pending Department Audits</span>
              <h4 className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Resolved Reports</span>
              <h4 className="text-2xl font-black text-emerald-400 mt-1">{resolvedCount}</h4>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">High Severity Red Flags</span>
              <h4 className="text-2xl font-black text-rose-400 mt-1">{highPriorityCount}</h4>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            
            {/* Category breakdown table list */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
              <h4 className="text-xs font-extrabold uppercase text-slate-200 tracking-wider mb-4 flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4 text-cyan-400" />
                Category Frequencies
              </h4>
              <div className="space-y-3">
                {Object.entries(categoryStats).map(([catName, freq]) => (
                  <div key={catName} className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-300">
                      <span>{catName}</span>
                      <span className="text-cyan-400">{freq} reports</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-cyan-500 h-1.5 rounded-full" 
                        style={{ width: `${(freq / totalComplaintsCount) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
                {Object.keys(categoryStats).length === 0 && (
                  <p className="text-center py-6 text-slate-500 font-semibold">No feedback categories loaded.</p>
                )}
              </div>
            </div>

            {/* Most complained teacher details panel */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-extrabold uppercase text-slate-200 tracking-wider mb-4 flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4 text-rose-500" />
                  Primary Faculty Target Indicator
                </h4>
                {mostComplainedTeacher ? (
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-855 flex items-center gap-4 mt-2">
                    <div className="h-10 w-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center rounded-lg font-bold">
                      !
                    </div>
                    <div>
                      <h5 className="font-extrabold text-white">{mostComplainedTeacher.name}</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">Accumulated {mostComplainedTeacher.count} student feedback alerts.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-6 text-slate-500 font-semibold">No instructors flagged under critical warnings. Excellent standards! 🌟</p>
                )}
              </div>
              <div className="p-3 bg-slate-950/20 rounded-xl border border-slate-850 text-[11px] leading-relaxed text-slate-400 mt-4">
                <span className="font-bold text-slate-300 block mb-1">Administrative Note:</span>
                Under privacy regulations, student identities remain masked when submitted under the 'anonymous' parameter, except to Administrative platform roles.
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
