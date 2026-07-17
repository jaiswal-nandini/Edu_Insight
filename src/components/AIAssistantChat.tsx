/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, User, CornerDownLeft, MessageSquare } from 'lucide-react';
import { User as UserType } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface AIAssistantChatProps {
  user: UserType;
}

export default function AIAssistantChat({ user }: AIAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hello ${user.name}! I am EduInsight AI, your context-aware Academic Intelligence assistant. I have connected to your direct school records and institution dashboards.\n\nAsk me anything or use the smart templates below!`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Suggestions based on role
  const suggestions = {
    student: [
      'Why are my marks low?',
      'Suggest a 3-day study plan',
      'What is my current average grade?'
    ],
    teacher: [
      'Which students need attention?',
      'Analyze class risk distribution',
      'Summarize student complaints'
    ],
    admin: [
      'Generate institute report',
      'Check system warnings',
      'Audit pending complaints'
    ]
  }[user.role] || ['Help me analyze academy stats'];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsgId = `user_${Date.now()}`;
    const newMsg: Message = {
      id: userMsgId,
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      // Map format for api
      const chatHistory = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userRole: user.role,
          message: textToSend,
          chatHistory
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            text: data.reply || "I'm sorry, I couldn't formulate a response.",
            timestamp: new Date()
          }
        ]);
      } else {
        throw new Error(data.error || 'Failed to sync with EduInsight.');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: 'assistant',
          text: `⚠️ Connection Error: ${err.message || 'Unable to sync with academic core. Please try again.'}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-[360px] sm:w-[400px] h-[550px] rounded-2xl bg-slate-950/90 dark:bg-slate-950/90 light:bg-white/95 backdrop-blur-xl border border-slate-800/80 light:border-slate-200 shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-cyan-950/40 to-violet-950/40 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Sparkles className="h-4.5 w-4.5 text-white animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    EduInsight AI Assistant
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </h4>
                  <span className="text-[9px] text-slate-400 font-mono">Academic Intelligence Co-pilot</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${
                    m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border ${
                      m.role === 'user'
                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                        : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                    }`}
                  >
                    {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-500/20 text-slate-100 rounded-tr-none'
                        : 'bg-slate-900/35 border border-slate-850/80 text-slate-200 rounded-tl-none font-medium'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="h-7 w-7 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 animate-bounce" />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-900/20 border border-slate-850/60 text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && !loading && (
              <div className="px-4 pb-2 pt-1 flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Suggested Actions</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-850 text-[10px] text-slate-300 hover:text-white hover:border-slate-750 transition-all cursor-pointer text-left font-semibold"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Box */}
            <div className="p-3 border-t border-slate-800/60 bg-slate-950/40">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="flex items-center gap-2 relative"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  placeholder={`Ask EduInsight about your ${user.role} data...`}
                  className="w-full pl-3.5 pr-10 py-2 bg-slate-950/80 border border-slate-850 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="absolute right-1.5 top-1.5 p-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none text-white cursor-pointer transition-all flex items-center justify-center"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button Toggle */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="h-12 w-12 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 cursor-pointer text-white relative group"
        id="aura-chat-trigger"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="absolute right-14 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 px-2 py-1 rounded-md font-bold whitespace-nowrap shadow-xl">
          Chat with EduInsight
        </span>
      </motion.button>
    </div>
  );
}
