/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Trophy, TrendingUp, TrendingDown, Award, 
  Search, ShieldAlert, GraduationCap, Percent 
} from 'lucide-react';

interface StudentLeaderboardItem {
  userId: string;
  name: string;
  rollNumber: string;
  avgMarks: number;
  rank: number;
  riskLevel: 'low' | 'medium' | 'high';
  knowledgeScore: number;
}

interface LeaderboardProps {
  leaderboard: StudentLeaderboardItem[];
}

export default function Leaderboard({ leaderboard }: LeaderboardProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredLeaderboard = leaderboard.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics calculation
  const totalStudents = leaderboard.length;
  const classAverage = totalStudents > 0 
    ? Math.round((leaderboard.reduce((acc, curr) => acc + curr.avgMarks, 0) / totalStudents) * 10) / 10
    : 0;

  const topPerformers = [...leaderboard].slice(0, 3);
  const lowestPerformers = [...leaderboard]
    .filter(item => item.avgMarks < 60)
    .sort((a, b) => a.avgMarks - b.avgMarks);

  const passPercentage = totalStudents > 0
    ? Math.round((leaderboard.filter(item => item.avgMarks >= 50).length / totalStudents) * 100)
    : 100;

  return (
    <div className="space-y-6">
      
      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Class average overview card */}
        <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class Average</span>
            <h4 className="text-3xl font-black text-slate-900 dark:text-white">{classAverage}%</h4>
            <div className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400">
              <TrendingUp className="h-3 w-3" />
              <span>Target Standard: 70%</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
            <Trophy className="h-6 w-6" />
          </div>
        </div>

        {/* Pass rate card */}
        <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pass Percentage</span>
            <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{passPercentage}%</h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Standard cutoff: 50%</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Percent className="h-6 w-6" />
          </div>
        </div>

        {/* High Risk warning card */}
        <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Requiring Support</span>
            <h4 className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {leaderboard.filter(s => s.avgMarks < 55).length} Students
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Grades below 55% average</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            <TrendingDown className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Spotlights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 3 Performers */}
        <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500 dark:text-amber-400" />
            Top Academic Performers
          </h3>
          <div className="space-y-3">
            {topPerformers.map((student, idx) => (
              <div 
                key={student.userId}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850/60 hover:border-slate-300 dark:hover:border-slate-700/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-extrabold text-sm ${
                    idx === 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                    idx === 1 ? 'bg-slate-300/10 text-slate-600 dark:text-slate-300 border border-slate-400/20' :
                    'bg-amber-700/10 text-amber-700 dark:text-amber-600 border border-amber-800/20'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">{student.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{student.rollNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-800 dark:text-white">{student.avgMarks}%</span>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Mastery: {student.knowledgeScore}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Action Needed */}
        <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            At Risk Spotlights
          </h3>
          <div className="space-y-3">
            {lowestPerformers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                No students currently flagged below critical thresholds! 🌟
              </div>
            ) : (
              lowestPerformers.slice(0, 3).map((student) => (
                <div 
                  key={student.userId}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850/60 hover:border-slate-300 dark:hover:border-slate-700/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-xs">
                      !
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">{student.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{student.rollNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-rose-500 dark:text-rose-400">{student.avgMarks}%</span>
                    <p className="text-[10px] text-rose-500 font-bold uppercase">At Risk</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Main Leaderboard Table */}
      <div className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Table Controls */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wider uppercase flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
            Academic Ranks Leaderboard
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or roll..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-1.5 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Leaderboard list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-850 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-950/15">
                <th className="py-3 px-6">Rank</th>
                <th className="py-3 px-6">Student Name</th>
                <th className="py-3 px-6">Roll Number</th>
                <th className="py-3 px-6">Avg Marks</th>
                <th className="py-3 px-6">Knowledge Index</th>
                <th className="py-3 px-6 text-right">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-850/60">
              {filteredLeaderboard.map((student) => (
                <tr 
                  key={student.userId}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 text-xs transition-colors"
                >
                  <td className="py-4 px-6 font-bold text-slate-800 dark:text-white">
                    #{student.rank}
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-slate-800 dark:text-white">{student.name}</span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-mono">
                    {student.rollNumber}
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-200">
                    {student.avgMarks}%
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 dark:bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-cyan-500 dark:bg-cyan-400 h-1.5 rounded-full" 
                          style={{ width: `${student.knowledgeScore}%` }} 
                        />
                      </div>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">{student.knowledgeScore}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      student.riskLevel === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      student.riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {student.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredLeaderboard.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 font-semibold text-xs">
                    No matching student records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
