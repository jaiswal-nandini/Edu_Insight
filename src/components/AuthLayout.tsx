/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogIn, UserPlus, Shield, GraduationCap, Users, Loader2 } from 'lucide-react';
import { User, UserRole } from '../types';

interface AuthLayoutProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthLayout({ onLoginSuccess }: AuthLayoutProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [rollNumber, setRollNumber] = useState('');
  const [semester, setSemester] = useState('Semester 4');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Login failed.');
        }

        setMessage('Login successful! Redirecting...');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 800);
      } else {
        const extraInfo = role === 'student' 
          ? { rollNumber, semester } 
          : role === 'teacher' 
            ? { department } 
            : {};

        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, extraInfo })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Signup failed.');
        }

        setMessage('Registration successful! Please login with your credentials.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background visual accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-200 to-violet-400 bg-clip-text text-transparent">
            EduInsight
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          {isLogin ? 'Sign in to EduInsight' : 'Create academic account'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Transforming Academic Performance Through AI
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg z-10 px-4">
        <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/80 shadow-2xl rounded-2xl py-8 px-6 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {error && (
              <div className="p-4 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-sm animate-pulse">
                {error}
              </div>
            )}

            {message && (
              <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-sm">
                {message}
              </div>
            )}

            {!isLogin && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-4 py-2.5 bg-slate-950/55 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
                    placeholder="Dr. Sarah Jenkins or Alice Cooper"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Platform Role
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        role === 'student'
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <GraduationCap className="h-5 w-5 mb-1" />
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        role === 'teacher'
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <Users className="h-5 w-5 mb-1" />
                      Teacher
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        role === 'admin'
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <Shield className="h-5 w-5 mb-1" />
                      Admin
                    </button>
                  </div>
                </div>

                {role === 'student' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="roll" className="block text-sm font-medium text-slate-300">
                        Roll Number
                      </label>
                      <input
                        id="roll"
                        type="text"
                        required
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        className="mt-1 block w-full px-4 py-2.5 bg-slate-950/55 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                        placeholder="S2026-105"
                      />
                    </div>
                    <div>
                      <label htmlFor="sem" className="block text-sm font-medium text-slate-300">
                        Semester
                      </label>
                      <select
                        id="sem"
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="mt-1 block w-full px-4 py-2.5 bg-slate-950/55 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                      >
                        <option value="Semester 1">Semester 1</option>
                        <option value="Semester 2">Semester 2</option>
                        <option value="Semester 3">Semester 3</option>
                        <option value="Semester 4">Semester 4</option>
                        <option value="Semester 5">Semester 5</option>
                        <option value="Semester 6">Semester 6</option>
                      </select>
                    </div>
                  </div>
                )}

                {role === 'teacher' && (
                  <div>
                    <label htmlFor="dept" className="block text-sm font-medium text-slate-300">
                      Department
                    </label>
                    <input
                      id="dept"
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="mt-1 block w-full px-4 py-2.5 bg-slate-950/55 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                      placeholder="e.g. Information Technology"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-2.5 bg-slate-950/55 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
                placeholder="you@school.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-2.5 bg-slate-950/55 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
                placeholder="••••••••"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all transform hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : isLogin ? (
                  <>
                    <LogIn className="mr-2 h-5 w-5" /> Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" /> Create Account
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setMessage('');
              }}
              className="text-sm font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>


        </div>
      </div>
    </div>
  );
}
