/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RefreshCw, Award, BookOpen, Clock, Play, 
  Download, FileText, Compass, ChevronRight, HeartHandshake, Loader2,
  Calendar, CheckSquare, AlertTriangle
} from 'lucide-react';
import { AIAnalysis, User } from '../types';
import { jsPDF } from 'jspdf';

interface AIInsightsViewProps {
  user: User;
  initialAnalysis: AIAnalysis | null;
}

export default function AIInsightsView({ user, initialAnalysis }: AIInsightsViewProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(initialAnalysis);
  const [loading, setLoading] = useState(false);
  const [parentLetter, setParentLetter] = useState('');
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleTriggerLiveAI = async () => {
    setLoading(true);
    setParentLetter('');
    try {
      const response = await fetch('/api/ai/analyze-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.id })
      });
      const data = await response.json();
      if (response.ok) {
        setAnalysis(data.analysis);
        showToast('Cognitive predictive roadmap generated!');
      }
    } catch (err) {
      showToast('Error generating AI study plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateParentLetter = async () => {
    setGeneratingLetter(true);
    try {
      const response = await fetch('/api/ai/parent-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.id })
      });
      const data = await response.json();
      if (response.ok) {
        setParentLetter(data.report || '');
        showToast('Parent counseling letter generated!');
      }
    } catch (err) {
      showToast('Failed to compile counseling letter.');
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleExportPDF = () => {
    if (!analysis) return;
    const doc = new jsPDF();
    
    // Header Style
    doc.setFillColor(15, 23, 42); // slate-900 background for title block
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PERSONALIZED AI COGNITIVE ROADMAP", 20, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // light slate
    doc.text(`EduInsight Academic Intelligence Center - Generated: ${new Date().toLocaleDateString()}`, 20, 32);
    
    // Profile
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`STUDENT ACCOUNT: ${user.name} (${user.email})`, 20, 60);
    doc.line(20, 64, 190, 64);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE DIAGNOSIS:", 20, 74);
    doc.setFont("helvetica", "normal");
    const splitSummary = doc.splitTextToSize(analysis.summary, 170);
    doc.text(splitSummary, 20, 80);
    
    let yPos = 80 + (splitSummary.length * 5) + 8;
    
    doc.setFont("helvetica", "bold");
    doc.text("COGNITIVE ACADEMIC STRENGTHS:", 20, yPos);
    doc.setFont("helvetica", "normal");
    let strengthsText = (analysis.strengths || []).map((s, idx) => `${idx + 1}. ${s}`).join('\n');
    const splitStr = doc.splitTextToSize(strengthsText, 170);
    doc.text(splitStr, 20, yPos + 6);
    
    yPos += (splitStr.length * 5) + 12;
    
    doc.setFont("helvetica", "bold");
    doc.text("ADAPTIVE WEEKLY STUDY TASKS:", 20, yPos);
    doc.setFont("helvetica", "normal");
    let planText = (analysis.weeklyPlan || []).map(p => `* ${p.day}: ${p.task}`).join('\n');
    const splitPlan = doc.splitTextToSize(planText, 170);
    doc.text(splitPlan, 20, yPos + 6);
    
    yPos += (splitPlan.length * 5) + 14;
    
    doc.setFont("helvetica", "bold");
    doc.text("RECOMMENDED PREPARATION METRICS:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`* Recommended Focus Study Allocation: ${analysis.studyHours || 12} hours per week`, 20, yPos + 6);
    doc.text(`* Predicted Examination Readiness Index: ${analysis.examReadiness || 50}% probability mastery`, 20, yPos + 12);
    
    doc.save(`EduInsight_AI_StudyPlan_${user.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast notifications */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-cyan-950/90 border border-cyan-500/30 text-cyan-300 font-bold backdrop-blur-md shadow-2xl animate-bounce text-xs">
          {toast}
        </div>
      )}

      {/* Action panel */}
      <div className="backdrop-blur-md bg-gradient-to-r from-white/80 to-white/60 dark:from-slate-900/50 dark:to-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-violet-500/25 border border-cyan-500/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-cyan-500 dark:text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">EduInsight Academic AI Counselor</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Generate on-demand predictive academic audits, cognitive weakpoint diagnosis, and daily schedules using Gemini.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleTriggerLiveAI}
            disabled={loading}
            className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg shadow-cyan-500/10"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-3.5 w-3.5" />
                Analyzing Grades...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Run Live AI Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {!analysis ? (
        <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500 font-semibold text-xs flex flex-col items-center justify-center gap-3 shadow-sm">
          <Sparkles className="h-10 w-10 text-cyan-500/30 animate-pulse" />
          No AI roadmap calculated yet. Click the "Run Live AI Analysis" button above to initiate predictive academic audits.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Bento Column 1: Summary, Strengths, Weaknesses */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Summary narrative card */}
            <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
              <span className="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block">Executive Narrative</span>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold p-4 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850">
                "{analysis.summary}"
              </p>
            </div>

            {/* Strengths / Improvement Areas Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-sm">
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block flex items-center gap-1">
                  <Award className="h-4 w-4" /> Cognitive Strengths
                </span>
                <ul className="space-y-2">
                  {analysis.strengths?.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-sm">
                <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-widest block flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Improvement Goals
                </span>
                <ul className="space-y-2">
                  {analysis.weaknesses?.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 dark:bg-rose-400 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Recommendations List */}
            <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-3 shadow-sm">
              <span className="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block flex items-center gap-1">
                <BookOpen className="h-4 w-4" /> Actionable Counselor Recommendations
              </span>
              <ul className="space-y-2.5">
                {analysis.recommendations?.map((item, idx) => (
                  <li key={idx} className="p-3 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-3">
                    <span className="h-5 w-5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-extrabold text-[11px] shrink-0">
                      {idx + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Academic Coach Tactics - Collapsible Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Learning Strategy */}
              <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-widest block flex items-center gap-1">
                    <Sparkles className="h-4 w-4" /> Learning Strategy
                  </span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(analysis.learningStrategy || '');
                      showToast('Copied strategy to clipboard!');
                    }}
                    className="text-[10px] text-cyan-500 hover:underline font-bold"
                  >
                    Copy
                  </button>
                </div>
                <div className="p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {analysis.learningStrategy || 'No custom strategy calculated yet.'}
                  </p>
                </div>
              </div>

              {/* Time Management Tips */}
              <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest block flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Time Management Tips
                  </span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText((analysis.timeManagementTips || []).join('\n'));
                      showToast('Copied tips to clipboard!');
                    }}
                    className="text-[10px] text-cyan-500 hover:underline font-bold"
                  >
                    Copy
                  </button>
                </div>
                <ul className="space-y-2">
                  {(analysis.timeManagementTips || [
                    'Dedicate study blocks to high-workload calculus concepts first.',
                    'Check database assignment release cycles daily.',
                    'Prioritize morning hours for heavy theoretical reasoning tasks.'
                  ]).map((tip, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-start gap-2 bg-amber-500/5 dark:bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                      <CheckSquare className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exam Prep Tips */}
              <div className="md:col-span-2 backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block flex items-center gap-1">
                    <Award className="h-4 w-4" /> Exam Preparation Tactics
                  </span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText((analysis.examPrepTips || []).join('\n'));
                      showToast('Copied exam tips!');
                    }}
                    className="text-[10px] text-cyan-500 hover:underline font-bold"
                  >
                    Copy All
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(analysis.examPrepTips || [
                    'Construct personal flash cards for fast database theorem reference.',
                    'Solve previous years mid-semester Calculus papers.',
                    'Perform active recall exercises prior to quizzes.'
                  ]).map((tip, idx) => (
                    <div key={idx} className="p-3 bg-cyan-500/5 dark:bg-cyan-500/5 border border-cyan-500/10 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-cyan-500 font-mono">Tip #{idx + 1}</span>
                      <p className="text-xs text-slate-850 dark:text-slate-200 leading-relaxed font-semibold">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly adaptive plan */}
            {analysis.weeklyPlan && (
              <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
                <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-widest block flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Personal Study Roadmap (Syllabus Tracking)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analysis.weeklyPlan.map((p, idx) => (
                    <div key={idx} className="p-4 bg-slate-50/60 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-xl space-y-2 group hover:border-slate-300 dark:hover:border-slate-750 transition-all">
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase font-mono tracking-wider block">{p.day}</span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">{p.task}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Bento Column 2: Stats widgets, Parent letter compilation, Resources */}
          <div className="space-y-6">
            
            {/* Visual metrics cards */}
            <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 text-center space-y-4 shadow-sm">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block text-left">Academic Predictors</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                  <span className="text-[8px] font-extrabold uppercase text-slate-500 block">Study Allocation</span>
                  <h4 className="text-sm font-black text-slate-850 dark:text-white mt-1 leading-none">{analysis.studyHours || 12} hrs</h4>
                </div>
                <div className="p-2.5 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                  <span className="text-[8px] font-extrabold uppercase text-slate-500 block">Exam Readiness</span>
                  <h4 className="text-sm font-black text-cyan-600 dark:text-cyan-400 mt-1 leading-none">{analysis.examReadiness || 50}%</h4>
                </div>
                <div className="p-2.5 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 rounded-xl">
                  <span className="text-[8px] font-extrabold uppercase text-slate-500 block">Pass Confidence</span>
                  <h4 className="text-sm font-black text-violet-600 dark:text-violet-400 mt-1 leading-none">{analysis.confidenceScore || 75}%</h4>
                </div>
              </div>

              <button
                onClick={handleExportPDF}
                className="w-full py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export Study Roadmap PDF
              </button>
            </div>

            {/* Careers & resources references */}
            <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest block flex items-center gap-1">
                <Compass className="h-4 w-4" /> Career paths & References
              </span>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Recommended Professions</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {analysis.careerSuggestions?.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-300 font-semibold text-[10px] uppercase font-mono">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-900/60 pt-3">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Recommended Platforms</span>
                  <ul className="space-y-1 list-disc pl-4 text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
                    {analysis.learningResources?.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Parent letter generator */}
            <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
              <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-widest block flex items-center gap-1">
                <HeartHandshake className="h-4 w-4" /> Counselor-to-Parent Letter
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Compile a formal academic counselor letter describing your semester rating to print or send to your parent/guardian.</p>
              
              {parentLetter ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-850 rounded-xl max-h-48 overflow-y-auto text-[10px] leading-relaxed text-slate-800 dark:text-slate-300 font-mono whitespace-pre-wrap">
                    {parentLetter}
                  </div>
                  <button
                    onClick={() => {
                      const doc = new jsPDF();
                      doc.setFont("courier", "normal");
                      doc.setFontSize(10);
                      const split = doc.splitTextToSize(parentLetter, 170);
                      doc.text(split, 20, 20);
                      doc.save(`EduInsight_Parent_Letter_${user.name}.pdf`);
                    }}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Letter PDF
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateParentLetter}
                  disabled={generatingLetter}
                  className="w-full py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/10"
                >
                  {generatingLetter ? (
                    <>
                      <Loader2 className="animate-spin h-3.5 w-3.5" />
                      Compiling Draft...
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" />
                      Compile Parent Letter (Gemini)
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Motivation Quote */}
            <div className="p-4 rounded-xl bg-gradient-to-tr from-cyan-500/5 to-violet-500/5 border border-cyan-500/10 text-center">
              <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block mb-1">Academic Encouragement</span>
              <p className="text-xs text-slate-800 dark:text-slate-300 italic font-semibold leading-relaxed">
                "{analysis.motivation}"
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
