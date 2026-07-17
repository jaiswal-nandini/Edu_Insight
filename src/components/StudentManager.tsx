/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, SlidersHorizontal, RefreshCw, Sparkles, FileText, 
  User, Award, Calendar, AlertTriangle, ShieldCheck, Download,
  Loader2, GraduationCap, ArrowUpDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { socket } from '../lib/socket';

interface StudentManagerProps {
  user: { id: string; role: string };
  initialStudentId?: string | null;
  onSelectStudent?: (studentId: string | null) => void;
}

export default function StudentManager({ user, initialStudentId, onSelectStudent }: StudentManagerProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  
  // Detail selection state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // AI analysis state
  const [runningAI, setRunningAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);

  // Toast
  const [toast, setToast] = useState('');

  const fetchStudentsList = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (response.ok) {
        // Filter only students role
        const list = (data.users || []).filter((u: any) => u.role === 'student');
        setStudents(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProfileDetails = async (id: string) => {
    setSelectedStudentId(id);
    setDetailsLoading(true);
    setAiAnalysis(null);
    try {
      const response = await fetch(`/api/dashboard/student/${id}`);
      const data = await response.json();
      if (response.ok) {
        setStudentDetails(data);
        if (data.aiAnalysis) {
          setAiAnalysis(data.aiAnalysis);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRunAISystem = async () => {
    if (!selectedStudentId) return;
    setRunningAI(true);
    try {
      const response = await fetch('/api/ai/analyze-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId })
      });
      const data = await response.json();
      if (response.ok) {
        setAiAnalysis(data.analysis);
        setToast('AI predictive analysis updated!');
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningAI(false);
    }
  };

  const generatePDFReport = () => {
    if (!studentDetails) return;
    const profile = studentDetails.profile;
    
    const doc = new jsPDF();
    
    // Header Style
    doc.setFillColor(15, 23, 42); // slate-900 background for title block
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AURA ANALYTICS REPORT", 20, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // light slate
    doc.text(`Official Academic & AI Predictive Audit - Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    
    // Core details block
    doc.setTextColor(30, 41, 59); // dark grey
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("STUDENT PROFILE DETAILS", 20, 60);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${profile.name}`, 20, 70);
    doc.text(`Email: ${profile.email}`, 20, 78);
    doc.text(`Roll Number: ${profile.rollNumber}`, 20, 86);
    doc.text(`Semester: ${profile.currentSemester}`, 20, 94);
    
    doc.text(`Overall GPA Marks: ${profile.avgMarks}%`, 110, 70);
    doc.text(`Classroom Rank: #${profile.rank}`, 110, 78);
    doc.text(`Attendance Record: ${Math.round(profile.overallAttendancePct)}%`, 110, 86);
    doc.text(`AI Risk Category: ${String(profile.riskLevel).toUpperCase()}`, 110, 94);
    
    // Horizontal divider
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 104, 190, 104);
    
    // Grades Detail Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("ACADEMIC ASSESSMENT MARKS", 20, 114);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Subject", 20, 124);
    doc.text("Exam Type", 90, 124);
    doc.text("Marks Obtained", 150, 124);
    
    doc.line(20, 126, 190, 126);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    
    let yPos = 132;
    const marksList = studentDetails.marks || [];
    marksList.slice(0, 8).forEach((m: any) => {
      doc.text(m.subject, 20, yPos);
      doc.text(m.examType, 90, yPos);
      doc.text(`${m.marksObtained}/${m.maxMarks}`, 150, yPos);
      yPos += 7;
    });

    if (marksList.length === 0) {
      doc.text("No registered marks records.", 20, yPos);
      yPos += 7;
    }
    
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 12;
    
    // AI Cognitive Insights
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("AI COGNITIVE INSIGHTS & STUDY PLAN", 20, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    yPos += 8;
    
    if (aiAnalysis) {
      // Split summary into multiple lines to fit on page
      const splitSummary = doc.splitTextToSize(aiAnalysis.summary, 170);
      doc.text(splitSummary, 20, yPos);
      yPos += (splitSummary.length * 5) + 4;
      
      doc.setFont("helvetica", "bold");
      doc.text("Primary Cognitive Strengths:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text((aiAnalysis.strengths || []).join(', '), 65, yPos);
      yPos += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text("Cognitive Improvement Areas:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text((aiAnalysis.weaknesses || []).join(', '), 65, yPos);
      yPos += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text("Actionable Study Hour Recommendation:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`${aiAnalysis.studyHours || 12} hours / week`, 85, yPos);
      yPos += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Predicted Exam Readiness Index:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`${aiAnalysis.examReadiness || 50}% readiness quotient`, 85, yPos);
      yPos += 10;
      
      // Motivation Quote
      doc.setFont("helvetica", "italic");
      doc.setTextColor(71, 85, 105);
      const splitMotivation = doc.splitTextToSize(`Motivation: "${aiAnalysis.motivation}"`, 170);
      doc.text(splitMotivation, 20, yPos);
    } else {
      doc.text("AI analysis not computed yet. Please run live AI Analyzer first in dashboard.", 20, yPos);
    }
    
    // Save PDF
    doc.save(`Aura_Report_${profile.name.replace(/\s+/g, '_')}.pdf`);
    setToast('PDF download compiled successfully!');
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    fetchStudentsList();
    if (initialStudentId) {
      fetchStudentProfileDetails(initialStudentId);
    }
  }, [initialStudentId]);

  useEffect(() => {
    const handleUpdate = (payload?: { userId?: string }) => {
      console.log('[StudentManager] Real-time refresh triggered', payload);
      fetchStudentsList();
      if (selectedStudentId && (!payload || !payload.userId || payload.userId === selectedStudentId)) {
        fetchStudentProfileDetails(selectedStudentId);
      }
    };

    socket.on('dashboard_updated', handleUpdate);
    socket.on('classroom_updated', handleUpdate);
    socket.on('leaderboard_updated', handleUpdate);
    
    const handleAICompleted = (payload?: { studentId?: string }) => {
      console.log('[StudentManager] Socket event: ai_analysis_completed', payload);
      if (selectedStudentId && (!payload || !payload.studentId || payload.studentId === selectedStudentId)) {
        fetchStudentProfileDetails(selectedStudentId);
      }
    };
    socket.on('ai_analysis_completed', handleAICompleted);

    return () => {
      socket.off('dashboard_updated', handleUpdate);
      socket.off('classroom_updated', handleUpdate);
      socket.off('leaderboard_updated', handleUpdate);
      socket.off('ai_analysis_completed', handleAICompleted);
    };
  }, [selectedStudentId]);

  // Filter & Sort Logic
  const filteredStudents = students
    .filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          (s.rollNumber && s.rollNumber.toLowerCase().includes(search.toLowerCase()));
      const matchRisk = filterRisk === 'all' || s.riskLevel === filterRisk;
      return matchSearch && matchRisk;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'marks') return (b.avgMarks || 0) - (a.avgMarks || 0);
      if (sortBy === 'risk') return String(a.riskLevel).localeCompare(String(b.riskLevel));
      return 0;
    });

  return (
    <div className="space-y-6">
      
      {/* Toast alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-cyan-950/90 border border-cyan-500/30 text-cyan-300 font-bold backdrop-blur-md shadow-2xl animate-bounce text-xs">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: List exploration */}
        <div className="xl:col-span-1 space-y-4">
          <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="h-5 w-5 text-cyan-400" />
                Student Directories
              </h3>
              <button 
                onClick={fetchStudentsList}
                className="p-1.5 rounded-lg bg-slate-950/50 border border-slate-850 text-slate-400 hover:text-white cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Controls */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or roll..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/55 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-550"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Risk Status</label>
                  <select
                    value={filterRisk}
                    onChange={(e) => setFilterRisk(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950/55 border border-slate-850 rounded-xl text-[11px] text-slate-300 focus:outline-none"
                  >
                    <option value="all">All levels</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Sort Metric</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950/55 border border-slate-850 rounded-xl text-[11px] text-slate-300 focus:outline-none"
                  >
                    <option value="name">Name</option>
                    <option value="marks">Highest Marks</option>
                    <option value="risk">Risk Status</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Roster list */}
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-12 text-xs text-slate-400 font-bold">
                  Loading student registry...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 font-semibold">
                  No match found.
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => {
                      fetchStudentProfileDetails(student.id);
                      onSelectStudent?.(student.id);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                      selectedStudentId === student.id
                        ? 'bg-slate-950/70 border-cyan-500/30 shadow shadow-cyan-500/5'
                        : 'bg-slate-950/30 border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <h4 className={`text-xs font-bold transition-colors ${
                        selectedStudentId === student.id ? 'text-cyan-400' : 'text-white group-hover:text-cyan-400'
                      }`}>
                        {student.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">{student.rollNumber || 'No Roll'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-white">{student.avgMarks}%</span>
                      <div className="mt-1">
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-extrabold uppercase ${
                          student.riskLevel === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          student.riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {student.riskLevel || 'low'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        {/* Right Columns: Interactive Profiles detail (bento layout) */}
        <div className="xl:col-span-2 space-y-6">
          {detailsLoading ? (
            <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin h-6 w-6 text-cyan-400" />
              Retrieving academic analytics logs...
            </div>
          ) : !studentDetails ? (
            <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 font-semibold text-xs flex flex-col items-center justify-center gap-3">
              <User className="h-10 w-10 text-slate-650" />
              Select a student from the directory to review high-fidelity grades, automatic alert profiles, and live Gemini cognitive diagnostics.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Header profile info banner */}
              <div className="backdrop-blur-md bg-gradient-to-r from-slate-900/50 to-slate-900/30 border border-slate-800/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-violet-500/25 border border-cyan-500/20 flex items-center justify-center">
                    <User className="h-7 w-7 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">{studentDetails.profile.name}</h3>
                    <p className="text-xs text-slate-400">{studentDetails.profile.email} | Roll: {studentDetails.profile.rollNumber} | {studentDetails.profile.currentSemester}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={generatePDFReport}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF Report
                  </button>
                  <button
                    onClick={handleRunAISystem}
                    disabled={runningAI}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-cyan-500/10"
                  >
                    {runningAI ? (
                      <>
                        <Loader2 className="animate-spin h-3.5 w-3.5" />
                        AI Tuning...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                        Run Gemini AI
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grid: Academic scores & Dynamic active alert triggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Grades & Assessments */}
                <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
                    <Award className="h-4 w-4 text-cyan-400" />
                    Assessment Registry
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {studentDetails.marks?.map((m: any) => (
                      <div key={m.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-950/40 border border-slate-850 text-xs">
                        <div>
                          <span className="font-bold text-white block">{m.subject}</span>
                          <span className="text-[10px] text-slate-500">{m.examType}</span>
                        </div>
                        <span className={`font-black ${m.marksObtained < 50 ? 'text-rose-400' : 'text-slate-200'}`}>
                          {m.marksObtained}/{m.maxMarks}
                        </span>
                      </div>
                    ))}
                    {(!studentDetails.marks || studentDetails.marks.length === 0) && (
                      <p className="text-center py-6 text-slate-500 text-xs font-semibold">No registered score logs.</p>
                    )}
                  </div>
                </div>

                {/* Live Automatic Alerts */}
                <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    Automatic Academic Alerts
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {studentDetails.alerts?.map((alert: any) => (
                      <div 
                        key={alert.id} 
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                          alert.severity === 'high' 
                            ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' 
                            : 'bg-amber-950/10 border-amber-500/20 text-amber-300'
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-extrabold uppercase text-[9px] tracking-wider block mb-0.5">{alert.type}</span>
                          <p className="text-[11px] leading-relaxed">{alert.message}</p>
                        </div>
                      </div>
                    ))}
                    {(!studentDetails.alerts || studentDetails.alerts.length === 0) && (
                      <div className="p-4 rounded-lg bg-emerald-950/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2 text-xs">
                        <ShieldCheck className="h-5 w-5" />
                        <span>All core parameters (Attendance, Grades consistency, homework submissions) are clear. No active risk alerts!</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Large Bento: AI Cognitive Insights details */}
              {aiAnalysis && (
                <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
                    <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
                    <div>
                      <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Predictive Cognitive Diagnostics</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Powered by Google Gemini 3.5 Pro Analysis</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    
                    {/* Summary */}
                    <div className="space-y-2 md:col-span-3">
                      <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest block">Summary Diagnosis</span>
                      <p className="text-slate-300 leading-relaxed text-xs p-3.5 rounded-xl bg-slate-950/40 border border-slate-850/60 font-medium">
                        {aiAnalysis.summary}
                      </p>
                    </div>

                    {/* Strengths */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block">Academic Strengths</span>
                      <ul className="space-y-1.5">
                        {aiAnalysis.strengths?.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest block">Areas for Improvement</span>
                      <ul className="space-y-1.5">
                        {aiAnalysis.weaknesses?.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest block">Action Recommendations</span>
                      <ul className="space-y-1.5">
                        {aiAnalysis.recommendations?.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weekly Plan */}
                    {aiAnalysis.weeklyPlan && (
                      <div className="space-y-2.5 md:col-span-3 border-t border-slate-850/60 pt-4">
                        <span className="text-[10px] font-extrabold text-violet-400 uppercase tracking-widest block">Adaptive Weekly Study Roadmap</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {aiAnalysis.weeklyPlan.map((plan: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-950/40 border border-slate-850/60 rounded-xl">
                              <span className="text-[10px] font-extrabold text-violet-400 uppercase font-mono block mb-1">{plan.day}</span>
                              <p className="text-slate-300 text-[11px] leading-relaxed">{plan.task}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resources & Careers */}
                    <div className="space-y-2.5 md:col-span-2 border-t border-slate-850/60 pt-4">
                      <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block">Suggested Career Paths & Curriculum resources</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                        <div className="p-3 rounded-lg bg-slate-950/20 border border-slate-850">
                          <span className="text-[9px] font-extrabold text-amber-400 uppercase block mb-1.5">Careers</span>
                          <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                            {aiAnalysis.careerSuggestions?.map((c: string, i: number) => <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-950/20 border border-slate-850">
                          <span className="text-[9px] font-extrabold text-cyan-400 uppercase block mb-1.5">Learning Materials</span>
                          <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                            {aiAnalysis.learningResources?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Numeric Diagnostics */}
                    <div className="space-y-3 border-t border-slate-850/60 pt-4 text-center md:col-span-1 flex flex-col justify-center">
                      <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                        <div>
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase">Recommended Study Hours</span>
                          <h5 className="text-xl font-black text-white">{aiAnalysis.studyHours || 12} hrs / wk</h5>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-extrabold uppercase block">Predicted Exam Readiness</span>
                          <div className="flex items-center justify-center gap-1.5 mt-0.5">
                            <span className="text-sm font-black text-cyan-400">{aiAnalysis.examReadiness || 50}%</span>
                            <span className="text-[10px] text-slate-500 font-medium">Readiness index</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
