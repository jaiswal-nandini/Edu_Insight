/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, User, Trophy, Sparkles, MessageSquare, Award, ArrowRight, Shield } from 'lucide-react';
import { Classroom, User as UserType } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  classrooms: Classroom[];
  students: any[];
  onNavigate: (path: string) => void;
  onSync: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  user,
  classrooms,
  students,
  onNavigate,
  onSync
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Build list of searchable items based on user role
  const defaultActions = [
    { id: 'nav-dashboard', title: 'Go to Overview Portal', category: 'Navigation', icon: Trophy, action: () => onNavigate('/dashboard') },
    { id: 'nav-classrooms', title: 'Go to Classrooms', category: 'Navigation', icon: BookOpen, action: () => onNavigate('/classrooms') },
    { id: 'nav-leaderboard', title: 'Go to Leaderboard', category: 'Navigation', icon: Trophy, action: () => onNavigate('/leaderboard') },
    { id: 'sys-sync', title: 'Force-sync Academic Core Statistics', category: 'System Action', icon: ArrowRight, action: () => { onSync(); onClose(); } },
  ];

  if (user.role === 'student') {
    defaultActions.push(
      { id: 'nav-insights', title: 'Consult AI Study Counselor', category: 'AI Tools', icon: Sparkles, action: () => onNavigate('/ai_insights') },
      { id: 'nav-complaints', title: 'Submit Course Feedback', category: 'Feedback', icon: MessageSquare, action: () => onNavigate('/complaints') }
    );
  }

  if (user.role === 'teacher') {
    defaultActions.push(
      { id: 'nav-marks', title: 'Manage Student Marks / Gradebooks', category: 'Faculty', icon: Award, action: () => onNavigate('/marks') },
      { id: 'nav-students', title: 'Explore Student Rosters', category: 'Faculty', icon: User, action: () => onNavigate('/students') },
      { id: 'nav-complaints', title: 'Review Feedback Logs', category: 'Feedback', icon: MessageSquare, action: () => onNavigate('/complaints') }
    );
  }

  if (user.role === 'admin') {
    defaultActions.push(
      { id: 'nav-students', title: 'Manage System Students Registry', category: 'System Admin', icon: Shield, action: () => onNavigate('/students') },
      { id: 'nav-complaints', title: 'Manage Compliancy Center Case Files', category: 'System Admin', icon: Shield, action: () => onNavigate('/complaints') }
    );
  }

  // Map classrooms
  const classroomItems = classrooms.map(c => ({
    id: `classroom-${c.id}`,
    title: `Classroom: ${c.className} (${c.subject})`,
    category: 'Classrooms',
    icon: BookOpen,
    action: () => onNavigate(`/classroom/${c.id}`)
  }));

  // Map students (if visible to role)
  const studentItems = (user.role === 'teacher' || user.role === 'admin')
    ? students.map(s => ({
        id: `student-${s.id}`,
        title: `Student Profile: ${s.name} (${s.rollNumber || 'S-Record'})`,
        category: 'Students Registry',
        icon: User,
        action: () => onNavigate(`/student/${s.id}`)
      }))
    : [];

  const allItems = [...defaultActions, ...classroomItems, ...studentItems];

  // Simple fuzzy filter
  const filteredItems = allItems.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 font-sans">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Box */}
      <div className="w-full max-w-lg rounded-2xl bg-slate-950/95 dark:bg-slate-950/95 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 shadow-2xl flex flex-col overflow-hidden z-10 transition-all duration-300">
        
        {/* Search Input block */}
        <div className="p-4 border-b border-slate-900/60 dark:border-slate-900/60 light:border-slate-100 flex items-center gap-3">
          <Search className="h-4.5 w-4.5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a course, student roll, or page command to search..."
            className="w-full bg-transparent text-xs text-text-main placeholder-slate-500 focus:outline-none focus:ring-0"
          />
          <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 dark:bg-slate-900 dark:border-slate-800 light:bg-slate-100 light:border-slate-200 text-slate-400 px-1.5 py-0.5 rounded shadow-sm shrink-0 uppercase">
            Esc
          </span>
        </div>

        {/* Search Results */}
        <div 
          ref={listRef}
          className="flex-1 max-h-[320px] overflow-y-auto p-2 space-y-1 scrollbar-thin divide-y divide-slate-900/10"
        >
          {filteredItems.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-500 font-semibold">No results match your lookup.</p>
          ) : (
            Object.entries(
              filteredItems.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {} as Record<string, typeof filteredItems>)
            ).map(([category, items]) => (
              <div key={category} className="py-2 first:pt-0">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 px-3.5 block mb-1.5">{category}</span>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const globalIdx = filteredItems.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.action();
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/5 text-cyan-400'
                            : 'text-text-main hover:bg-slate-900/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <span className="truncate max-w-[320px]">{item.title}</span>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                            Jump <ArrowRight className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer info bar */}
        <div className="p-2.5 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border-t border-slate-900 dark:border-slate-900 light:border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium px-4">
          <div className="flex items-center gap-2">
            <span>↑↓ to navigate</span>
            <span>•</span>
            <span>↵ to select</span>
          </div>
          <span>Aura Search Engine</span>
        </div>

      </div>
    </div>
  );
}
