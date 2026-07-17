/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Award, Calendar, BarChart3, AlertTriangle, 
  Users, BookOpen, MessageSquare, ShieldAlert,
  UserCheck, CheckSquare
} from 'lucide-react';

interface CardProps {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export function StatCard({ id, title, value, icon, description, trend, color }: CardProps) {
  const colorMap = {
    cyan: 'from-cyan-500/10 to-cyan-500/0 border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    violet: 'from-violet-500/10 to-violet-500/0 border-violet-500/20 text-violet-600 dark:text-violet-400',
    emerald: 'from-emerald-500/10 to-emerald-500/0 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    amber: 'from-amber-500/10 to-amber-500/0 border-amber-500/20 text-amber-600 dark:text-amber-400',
    rose: 'from-rose-500/10 to-rose-500/0 border-rose-500/20 text-rose-600 dark:text-rose-400',
    slate: 'from-slate-500/10 to-slate-500/0 border-slate-500/20 text-slate-600 dark:text-slate-400',
  };

  const bgGradient = colorMap[color] || colorMap.cyan;

  return (
    <div 
      id={id}
      className={`backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:bg-white/90 dark:hover:bg-slate-900/50 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-950/40 flex items-start justify-between relative overflow-hidden group`}
    >
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${
        color === 'cyan' ? 'from-cyan-500 to-blue-500' :
        color === 'violet' ? 'from-violet-500 to-fuchsia-500' :
        color === 'emerald' ? 'from-emerald-500 to-teal-500' :
        color === 'amber' ? 'from-amber-500 to-orange-500' :
        color === 'rose' ? 'from-rose-500 to-pink-500' :
        'from-slate-500 to-slate-700'
      }`} />
      
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</h3>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className={trend.isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}>
              {trend.value}
            </span>
            <span className="text-slate-400 dark:text-slate-500">vs last term</span>
          </div>
        )}
      </div>

      <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 group-hover:border-slate-300 dark:group-hover:border-slate-700 transition-all ${
        color === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' :
        color === 'violet' ? 'text-violet-600 dark:text-violet-400' :
        color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
        color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
        color === 'rose' ? 'text-rose-600 dark:text-rose-400' :
        'text-slate-500 dark:text-slate-400'
      }`}>
        {icon}
      </div>
    </div>
  );
}

interface DashboardCardsProps {
  role: 'student' | 'teacher' | 'admin';
  data: any; // Aggregated backend metrics
}

export default function DashboardCards({ role, data }: DashboardCardsProps) {
  if (!data) return null;

  if (role === 'student') {
    const profile = data.profile || {};
    const riskColor = 
      profile.riskLevel === 'high' ? 'rose' :
      profile.riskLevel === 'medium' ? 'amber' : 'emerald';

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          id="student-avg-marks"
          title="Average Marks"
          value={`${profile.avgMarks ?? 0}%`}
          icon={<Award className="h-6 w-6" />}
          description="GPA Cumulative Rating"
          color="cyan"
        />
        <StatCard
          id="student-attendance"
          title="Overall Attendance"
          value={`${Math.round(profile.overallAttendancePct ?? 100)}%`}
          icon={<Calendar className="h-6 w-6" />}
          description="Lectures present quotient"
          color="violet"
        />
        <StatCard
          id="student-rank"
          title="Classroom Rank"
          value={`#${profile.rank ?? 1}`}
          icon={<BarChart3 className="h-6 w-6" />}
          description={`Out of ${data.classrooms?.length || 1} registered classrooms`}
          color="emerald"
        />
        <StatCard
          id="student-risk-level"
          title="Academic Risk Level"
          value={String(profile.riskLevel || 'low').toUpperCase()}
          icon={<AlertTriangle className="h-6 w-6" />}
          description="AI Predictive Status"
          color={riskColor}
        />
      </div>
    );
  }

  if (role === 'teacher') {
    const m = data.metrics || {};
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          id="teacher-total-students"
          title="Total Students"
          value={m.totalStudents ?? 0}
          icon={<Users className="h-6 w-6" />}
          description="Active class roster size"
          color="cyan"
        />
        <StatCard
          id="teacher-classrooms"
          title="Classes & Subjects"
          value={m.totalClasses ?? 0}
          icon={<BookOpen className="h-6 w-6" />}
          description="Total active courses"
          color="violet"
        />
        <StatCard
          id="teacher-avg-marks"
          title="Term Grade Average"
          value={`${m.averageMarks ?? 0}%`}
          icon={<BarChart3 className="h-6 w-6" />}
          description="Consolidated classroom scores"
          color="emerald"
        />
        <StatCard
          id="teacher-at-risk"
          title="Students At Risk"
          value={m.atRiskStudents ?? 0}
          icon={<ShieldAlert className="h-6 w-6" />}
          description="Predictive failure flags"
          color={m.atRiskStudents > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          id="teacher-complaints"
          title="Total Feedback Reports"
          value={m.totalComplaints ?? 0}
          icon={<MessageSquare className="h-6 w-6" />}
          description={`${m.pendingComplaints ?? 0} pending review`}
          color="amber"
        />
      </div>
    );
  }

  if (role === 'admin') {
    const m = data.metrics || {};
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          id="admin-total-students"
          title="Students"
          value={m.totalStudents ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="cyan"
        />
        <StatCard
          id="admin-total-teachers"
          title="Faculty Members"
          value={m.totalTeachers ?? 0}
          icon={<UserCheck className="h-5 w-5" />}
          color="violet"
        />
        <StatCard
          id="admin-total-classes"
          title="Classrooms"
          value={m.totalClasses ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          id="admin-total-complaints"
          title="Complaints File"
          value={m.totalComplaints ?? 0}
          icon={<MessageSquare className="h-5 w-5" />}
          color="rose"
        />
        <StatCard
          id="admin-total-subjects"
          title="Course Subjects"
          value={m.totalSubjects ?? 0}
          icon={<CheckSquare className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          id="admin-active-users"
          title="Online / Active"
          value={m.totalActiveUsers ?? 0}
          icon={<UserCheck className="h-5 w-5" />}
          color="slate"
        />
      </div>
    );
  }

  return null;
}
