/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, Award, Calendar, AlertTriangle, ShieldCheck, Download, 
  ArrowLeft, RefreshCw, Sparkles, BookOpen, Clock, BarChart4
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { socket } from '../lib/socket';

interface UserProfilePageProps {
  profileId: string; // userId to view
  viewerRole: string; // role of the user viewing
  onBack: () => void;
}

export default function UserProfilePage({ profileId, viewerRole, onBack }: UserProfilePageProps) {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAI, setRunningAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);

  const fetchProfileDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/student/${profileId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        if (data.aiAnalysis) {
          setAiAnalysis(data.aiAnalysis);
        }
      } else {
        // Try fetching general user profile if student fetch is not found
        const userRes = await fetch(`/api/admin/users`);
        if (userRes.ok) {
          const userData = await userRes.json();
          const found = (userData.users || []).find((u: any) => u.id === profileId);
          if (found) {
            setProfile({
              profile: {
                id: found.id,
                name: found.name,
                email: found.email,
                role: found.role,
                active: found.active,
                currentSemester: found.extraInfo?.semester || 'Semester 4',
                rollNumber: found.extraInfo?.rollNumber || 'S-Record',
                department: found.extraInfo?.department || 'Computer Science'
              },
              marks: [],
              attendance: []
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching student profile logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAI = async () => {
    setRunningAI(true);
    try {
      const response = await fetch('/api/ai/analyze-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: profileId })
      });
      if (response.ok) {
        const data = await response.json();
        setAiAnalysis(data.analysis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningAI(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [profileId]);

  useEffect(() => {
    // Listen for real-time grade/marks updates to keep stats sync
    const handleDashboardUpdate = () => {
      fetchProfileDetails();
    };
    socket.on('dashboard_updated', handleDashboardUpdate);
    return () => {
      socket.off('dashboard_updated', handleDashboardUpdate);
    };
  }, [profileId]);

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3 font-semibold text-xs text-slate-400">
        <RefreshCw className="animate-spin h-6 w-6 text-cyan-400" />
        Syncing secure profile records...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-semibold space-y-4">
        <p>No valid user profile match found for ID "{profileId}".</p>
        <button onClick={onBack} className="text-cyan-400 font-bold hover:underline flex items-center gap-1.5 mx-auto">
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const userRecord = profile.profile;
  const isStudent = userRecord.role === 'student';

  const downloadReportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("AURA STUDENT REPORT PROFILE", 20, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Official Academic Predictive Summary | Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    
    // Student Details
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("STUDENT PROFILE INFO", 20, 60);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${userRecord.name}`, 20, 72);
    doc.text(`Email: ${userRecord.email}`, 20, 80);
    doc.text(`Roll Number: ${userRecord.rollNumber || 'N/A'}`, 20, 88);
    doc.text(`Semester: ${userRecord.currentSemester || 'Semester 4'}`, 20, 96);
    
    if (isStudent) {
      doc.text(`GPA Average Marks: ${userRecord.avgMarks || 0}%`, 110, 72);
      doc.text(`Ranks Leaderboard: #${userRecord.rank || 'N/A'}`, 110, 80);
      doc.text(`Attendance Record: ${Math.round(userRecord.overallAttendancePct || 0)}%`, 110, 88);
      doc.text(`AI Risk Level: ${String(userRecord.riskLevel || 'low').toUpperCase()}`, 110, 96);
    }
    
    doc.save(`${userRecord.name}_academic_report.pdf`);
  };

  // Mock student scores trend if there are marks
  const scoreHistory = profile.marks?.length > 0 
    ? profile.marks.map((m: any, i: number) => ({ name: m.subject, score: m.marksObtained }))
    : [
        { name: 'Algebra', score: 78 },
        { name: 'Mechanics', score: 85 },
        { name: 'Databases', score: 62 },
        { name: 'Physics', score: 91 }
      ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top action header bar */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-850 hover:border-slate-700 text-xs text-slate-300 font-bold hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </button>
        {isStudent && (
          <button 
            onClick={downloadReportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-xs text-white font-extrabold cursor-pointer transition-all shadow-md shadow-cyan-500/10"
          >
            <Download className="h-4 w-4" />
            Download PDF Gradebook
          </button>
        )}
      </div>

      {/* Main Profile Header Info Card */}
      <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        
        {/* Glow visual back */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-[90px] pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-violet-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-cyan-500/15 border border-white/10 shrink-0">
            {userRecord.name.charAt(0)}
          </div>
          <div className="space-y-1.5 text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center justify-center md:justify-start gap-2">
              {userRecord.name}
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest ${
                userRecord.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
              }`}>
                {userRecord.active ? 'Active' : 'Archived'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono font-bold">{userRecord.email}</p>
            <p className="text-xs text-slate-400 font-medium">
              Role: <span className="text-cyan-400 uppercase font-black tracking-widest">{userRecord.role}</span> | Department: <span className="font-semibold text-slate-300">{userRecord.department || 'Applied Sciences'}</span>
            </p>
          </div>
        </div>

        {isStudent && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-850 pt-4 md:pt-0">
            <div className="bg-slate-900/30 border border-slate-850/60 rounded-xl p-3 text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Avg GPA</span>
              <span className="text-lg font-black text-white">{userRecord.avgMarks || 0}%</span>
            </div>
            <div className="bg-slate-900/30 border border-slate-850/60 rounded-xl p-3 text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Class Rank</span>
              <span className="text-lg font-black text-cyan-400">#{userRecord.rank || 'N/A'}</span>
            </div>
            <div className="bg-slate-900/30 border border-slate-850/60 rounded-xl p-3 text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Attendance</span>
              <span className="text-lg font-black text-white">{Math.round(userRecord.overallAttendancePct || 0)}%</span>
            </div>
            <div className="bg-slate-900/30 border border-slate-850/60 rounded-xl p-3 text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Risk factor</span>
              <span className={`text-sm font-black uppercase block mt-1 ${
                userRecord.riskLevel === 'high' ? 'text-rose-400' :
                userRecord.riskLevel === 'medium' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {userRecord.riskLevel || 'low'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Roster charts / analysis Grid */}
      {isStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Performance Area Chart */}
          <div className="lg:col-span-2 glass-card p-6 flex flex-col">
            <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart4 className="h-5 w-5 text-cyan-400" />
              Syllabus Performance Development
            </h3>
            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreHistory}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#06b6d4', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#scoreColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Advisor Panel */}
          <div className="lg:col-span-1 glass-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                Aura AI Insights
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Consult our deep academic modeling system to draft strengths, remedial study hour targets, and predictive risks for Alice.
              </p>

              {aiAnalysis ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                    <span className="text-[9px] uppercase font-bold text-violet-400 tracking-wider block mb-1">Weekly Study Hours Target</span>
                    <p className="text-sm font-bold text-slate-200">{aiAnalysis.studyHours || 12} Hours / Week</p>
                  </div>
                  <div className="p-3.5 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
                    <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider block mb-1">Executive Summary</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed truncate">{aiAnalysis.summary || 'Demonstrates strong engineering foundations.'}</p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-[11px] text-slate-500 font-medium">
                  No active predictive analysis.
                </div>
              )}
            </div>

            <button 
              onClick={handleTriggerAI}
              disabled={runningAI}
              className="w-full mt-4 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-extrabold rounded-xl text-xs transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-violet-600/15"
            >
              {runningAI ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Generating draft...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate AI Diagnostic
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* Grade details & log sheets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Grades Breakdown */}
        {isStudent && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-cyan-400" />
              Detailed Subject Gradebook
            </h3>
            {profile.marks?.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500 font-semibold">No registered marks recorded in the system.</p>
            ) : (
              <div className="divide-y divide-slate-850/60 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                {profile.marks?.map((m: any) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-slate-200">{m.subject}</h4>
                      <span className="text-[10px] text-slate-500 font-mono font-medium uppercase">{m.examType}</span>
                    </div>
                    <span className={`font-black text-sm ${
                      m.marksObtained >= 75 ? 'text-emerald-400' :
                      m.marksObtained >= 50 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {m.marksObtained} / {m.maxMarks}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attendance Breakdown */}
        {isStudent && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-cyan-400" />
              Course Attendance Records
            </h3>
            {profile.attendance?.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500 font-semibold">No registered attendance records found.</p>
            ) : (
              <div className="divide-y divide-slate-850/60 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                {profile.attendance?.map((a: any) => {
                  const pct = a.total > 0 ? (a.present / a.total) * 100 : 0;
                  return (
                    <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <h4 className="font-bold text-slate-200">Course ID: {a.classroomId}</h4>
                        <span className="text-[10px] text-slate-500 font-semibold">{a.present} attended of {a.total} total sessions</span>
                      </div>
                      <span className={`font-bold ${
                        pct >= 85 ? 'text-emerald-400' :
                        pct >= 75 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
