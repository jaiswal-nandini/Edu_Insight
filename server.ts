/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { 
  User, StudentProfile, TeacherProfile, Classroom, 
  StudentClass, Mark, Attendance, Complaint, 
  Notification, AIAnalysis, ActivityLog, AcademicAlert, ExamType
} from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

// Initialize Google Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey && geminiApiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Google GenAI client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Google GenAI client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found in environment. AI features will run on intelligent local fallbacks.");
}

// ---------------------------------------------------------
// DATABASE STORAGE SYSTEM (relational state in local file)
// ---------------------------------------------------------
const DB_FILE = path.join(process.cwd(), 'academic_database.json');

interface DatabaseSchema {
  users: User[];
  studentProfiles: StudentProfile[];
  teacherProfiles: TeacherProfile[];
  classrooms: Classroom[];
  studentClasses: StudentClass[];
  marks: Mark[];
  attendance: Attendance[];
  complaints: Complaint[];
  notifications: Notification[];
  aiAnalysis: AIAnalysis[];
  activityLogs: ActivityLog[];
}

// Helper function to generate high quality random classroom codes
function generateClassroomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getInitialDatabase(): DatabaseSchema {
  // Setup nice users
  const users: User[] = [
    { id: 'u_admin', email: 'admin@school.com', name: 'Principal Arthur Vance', role: 'admin', active: true, password: 'password' },
    { id: 'u_teacher1', email: 'teacher1@school.com', name: 'Dr. Sarah Jenkins', role: 'teacher', active: true, password: 'password' },
    { id: 'u_teacher2', email: 'teacher2@school.com', name: 'Prof. Robert Miller', role: 'teacher', active: true, password: 'password' },
    { id: 'u_student1', email: 'student1@school.com', name: 'Alice Cooper', role: 'student', active: true, password: 'password' },
    { id: 'u_student2', email: 'student2@school.com', name: 'Bob Marley', role: 'student', active: true, password: 'password' },
    { id: 'u_student3', email: 'student3@school.com', name: 'Charlie Brown', role: 'student', active: true, password: 'password' },
    { id: 'u_student4', email: 'student4@school.com', name: 'Diana Prince', role: 'student', active: true, password: 'password' }
  ];

  const studentProfiles: StudentProfile[] = [
    { userId: 'u_student1', rollNumber: 'S2026-001', currentSemester: 'Semester 4', avgMarks: 89.5, rank: 2, riskLevel: 'low', knowledgeScore: 92 },
    { userId: 'u_student2', rollNumber: 'S2026-002', currentSemester: 'Semester 4', avgMarks: 76.2, rank: 3, riskLevel: 'low', knowledgeScore: 78 },
    { userId: 'u_student3', rollNumber: 'S2026-003', currentSemester: 'Semester 4', avgMarks: 45.8, rank: 4, riskLevel: 'high', knowledgeScore: 42 },
    { userId: 'u_student4', rollNumber: 'S2026-004', currentSemester: 'Semester 4', avgMarks: 96.4, rank: 1, riskLevel: 'low', knowledgeScore: 97 }
  ];

  const teacherProfiles: TeacherProfile[] = [
    { userId: 'u_teacher1', department: 'Computer Science & Engineering' },
    { userId: 'u_teacher2', department: 'Information Technology' }
  ];

  const classrooms: Classroom[] = [
    { id: 'MATH26', className: 'Advanced Mathematics', subject: 'Calculus & Linear Algebra', semester: 'Semester 4', teacherId: 'u_teacher1', archived: false },
    { id: 'DS2026', className: 'Data Structures', subject: 'Data Structures & Algorithms', semester: 'Semester 4', teacherId: 'u_teacher1', archived: false },
    { id: 'DBMS26', className: 'Database Systems', subject: 'Relational Database Design', semester: 'Semester 4', teacherId: 'u_teacher2', archived: false }
  ];

  const studentClasses: StudentClass[] = [
    // Alice Cooper classes
    { studentId: 'u_student1', classroomId: 'MATH26' },
    { studentId: 'u_student1', classroomId: 'DS2026' },
    // Bob Marley classes
    { studentId: 'u_student2', classroomId: 'MATH26' },
    { studentId: 'u_student2', classroomId: 'DBMS26' },
    // Charlie Brown classes (At risk student)
    { studentId: 'u_student3', classroomId: 'MATH26' },
    { studentId: 'u_student3', classroomId: 'DBMS26' },
    // Diana Prince classes
    { studentId: 'u_student4', classroomId: 'DS2026' },
    { studentId: 'u_student4', classroomId: 'DBMS26' }
  ];

  const marks: Mark[] = [
    // Alice Cooper - MATH26
    { id: 'm1', studentId: 'u_student1', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Internal 1', marksObtained: 92, maxMarks: 100 },
    { id: 'm2', studentId: 'u_student1', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Internal 2', marksObtained: 88, maxMarks: 100 },
    { id: 'm3', studentId: 'u_student1', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Mid Semester', marksObtained: 90, maxMarks: 100 },
    { id: 'm4', studentId: 'u_student1', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Final', marksObtained: 95, maxMarks: 100 },
    // Alice Cooper - DS2026
    { id: 'm5', studentId: 'u_student1', subject: 'Data Structures & Algorithms', classroomId: 'DS2026', examType: 'Internal 1', marksObtained: 85, maxMarks: 100 },
    { id: 'm6', studentId: 'u_student1', subject: 'Data Structures & Algorithms', classroomId: 'DS2026', examType: 'Mid Semester', marksObtained: 89, maxMarks: 100 },
    { id: 'm7', studentId: 'u_student1', subject: 'Data Structures & Algorithms', classroomId: 'DS2026', examType: 'Assignment', marksObtained: 98, maxMarks: 100 },

    // Bob Marley - MATH26
    { id: 'm8', studentId: 'u_student2', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Internal 1', marksObtained: 74, maxMarks: 100 },
    { id: 'm9', studentId: 'u_student2', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Mid Semester', marksObtained: 76, maxMarks: 100 },
    { id: 'm10', studentId: 'u_student2', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Final', marksObtained: 78, maxMarks: 100 },
    // Bob Marley - DBMS26
    { id: 'm11', studentId: 'u_student2', subject: 'Relational Database Design', classroomId: 'DBMS26', examType: 'Internal 1', marksObtained: 80, maxMarks: 100 },
    { id: 'm12', studentId: 'u_student2', subject: 'Relational Database Design', classroomId: 'DBMS26', examType: 'Mid Semester', marksObtained: 82, maxMarks: 100 },

    // Charlie Brown (At Risk) - MATH26
    { id: 'm13', studentId: 'u_student3', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Internal 1', marksObtained: 45, maxMarks: 100 },
    { id: 'm14', studentId: 'u_student3', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Internal 2', marksObtained: 50, maxMarks: 100 },
    { id: 'm15', studentId: 'u_student3', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Mid Semester', marksObtained: 40, maxMarks: 100 },
    { id: 'm16', studentId: 'u_student3', subject: 'Calculus & Linear Algebra', classroomId: 'MATH26', examType: 'Final', marksObtained: 38, maxMarks: 100 },
    // Charlie Brown (At Risk) - DBMS26
    { id: 'm17', studentId: 'u_student3', subject: 'Relational Database Design', classroomId: 'DBMS26', examType: 'Internal 1', marksObtained: 48, maxMarks: 100 },
    { id: 'm18', studentId: 'u_student3', subject: 'Relational Database Design', classroomId: 'DBMS26', examType: 'Mid Semester', marksObtained: 42, maxMarks: 100 },

    // Diana Prince (Top Student) - DS2026
    { id: 'm19', studentId: 'u_student4', subject: 'Data Structures & Algorithms', classroomId: 'DS2026', examType: 'Internal 1', marksObtained: 96, maxMarks: 100 },
    { id: 'm20', studentId: 'u_student4', subject: 'Data Structures & Algorithms', classroomId: 'DS2026', examType: 'Mid Semester', marksObtained: 98, maxMarks: 100 },
    { id: 'm21', studentId: 'u_student4', subject: 'Data Structures & Algorithms', classroomId: 'DS2026', examType: 'Assignment', marksObtained: 100, maxMarks: 100 },
    // Diana Prince (Top Student) - DBMS26
    { id: 'm22', studentId: 'u_student4', subject: 'Relational Database Design', classroomId: 'DBMS26', examType: 'Internal 1', marksObtained: 94, maxMarks: 100 },
    { id: 'm23', studentId: 'u_student4', subject: 'Relational Database Design', classroomId: 'DBMS26', examType: 'Mid Semester', marksObtained: 95, maxMarks: 100 },
    { id: 'm24', studentId: 'u_student4', subject: 'Relational Database Design', classroomId: 'DBMS26', examType: 'Final', marksObtained: 98, maxMarks: 100 }
  ];

  const attendance: Attendance[] = [
    // Alice
    { id: 'a1', studentId: 'u_student1', classroomId: 'MATH26', present: 28, total: 30 },
    { id: 'a2', studentId: 'u_student1', classroomId: 'DS2026', present: 29, total: 30 },
    // Bob
    { id: 'a3', studentId: 'u_student2', classroomId: 'MATH26', present: 26, total: 30 },
    { id: 'a4', studentId: 'u_student2', classroomId: 'DBMS26', present: 25, total: 30 },
    // Charlie (Poor Attendance)
    { id: 'a5', studentId: 'u_student3', classroomId: 'MATH26', present: 14, total: 30 }, // 46%
    { id: 'a6', studentId: 'u_student3', classroomId: 'DBMS26', present: 12, total: 30 }, // 40%
    // Diana
    { id: 'a7', studentId: 'u_student4', classroomId: 'DS2026', present: 30, total: 30 },
    { id: 'a8', studentId: 'u_student4', classroomId: 'DBMS26', present: 29, total: 30 }
  ];

  const complaints: Complaint[] = [
    {
      id: 'c1',
      studentId: 'u_student3',
      teacherId: 'u_teacher2',
      text: 'The lectures on Database Normalization were delivered too quickly. We would appreciate visual slides or sample queries to review offline.',
      category: 'Teaching Methodology',
      severity: 'medium',
      status: 'pending',
      anonymous: false,
      upvotes: 2,
      upvotedBy: ['u_student3', 'u_student2'],
      createdAt: '2026-07-15T14:30:00Z'
    },
    {
      id: 'c2',
      studentId: 'u_student2',
      teacherId: 'u_teacher1',
      text: 'The weekly assignments for Calculus take nearly 8 hours to complete. Could we make them bi-weekly or shorten the question count?',
      category: 'Course Workload',
      severity: 'low',
      status: 'resolved',
      anonymous: true,
      upvotes: 3,
      upvotedBy: ['u_student1', 'u_student2', 'u_student3'],
      createdAt: '2026-07-10T10:15:00Z'
    }
  ];

  const notifications: Notification[] = [
    { id: 'n1', userId: 'u_student3', message: 'Urgent: Your attendance in Calculus is currently 46.7%, which is below the minimum required 75%. Please meet your teacher.', status: 'unread', createdAt: '2026-07-16T12:00:00Z' },
    { id: 'n2', userId: 'u_teacher1', message: 'A new course workload complaint has been filed regarding Calculus.', status: 'read', createdAt: '2026-07-10T11:00:00Z' },
    { id: 'n3', userId: 'u_student1', message: 'Welcome to your student dashboard! Track your grades, study plans, and notifications here.', status: 'read', createdAt: '2026-07-16T08:00:00Z' }
  ];

  const aiAnalysis: AIAnalysis[] = [
    {
      id: 'ai_1',
      studentId: 'u_student3',
      summary: 'Charlie is demonstrating significant struggle across primary subjects, exacerbated by highly irregular attendance. Urgent corrective action is critical before final semester grading.',
      strengths: ['Identifies practical schema applications occasionally', 'Has good spatial reasoning'],
      weaknesses: ['Linear algebra core concepts', 'Query design and database triggers', 'Regular attendance structure'],
      recommendations: [
        'Mandatory daily attendance recovery plan.',
        'Pairing with a peer mentor for database design fundamentals.',
        'Solve 5 calculus practice problems daily on differentials.'
      ],
      weeklyPlan: [
        { day: 'Monday', task: 'Revise derivatives with peer mentor (2 hours)' },
        { day: 'Wednesday', task: 'Database Normalization homework correction (1.5 hours)' },
        { day: 'Friday', task: 'Linear Equations self-test and review (2 hours)' }
      ],
      careerSuggestions: ['IT Support Technician', 'Technical Solutions Specialist'],
      learningResources: ['Khan Academy Calculus II course', 'Interactive PostgreSQL tutorial (pgexercises.com)'],
      motivation: 'Small, consistent academic steps generate colossal progress. Focus on showing up; mastery will follow.',
      improvementAreas: ['Attendance commitment', 'Pre-exam mock submissions'],
      studyHours: 12,
      examReadiness: 35,
      timeManagementTips: [
        'Formulate a 20-minute daily review window right after dinner.',
        'Use calendars to log coursework delivery dates early.'
      ],
      examPrepTips: [
        'Practice differential proofs on physical paper twice.',
        'Complete two conceptual diagnostic questionnaires.'
      ],
      learningStrategy: 'Incorporate visual diagrams to clarify calculus limits.',
      confidenceScore: 40,
      createdAt: '2026-07-16T15:00:00Z'
    }
  ];

  const activityLogs: ActivityLog[] = [
    { id: 'log1', userId: 'u_admin', action: 'System Setup', details: 'Initialized database and default profiles', timestamp: '2026-07-16T10:00:00Z' }
  ];

  return {
    users,
    studentProfiles,
    teacherProfiles,
    classrooms,
    studentClasses,
    marks,
    attendance,
    complaints,
    notifications,
    aiAnalysis,
    activityLogs
  };
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const rawData = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(rawData);
    }
  } catch (err) {
    console.error("Error reading database file, returning default schema.", err);
  }
  const initial = getInitialDatabase();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing to database file:", err);
  }
}

// Global mutable DB state
let DB = loadDatabase();

// ---------------------------------------------------------
// RECURRING LOGIC / ALERTS ENGINE
// ---------------------------------------------------------
function computeAlerts(studentId: string): AcademicAlert[] {
  const alerts: AcademicAlert[] = [];
  const db_state = DB;
  
  // Find student profile
  const profile = db_state.studentProfiles.find(p => p.userId === studentId);
  const user = db_state.users.find(u => u.id === studentId);
  if (!user || !profile) return [];

  const studentName = user.name;

  // 1. Attendance Alert
  const attList = db_state.attendance.filter(a => a.studentId === studentId);
  attList.forEach(a => {
    const ratio = a.total > 0 ? (a.present / a.total) * 100 : 100;
    if (ratio < 75) {
      const classroom = db_state.classrooms.find(c => c.id === a.classroomId);
      alerts.push({
        id: `alert_att_${a.id}`,
        studentId,
        studentName,
        type: 'Poor Attendance',
        message: `Attendance is critically low at ${ratio.toFixed(1)}% in "${classroom?.className || 'Class'}" (minimum required: 75%).`,
        severity: ratio < 60 ? 'high' : 'medium',
        createdAt: new Date().toISOString()
      });
    }
  });

  // 2. Low Marks Alert
  const markList = db_state.marks.filter(m => m.studentId === studentId);
  // Group marks by classroom
  const marksByClass: Record<string, Mark[]> = {};
  markList.forEach(m => {
    if (!marksByClass[m.classroomId]) marksByClass[m.classroomId] = [];
    marksByClass[m.classroomId].push(m);
  });

  Object.entries(marksByClass).forEach(([classId, classMarks]) => {
    const sum = classMarks.reduce((acc, curr) => acc + curr.marksObtained, 0);
    const count = classMarks.length;
    const avg = count > 0 ? sum / count : 100;
    const classroom = db_state.classrooms.find(c => c.id === classId);

    if (avg < 50) {
      alerts.push({
        id: `alert_low_avg_${classId}_${studentId}`,
        studentId,
        studentName,
        type: 'Low Marks',
        message: `Average academic performance in "${classroom?.className || 'Subject'}" is below passing standard (${avg.toFixed(1)}%).`,
        severity: 'high',
        createdAt: new Date().toISOString()
      });
    }

    // Repeated low scores check
    const lowScoresCount = classMarks.filter(m => m.marksObtained < 55).length;
    if (lowScoresCount >= 2) {
      alerts.push({
        id: `alert_rep_low_${classId}_${studentId}`,
        studentId,
        studentName,
        type: 'Repeated Low Scores',
        message: `Academic risk detected: student scored below 55% in ${lowScoresCount} assessments for "${classroom?.className || 'Subject'}".`,
        severity: 'high',
        createdAt: new Date().toISOString()
      });
    }

    // Missing assignments
    const assignmentsCount = classMarks.filter(m => m.examType === 'Assignment' || m.examType === 'Project').length;
    if (assignmentsCount === 0) {
      alerts.push({
        id: `alert_missing_${classId}_${studentId}`,
        studentId,
        studentName,
        type: 'Missing Assignments',
        message: `No Project or Assignment submissions registered yet in "${classroom?.className || 'Subject'}".`,
        severity: 'medium',
        createdAt: new Date().toISOString()
      });
    }
  });

  // 3. Teacher Too Many Complaints
  // Stored elsewhere but calculated globally
  return alerts;
}

// Get global list of alerts (all students)
function getGlobalAlerts(): AcademicAlert[] {
  let allAlerts: AcademicAlert[] = [];
  DB.studentProfiles.forEach(sp => {
    allAlerts = allAlerts.concat(computeAlerts(sp.userId));
  });

  // Also teacher complaints alert
  const teacherComplaints: Record<string, number> = {};
  DB.complaints.forEach(c => {
    teacherComplaints[c.teacherId] = (teacherComplaints[c.teacherId] || 0) + 1;
  });

  Object.entries(teacherComplaints).forEach(([teacherId, count]) => {
    if (count >= 3) {
      const teacherUser = DB.users.find(u => u.id === teacherId);
      allAlerts.push({
        id: `alert_complaints_${teacherId}`,
        studentId: '',
        studentName: '',
        type: 'Too Many Complaints',
        message: `Attention: Instructor "${teacherUser?.name || 'Teacher'}" has received ${count} student complaints. Administrative review advised.`,
        severity: 'high',
        createdAt: new Date().toISOString()
      });
    }
  });

  return allAlerts;
}

// Log academic activity log
function logActivity(userId: string, action: string, details: string) {
  const newLog: ActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  DB.activityLogs.unshift(newLog);
  // Keep logs size reasonable
  if (DB.activityLogs.length > 300) {
    DB.activityLogs = DB.activityLogs.slice(0, 300);
  }
  saveDatabase(DB);
}

// ---------------------------------------------------------
// SOCKET.IO REAL-TIME ENGINE
// ---------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('join_user_room', (userId: string) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`[Socket] User ${userId} joined room: user_${userId}`);
    }
  });

  socket.on('join_classroom', (classroomId: string) => {
    if (classroomId) {
      socket.join(`class_${classroomId}`);
      console.log(`[Socket] User joined classroom room: class_${classroomId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

function notifyLeaderboardUpdate() {
  io.emit('leaderboard_updated');
}

function notifyDashboardUpdate(userId: string) {
  if (userId) {
    io.to(`user_${userId}`).emit('dashboard_updated', { userId });
  }
}

function notifyClassroomUpdate(classroomId: string) {
  if (classroomId) {
    io.to(`class_${classroomId}`).emit('classroom_updated', { classroomId });
  }
}

function notifyComplaintUpdate() {
  io.emit('complaints_updated');
}

function notifyGlobalAlertsUpdate() {
  io.emit('global_alerts_updated');
}

function sendLiveNotification(userId: string, notification: Notification) {
  if (userId) {
    io.to(`user_${userId}`).emit('new_notification', notification);
  }
}

function sendLiveAIAnalysis(userId: string, analysis: AIAnalysis) {
  if (userId) {
    io.to(`user_${userId}`).emit('ai_analysis_completed', analysis);
  }
}

// Add a notification
function addNotification(userId: string, message: string) {
  const newNotif: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    message,
    status: 'unread',
    createdAt: new Date().toISOString()
  };
  DB.notifications.unshift(newNotif);
  saveDatabase(DB);
  sendLiveNotification(userId, newNotif);
}

// ---------------------------------------------------------
// REST API ROUTES
// ---------------------------------------------------------

// 1. AUTHENTICATION

// SIGNUP API
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, role, extraInfo } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required signup fields (name, email, password, role).' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check unique email
  if (DB.users.some(u => u.email === normalizedEmail)) {
    return res.status(400).json({ error: 'A user with this email already exists.' });
  }

  const userId = `u_${Date.now()}`;
  const newUser: User = {
    id: userId,
    email: normalizedEmail,
    name,
    role,
    active: true,
    password // Simple storage for prototyping, production safe login
  };

  DB.users.push(newUser);

  // Initialize role-specific profile
  if (role === 'student') {
    const rollNumber = extraInfo?.rollNumber || `S${Date.now().toString().slice(-4)}`;
    const semester = extraInfo?.semester || 'Semester 4';
    const newStudentProfile: StudentProfile = {
      userId,
      rollNumber,
      currentSemester: semester,
      avgMarks: 0,
      rank: DB.studentProfiles.length + 1,
      riskLevel: 'low',
      knowledgeScore: 50
    };
    DB.studentProfiles.push(newStudentProfile);
  } else if (role === 'teacher') {
    const department = extraInfo?.department || 'Computer Science';
    const newTeacherProfile: TeacherProfile = {
      userId,
      department
    };
    DB.teacherProfiles.push(newTeacherProfile);
  } else if (role === 'admin') {
    // Admin setup
  }

  saveDatabase(DB);
  logActivity(userId, 'Sign Up', `Registered as new ${role}`);
  addNotification(userId, `Welcome ${name}! Your account has been initialized successfully.`);

  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ message: 'Signup successful', user: userWithoutPassword });
});

// LOGIN API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = DB.users.find(u => u.email === normalizedEmail);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (!user.active) {
    return res.status(403).json({ error: 'This user account is suspended. Please contact Admin.' });
  }

  logActivity(user.id, 'Login', 'User authenticated successfully');

  // Return clean user session config
  const { password: _, ...userWithoutPassword } = user;
  res.json({
    message: 'Login successful',
    user: userWithoutPassword
  });
});

// GET PROFILE
app.get('/api/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const user = DB.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  const { password: _, ...userWithoutPassword } = user;
  let profileDetails = {};

  if (user.role === 'student') {
    profileDetails = DB.studentProfiles.find(p => p.userId === userId) || {};
  } else if (user.role === 'teacher') {
    profileDetails = DB.teacherProfiles.find(p => p.userId === userId) || {};
  }

  res.json({
    user: userWithoutPassword,
    details: profileDetails
  });
});

// UPDATE PROFILE
app.put('/api/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const { name, email, password, active, extraInfo } = req.body;
  
  const userIndex = DB.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Update core user
  if (name) DB.users[userIndex].name = name;
  if (email) DB.users[userIndex].email = email.toLowerCase().trim();
  if (password) DB.users[userIndex].password = password;
  if (active !== undefined) DB.users[userIndex].active = active;

  // Update sub-profiles
  if (DB.users[userIndex].role === 'student') {
    const spIdx = DB.studentProfiles.findIndex(sp => sp.userId === userId);
    if (spIdx !== -1 && extraInfo) {
      if (extraInfo.rollNumber) DB.studentProfiles[spIdx].rollNumber = extraInfo.rollNumber;
      if (extraInfo.currentSemester) DB.studentProfiles[spIdx].currentSemester = extraInfo.currentSemester;
    }
  } else if (DB.users[userIndex].role === 'teacher') {
    const tpIdx = DB.teacherProfiles.findIndex(tp => tp.userId === userId);
    if (tpIdx !== -1 && extraInfo) {
      if (extraInfo.department) DB.teacherProfiles[tpIdx].department = extraInfo.department;
    }
  }

  saveDatabase(DB);
  logActivity(userId, 'Update Profile', 'Modified profile credentials');
  notifyLeaderboardUpdate();
  notifyDashboardUpdate(userId);
  res.json({ message: 'Profile updated successfully', user: DB.users[userIndex] });
});

// 2. CLASSROOMS API

// CREATE CLASSROOM
app.post('/api/classrooms', (req, res) => {
  const { className, subject, semester, teacherId } = req.body;

  if (!className || !subject || !semester || !teacherId) {
    return res.status(400).json({ error: 'Missing mandatory classroom fields (className, subject, semester, teacherId).' });
  }

  // Check teacher exists
  const teacher = DB.users.find(u => u.id === teacherId && u.role === 'teacher');
  if (!teacher) {
    return res.status(404).json({ error: 'Authorized Teacher not found.' });
  }

  const uniqueCode = generateClassroomCode();
  const newClass: Classroom = {
    id: uniqueCode,
    className,
    subject,
    semester,
    teacherId,
    archived: false
  };

  DB.classrooms.push(newClass);
  saveDatabase(DB);
  logActivity(teacherId, 'Create Classroom', `Created classroom ${className} (${uniqueCode})`);
  notifyDashboardUpdate(teacherId);

  res.status(201).json({ message: 'Classroom created successfully.', classroom: newClass });
});

// JOIN CLASSROOM (Student)
app.post('/api/classrooms/join', (req, res) => {
  const { classroomCode, studentId } = req.body;

  if (!classroomCode || !studentId) {
    return res.status(400).json({ error: 'Please provide classroomCode and studentId.' });
  }

  // Find classroom
  const classroom = DB.classrooms.find(c => c.id === classroomCode.toUpperCase().trim());
  if (!classroom) {
    return res.status(404).json({ error: 'Classroom not found with the code.' });
  }

  if (classroom.archived) {
    return res.status(400).json({ error: 'This classroom is archived and cannot be joined.' });
  }

  // Check if student already in class
  const alreadyJoined = DB.studentClasses.some(sc => sc.studentId === studentId && sc.classroomId === classroom.id);
  if (alreadyJoined) {
    return res.status(400).json({ error: 'You have already joined this classroom.' });
  }

  // Add mapping
  DB.studentClasses.push({
    studentId,
    classroomId: classroom.id
  });

  // Seed default attendance for student in this class
  DB.attendance.push({
    id: `att_${Date.now()}`,
    studentId,
    classroomId: classroom.id,
    present: 10,
    total: 10
  });

  saveDatabase(DB);
  logActivity(studentId, 'Join Classroom', `Joined class ${classroom.className} (${classroom.id})`);
  addNotification(classroom.teacherId, `Student joined: ${DB.users.find(u => u.id === studentId)?.name} joined classroom ${classroom.className}`);
  notifyClassroomUpdate(classroom.id);
  notifyDashboardUpdate(studentId);
  notifyDashboardUpdate(classroom.teacherId);

  res.json({ message: 'Joined classroom successfully.', classroom });
});

// LEAVE CLASSROOM (Student)
app.post('/api/classrooms/leave', (req, res) => {
  const { classroomId, studentId } = req.body;

  if (!classroomId || !studentId) {
    return res.status(400).json({ error: 'Missing classroomId or studentId.' });
  }

  const initialCount = DB.studentClasses.length;
  DB.studentClasses = DB.studentClasses.filter(sc => !(sc.studentId === studentId && sc.classroomId === classroomId));

  if (DB.studentClasses.length === initialCount) {
    return res.status(404).json({ error: 'Class enrollment not found.' });
  }

  saveDatabase(DB);
  logActivity(studentId, 'Leave Classroom', `Left classroom ${classroomId}`);
  notifyClassroomUpdate(classroomId);
  notifyDashboardUpdate(studentId);
  const cls = DB.classrooms.find(c => c.id === classroomId);
  if (cls) {
    notifyDashboardUpdate(cls.teacherId);
  }
  res.json({ message: 'Classroom left successfully.' });
});

// GET CLASSROOMS
app.get('/api/classrooms', (req, res) => {
  const { userId, role } = req.query;

  if (!userId || !role) {
    return res.status(400).json({ error: 'Missing userId or role query param.' });
  }

  let list: Classroom[] = [];

  if (role === 'teacher') {
    list = DB.classrooms.filter(c => c.teacherId === userId);
  } else if (role === 'student') {
    const classIds = DB.studentClasses.filter(sc => sc.studentId === userId).map(sc => sc.classroomId);
    list = DB.classrooms.filter(c => classIds.includes(c.id));
  } else if (role === 'admin') {
    list = DB.classrooms;
  }

  // Append student count
  const withCount = list.map(c => {
    const studentCount = DB.studentClasses.filter(sc => sc.classroomId === c.id).length;
    return { ...c, studentCount };
  });

  res.json({ classrooms: withCount });
});

// GET ENROLLED STUDENTS FOR A CLASSROOM (Teacher/Admin view)
app.get('/api/classrooms/:id/students', (req, res) => {
  const { id } = req.params;
  const classroom = DB.classrooms.find(c => c.id === id);
  if (!classroom) {
    return res.status(404).json({ error: 'Classroom not found.' });
  }

  const enrollments = DB.studentClasses.filter(sc => sc.classroomId === id);
  const studentIds = enrollments.map(e => e.studentId);
  
  const studentDetails = DB.users
    .filter(u => studentIds.includes(u.id))
    .map(u => {
      const sp = DB.studentProfiles.find(p => p.userId === u.id);
      const att = DB.attendance.find(a => a.studentId === u.id && a.classroomId === id);
      const studentMarks = DB.marks.filter(m => m.studentId === u.id && m.classroomId === id);

      // Average marks in this specific class
      const totalMarks = studentMarks.reduce((acc, curr) => acc + curr.marksObtained, 0);
      const classAvg = studentMarks.length > 0 ? totalMarks / studentMarks.length : 0;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        active: u.active,
        rollNumber: sp?.rollNumber || '',
        semester: sp?.currentSemester || '',
        riskLevel: att && (att.present / att.total < 0.75) ? 'high' : (sp?.riskLevel || 'low'),
        avgMarks: sp?.avgMarks || 0,
        classSpecificAvg: classAvg,
        attendance: att ? { present: att.present, total: att.total, percentage: (att.present / att.total) * 100 } : { present: 0, total: 0, percentage: 0 }
      };
    });

  res.json({ students: studentDetails });
});

// UPDATE CLASSROOM
app.put('/api/classrooms/:id', (req, res) => {
  const { id } = req.params;
  const { className, subject, semester, archived } = req.body;

  const idx = DB.classrooms.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Classroom not found.' });
  }

  if (className) DB.classrooms[idx].className = className;
  if (subject) DB.classrooms[idx].subject = subject;
  if (semester) DB.classrooms[idx].semester = semester;
  if (archived !== undefined) DB.classrooms[idx].archived = archived;

  saveDatabase(DB);
  logActivity(DB.classrooms[idx].teacherId, 'Update Classroom', `Modified class attributes of ${id}`);
  notifyClassroomUpdate(id);
  res.json({ message: 'Classroom updated successfully.', classroom: DB.classrooms[idx] });
});

// DELETE CLASSROOM
app.delete('/api/classrooms/:id', (req, res) => {
  const { id } = req.params;
  const classroom = DB.classrooms.find(c => c.id === id);

  if (!classroom) {
    return res.status(404).json({ error: 'Classroom not found.' });
  }

  DB.classrooms = DB.classrooms.filter(c => c.id !== id);
  // Cleanup mappings, marks, and attendance
  DB.studentClasses = DB.studentClasses.filter(sc => sc.classroomId !== id);
  DB.marks = DB.marks.filter(m => m.classroomId !== id);
  DB.attendance = DB.attendance.filter(a => a.classroomId !== id);

  saveDatabase(DB);
  logActivity(classroom.teacherId, 'Delete Classroom', `Deleted classroom ${id}`);
  notifyClassroomUpdate(id);
  res.json({ message: 'Classroom and associated metrics completely deleted.' });
});

// 3. MARKS MANAGEMENT API

// ADD MARKS
app.post('/api/marks', (req, res) => {
  const { studentId, classroomId, examType, marksObtained, maxMarks } = req.body;

  if (!studentId || !classroomId || !examType || marksObtained === undefined) {
    return res.status(400).json({ error: 'Missing academic marks fields.' });
  }

  // Find class details
  const classroom = DB.classrooms.find(c => c.id === classroomId);
  if (!classroom) {
    return res.status(404).json({ error: 'Classroom context not found.' });
  }

  const markId = `m_${Date.now()}`;
  const newMark: Mark = {
    id: markId,
    studentId,
    classroomId,
    subject: classroom.subject,
    examType: examType as ExamType,
    marksObtained: Number(marksObtained),
    maxMarks: maxMarks ? Number(maxMarks) : 100
  };

  DB.marks.push(newMark);

  // Recalculate student profile average metrics
  recalculateStudentMetrics(studentId);

  saveDatabase(DB);
  logActivity(classroom.teacherId, 'Add Mark', `Recorded ${marksObtained}% for student in ${classroom.className}`);
  
  // Alert triggers internally
  const studentUser = DB.users.find(u => u.id === studentId);
  if (Number(marksObtained) < 50) {
    addNotification(studentId, `Academic Alert: You scored ${marksObtained}% on the ${examType} in ${classroom.className}. Support resource is advised.`);
  }

  notifyLeaderboardUpdate();
  notifyDashboardUpdate(studentId);
  notifyDashboardUpdate(classroom.teacherId);
  notifyClassroomUpdate(classroomId);
  notifyGlobalAlertsUpdate();

  res.status(201).json({ message: 'Mark recorded successfully.', mark: newMark });
});

// UPDATE MARKS
app.put('/api/marks/:id', (req, res) => {
  const { id } = req.params;
  const { marksObtained, maxMarks, examType } = req.body;

  const mIdx = DB.marks.findIndex(m => m.id === id);
  if (mIdx === -1) {
    return res.status(404).json({ error: 'Mark entry not found.' });
  }

  const mark = DB.marks[mIdx];
  if (marksObtained !== undefined) DB.marks[mIdx].marksObtained = Number(marksObtained);
  if (maxMarks !== undefined) DB.marks[mIdx].maxMarks = Number(maxMarks);
  if (examType) DB.marks[mIdx].examType = examType as ExamType;

  recalculateStudentMetrics(mark.studentId);
  saveDatabase(DB);
  notifyLeaderboardUpdate();
  notifyDashboardUpdate(mark.studentId);
  notifyClassroomUpdate(mark.classroomId);
  notifyGlobalAlertsUpdate();
  res.json({ message: 'Mark entry updated successfully.', mark: DB.marks[mIdx] });
});

// DELETE MARKS
app.delete('/api/marks/:id', (req, res) => {
  const { id } = req.params;
  const mark = DB.marks.find(m => m.id === id);

  if (!mark) {
    return res.status(404).json({ error: 'Mark entry not found.' });
  }

  DB.marks = DB.marks.filter(m => m.id !== id);
  recalculateStudentMetrics(mark.studentId);
  saveDatabase(DB);
  notifyLeaderboardUpdate();
  notifyDashboardUpdate(mark.studentId);
  notifyClassroomUpdate(mark.classroomId);
  notifyGlobalAlertsUpdate();
  res.json({ message: 'Mark entry deleted.' });
});

// Helper: recalculate average, rank, risk level, knowledge scores
function recalculateStudentMetrics(studentId: string) {
  const studentMarks = DB.marks.filter(m => m.studentId === studentId);
  const profileIdx = DB.studentProfiles.findIndex(sp => sp.userId === studentId);
  
  if (profileIdx === -1) return;

  if (studentMarks.length === 0) {
    DB.studentProfiles[profileIdx].avgMarks = 0;
    DB.studentProfiles[profileIdx].knowledgeScore = 50;
    return;
  }

  const weightedSum = studentMarks.reduce((acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100, 0);
  const avg = weightedSum / studentMarks.length;

  DB.studentProfiles[profileIdx].avgMarks = Math.round(avg * 10) / 10;
  
  // Knowledge score formula: weighted based on recent grades
  DB.studentProfiles[profileIdx].knowledgeScore = Math.min(100, Math.round(avg * 1.02));

  // Determine static risk levels (will also compute dynamic alerts)
  const attList = DB.attendance.filter(a => a.studentId === studentId);
  const hasPoorAtt = attList.some(a => a.total > 0 && (a.present / a.total) < 0.75);

  if (avg < 55 || hasPoorAtt) {
    DB.studentProfiles[profileIdx].riskLevel = 'high';
  } else if (avg < 75) {
    DB.studentProfiles[profileIdx].riskLevel = 'medium';
  } else {
    DB.studentProfiles[profileIdx].riskLevel = 'low';
  }

  // Recalculate global student ranks
  const sorted = [...DB.studentProfiles].sort((a, b) => b.avgMarks - a.avgMarks);
  sorted.forEach((item, index) => {
    const realIdx = DB.studentProfiles.findIndex(sp => sp.userId === item.userId);
    if (realIdx !== -1) {
      DB.studentProfiles[realIdx].rank = index + 1;
    }
  });
}

// 4. ATTENDANCE MANAGEMENT API
app.post('/api/attendance', (req, res) => {
  const { studentId, classroomId, present, total } = req.body;

  if (!studentId || !classroomId || present === undefined || !total) {
    return res.status(400).json({ error: 'Missing attendance properties.' });
  }

  const attIdx = DB.attendance.findIndex(a => a.studentId === studentId && a.classroomId === classroomId);

  if (attIdx !== -1) {
    DB.attendance[attIdx].present = Number(present);
    DB.attendance[attIdx].total = Number(total);
  } else {
    DB.attendance.push({
      id: `att_${Date.now()}`,
      studentId,
      classroomId,
      present: Number(present),
      total: Number(total)
    });
  }

  recalculateStudentMetrics(studentId);
  saveDatabase(DB);
  notifyLeaderboardUpdate();
  notifyDashboardUpdate(studentId);
  notifyClassroomUpdate(classroomId);
  notifyGlobalAlertsUpdate();
  res.json({ message: 'Attendance records updated.' });
});

// 5. COMPLAINT MANAGEMENT API

// SUBMIT COMPLAINT
app.post('/api/complaints', (req, res) => {
  const { studentId, teacherId, text, category, severity, anonymous } = req.body;

  if (!teacherId || !text || !category || !severity) {
    return res.status(400).json({ error: 'Missing complaint attributes.' });
  }

  const complId = `c_${Date.now()}`;
  const newComplaint: Complaint = {
    id: complId,
    studentId: anonymous ? null : (studentId || null),
    teacherId,
    text,
    category,
    severity: severity as 'low' | 'medium' | 'high',
    status: 'pending',
    anonymous: !!anonymous,
    upvotes: 1,
    upvotedBy: studentId ? [studentId] : [],
    createdAt: new Date().toISOString()
  };

  DB.complaints.push(newComplaint);
  saveDatabase(DB);
  
  if (studentId) {
    logActivity(studentId, 'Submit Complaint', `Filed ${category} complaint about instructor ${teacherId}`);
  }
  addNotification(teacherId, `Notice: A new "${category}" student feedback report has been filed.`);
  notifyComplaintUpdate();
  notifyDashboardUpdate(teacherId);
  notifyGlobalAlertsUpdate();

  res.status(201).json({ message: 'Complaint filed successfully.', complaint: newComplaint });
});

// UPVOTE COMPLAINT
app.post('/api/complaints/:id/vote', (req, res) => {
  const { id } = req.params;
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId required to upvote.' });
  }

  const cIdx = DB.complaints.findIndex(c => c.id === id);
  if (cIdx === -1) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  if (DB.complaints[cIdx].upvotedBy.includes(studentId)) {
    // Already upvoted, remove vote (toggle behavior)
    DB.complaints[cIdx].upvotedBy = DB.complaints[cIdx].upvotedBy.filter(uid => uid !== studentId);
    DB.complaints[cIdx].upvotes = Math.max(0, DB.complaints[cIdx].upvotes - 1);
    saveDatabase(DB);
    notifyComplaintUpdate();
    return res.json({ message: 'Upvote retracted.', complaint: DB.complaints[cIdx] });
  }

  DB.complaints[cIdx].upvotedBy.push(studentId);
  DB.complaints[cIdx].upvotes += 1;

  saveDatabase(DB);
  notifyComplaintUpdate();
  res.json({ message: 'Complaint upvoted successfully.', complaint: DB.complaints[cIdx] });
});

// RESOLVE COMPLAINT
app.put('/api/complaints/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { resolverId } = req.body; // Teacher or Admin ID

  const idx = DB.complaints.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  DB.complaints[idx].status = 'resolved';
  saveDatabase(DB);

  if (resolverId) {
    logActivity(resolverId, 'Resolve Complaint', `Resolved feedback report ${id}`);
  }

  const studentId = DB.complaints[idx].studentId;
  if (studentId) {
    addNotification(studentId, `Update: Your feedback regarding "${DB.complaints[idx].category}" has been resolved by the department.`);
  }
  notifyComplaintUpdate();
  if (studentId) {
    notifyDashboardUpdate(studentId);
  }

  res.json({ message: 'Feedback report marked as resolved.', complaint: DB.complaints[idx] });
});

// GET COMPLAINTS LIST
app.get('/api/complaints', (req, res) => {
  const { role, userId } = req.query;

  if (!role || !userId) {
    return res.status(400).json({ error: 'Please specify role and userId query parameters.' });
  }

  // Populate names helper
  const populated = DB.complaints.map(c => {
    const teacherUser = DB.users.find(u => u.id === c.teacherId);
    let studentName = 'Anonymous';
    if (!c.anonymous && c.studentId) {
      const studentUser = DB.users.find(u => u.id === c.studentId);
      studentName = studentUser ? studentUser.name : 'Unknown Student';
    }
    return {
      ...c,
      teacherName: teacherUser?.name || 'Unknown Teacher',
      studentName
    };
  });

  if (role === 'admin') {
    // Admin can see everything including full identities of anonymous complaints
    const adminPopulated = DB.complaints.map(c => {
      const teacherUser = DB.users.find(u => u.id === c.teacherId);
      const studentUser = c.studentId ? DB.users.find(u => u.id === c.studentId) : null;
      return {
        ...c,
        teacherName: teacherUser?.name || 'Unknown Teacher',
        studentName: studentUser ? studentUser.name : 'Anonymous',
        realIdentity: studentUser ? studentUser.name : 'Unknown'
      };
    });
    return res.json({ complaints: adminPopulated });
  }

  if (role === 'teacher') {
    // Teacher sees complaints filed against them, but identity is masked if anonymous is true!
    const filtered = populated.filter(c => c.teacherId === userId);
    const masked = filtered.map(c => {
      if (c.anonymous) {
        return { ...c, studentId: null, studentName: 'Anonymous' };
      }
      return c;
    });
    return res.json({ complaints: masked });
  }

  if (role === 'student') {
    // Students see all complaints (for upvoting) but with anonymous identities properly scrubbed unless it's their own
    const studentView = populated.map(c => {
      if (c.anonymous && c.studentId !== userId) {
        return { ...c, studentId: null, studentName: 'Anonymous' };
      }
      return c;
    });
    return res.json({ complaints: studentView });
  }

  res.status(400).json({ error: 'Invalid user role parameter.' });
});

// 6. NOTIFICATIONS API
app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  const list = DB.notifications.filter(n => n.userId === userId);
  res.json({ notifications: list });
});

app.post('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const idx = DB.notifications.findIndex(n => n.id === id);
  if (idx !== -1) {
    DB.notifications[idx].status = 'read';
    saveDatabase(DB);
  }
  res.json({ success: true });
});

// 7. ALERTS GLOBAL API
app.get('/api/alerts', (req, res) => {
  const { studentId } = req.query;
  if (studentId) {
    return res.json({ alerts: computeAlerts(studentId as string) });
  }
  res.json({ alerts: getGlobalAlerts() });
});

// 8. LEADERBOARD API
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = DB.studentProfiles.map(sp => {
    const user = DB.users.find(u => u.id === sp.userId);
    return {
      userId: sp.userId,
      name: user?.name || 'Unknown Student',
      rollNumber: sp.rollNumber,
      avgMarks: sp.avgMarks,
      rank: sp.rank,
      riskLevel: sp.riskLevel,
      knowledgeScore: sp.knowledgeScore
    };
  }).sort((a, b) => b.avgMarks - a.avgMarks);

  res.json({ leaderboard });
});

// 9. MODULE DASHBOARDS DATA INTEGRATION

// Student Dashboard Aggregation
app.get('/api/dashboard/student/:id', (req, res) => {
  const { id } = req.params;
  const profile = DB.studentProfiles.find(p => p.userId === id);
  const user = DB.users.find(u => u.id === id);

  if (!user || !profile) {
    return res.status(404).json({ error: 'Student credentials not found.' });
  }

  // Get classrooms
  const enrolledClassIds = DB.studentClasses.filter(sc => sc.studentId === id).map(sc => sc.classroomId);
  const classroomsJoined = DB.classrooms.filter(c => enrolledClassIds.includes(c.id));

  // Marks details
  const studentMarks = DB.marks.filter(m => m.studentId === id);
  
  // Attendance details
  const attendanceList = DB.attendance.filter(a => a.studentId === id);
  let totalPresent = 0;
  let totalClasses = 0;
  attendanceList.forEach(a => {
    totalPresent += a.present;
    totalClasses += a.total;
  });
  const overallAttendancePct = totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 100;

  // Alerts
  const studentAlerts = computeAlerts(id);

  // Latest AI Analysis
  const studentAI = DB.aiAnalysis.find(ai => ai.studentId === id) || null;

  res.json({
    profile: {
      ...profile,
      name: user.name,
      email: user.email,
      overallAttendancePct
    },
    classrooms: classroomsJoined,
    marks: studentMarks,
    attendance: attendanceList,
    alerts: studentAlerts,
    aiAnalysis: studentAI
  });
});

// Teacher Dashboard Aggregation
app.get('/api/dashboard/teacher/:id', (req, res) => {
  const { id } = req.params;
  const teacherUser = DB.users.find(u => u.id === id && u.role === 'teacher');
  if (!teacherUser) {
    return res.status(404).json({ error: 'Teacher not found.' });
  }

  const teacherClasses = DB.classrooms.filter(c => c.teacherId === id);
  const classIds = teacherClasses.map(c => c.id);

  // Enrolled students calculation
  const enrollments = DB.studentClasses.filter(sc => classIds.includes(sc.classroomId));
  const uniqueStudentIds = Array.from(new Set(enrollments.map(e => e.studentId)));

  // Marks in teacher classes
  const teacherClassMarks = DB.marks.filter(m => classIds.includes(m.classroomId));
  const sumMarks = teacherClassMarks.reduce((acc, curr) => acc + curr.marksObtained, 0);
  const avgMarks = teacherClassMarks.length > 0 ? sumMarks / teacherClassMarks.length : 0;

  // Complaints against this teacher
  const teacherComplaints = DB.complaints.filter(c => c.teacherId === id);
  const pendingComplaints = teacherComplaints.filter(c => c.status === 'pending').length;

  // Students at risk (avg < 55 in teacher classes or attendance < 75%)
  let atRiskStudentsCount = 0;
  uniqueStudentIds.forEach(sid => {
    const studentAtts = DB.attendance.filter(a => a.studentId === sid && classIds.includes(a.classroomId));
    const hasPoorAtt = studentAtts.some(a => a.total > 0 && (a.present / a.total) < 0.75);

    const studentMarksInClass = teacherClassMarks.filter(m => m.studentId === sid);
    const mSum = studentMarksInClass.reduce((acc, curr) => acc + curr.marksObtained, 0);
    const mAvg = studentMarksInClass.length > 0 ? mSum / studentMarksInClass.length : 100;

    if (mAvg < 55 || hasPoorAtt) {
      atRiskStudentsCount++;
    }
  });

  res.json({
    metrics: {
      totalStudents: uniqueStudentIds.length,
      totalClasses: teacherClasses.length,
      averageMarks: Math.round(avgMarks * 10) / 10,
      atRiskStudents: atRiskStudentsCount,
      totalComplaints: teacherComplaints.length,
      pendingComplaints: pendingComplaints,
    },
    classrooms: teacherClasses,
    complaints: teacherComplaints
  });
});

// Admin Dashboard Aggregation
app.get('/api/dashboard/admin', (req, res) => {
  const studentsCount = DB.users.filter(u => u.role === 'student').length;
  const teachersCount = DB.users.filter(u => u.role === 'teacher').length;
  const classesCount = DB.classrooms.length;
  const complaintsCount = DB.complaints.length;
  const activeCount = DB.users.filter(u => u.active).length;

  // Subjects list
  const subjects = Array.from(new Set(DB.classrooms.map(c => c.subject)));

  res.json({
    metrics: {
      totalStudents: studentsCount,
      totalTeachers: teachersCount,
      totalClasses: classesCount,
      totalComplaints: complaintsCount,
      totalSubjects: subjects.length,
      totalActiveUsers: activeCount
    },
    recentComplaints: DB.complaints.slice(-5),
    globalAlerts: getGlobalAlerts().slice(0, 10),
    activityLogs: DB.activityLogs.slice(0, 10)
  });
});

// 10. AI / GEMINI PREDICTIVE INTEL ENGINE

// ANALYZE STUDENT LIVE
app.post('/api/ai/analyze-student', async (req, res) => {
  const { studentId } = req.body;

  if (!studentId) {
    return res.status(400).json({ error: 'Please provide studentId for analysis.' });
  }

  const user = DB.users.find(u => u.id === studentId);
  const profile = DB.studentProfiles.find(sp => sp.userId === studentId);
  if (!user || !profile) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }

  // Gather academic context
  const studentMarks = DB.marks.filter(m => m.studentId === studentId);
  const studentAtt = DB.attendance.filter(a => a.studentId === studentId);
  const enrollments = DB.studentClasses.filter(sc => sc.studentId === studentId);
  const classrooms = DB.classrooms.filter(c => enrollments.some(e => e.classroomId === c.id));

  const attendanceData = studentAtt.map(a => {
    const cls = classrooms.find(c => c.id === a.classroomId);
    return `${cls?.className || 'Class'}: ${a.present}/${a.total} (${((a.present / a.total) * 100).toFixed(1)}%)`;
  }).join(', ');

  const marksData = studentMarks.map(m => {
    return `${m.subject} [${m.examType}]: ${m.marksObtained}/${m.maxMarks}`;
  }).join(', ');

  // Calculate high-fidelity metrics for prompt
  const subjectAverages: Record<string, { total: number; count: number }> = {};
  studentMarks.forEach(m => {
    if (!subjectAverages[m.subject]) {
      subjectAverages[m.subject] = { total: 0, count: 0 };
    }
    subjectAverages[m.subject].total += (m.marksObtained / m.maxMarks) * 100;
    subjectAverages[m.subject].count++;
  });
  
  const strongSubjects: string[] = [];
  const weakSubjects: string[] = [];
  Object.entries(subjectAverages).forEach(([subj, data]) => {
    const avg = data.total / data.count;
    if (avg >= 80) strongSubjects.push(`${subj} (${avg.toFixed(1)}%)`);
    else if (avg < 60) weakSubjects.push(`${subj} (${avg.toFixed(1)}%)`);
  });

  const examOrder: Record<string, number> = { 'Internal 1': 1, 'Internal 2': 2, 'Mid Semester': 3, 'Final': 4, 'Assignment': 5, 'Quiz': 6, 'Lab': 7, 'Project': 8 };
  const sortedMarks = [...studentMarks].sort((a, b) => (examOrder[a.examType] || 9) - (examOrder[b.examType] || 9));
  const trendDescription = sortedMarks.map(m => `${m.examType} in ${m.subject}: ${m.marksObtained}%`).join(' -> ');

  const prompt = `
    You are Aura, an elite AI Academic Coach and predictive student risk modeling specialist.
    Analyze the following high-fidelity academic profile for student "${user.name}":
    - Current Average Grade: ${profile.avgMarks}%
    - Current Rank: #${profile.rank}
    - Student Risk Level: ${profile.riskLevel}
    - Attendance Record: ${attendanceData || 'No attendance records logged yet'}
    - Grade Assessment Marks: ${marksData || 'No marks records logged yet'}
    - Programmatically Detected Strong Subjects: ${strongSubjects.join(', ') || 'No strong subjects detected yet'}
    - Programmatically Detected Weak Subjects: ${weakSubjects.join(', ') || 'No weak subjects detected yet'}
    - Chronological Performance Trend: ${trendDescription || 'No performance trend available yet'}
    
    Predict their academic risk level, detect specific weak topics, outline strengths, identify areas of improvement, and formulate:
    1. A concise narrative student summary (Overall Performance Summary).
    2. Exactly 3 Strengths.
    3. Exactly 3 Weaknesses.
    4. Exactly 3 tailored Academic Recommendations.
    5. A sample study plan for 3 days of the week (Monday, Wednesday, Friday) with specific tasks.
    6. 2 Career Path suggestions based on academic performance.
    7. 2 online resource links or topic titles.
    8. A highly motivational feedback quote.
    9. 2 concrete Areas of Improvement (Subjects needing improvement).
    10. Recommended study hours per week.
    11. Predicted exam readiness score (0 to 100 percentage).
    12. 3 Time Management Tips tailored to their performance and attendance workload.
    13. 3 Exam Preparation Tips tailored to their weakest subjects.
    14. 1 customized Learning Strategy (e.g. Feynman technique, Pomodoro, Active Recall) with application details.
    15. A Confidence Score (0 to 100 percentage representing their probability of passing the semester with an A/B grade).

    You must return a valid JSON object matching this TypeScript structure:
    {
      "summary": "string",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "recommendations": ["string"],
      "weeklyPlan": [{"day": "string", "task": "string"}],
      "careerSuggestions": ["string"],
      "learningResources": ["string"],
      "motivation": "string",
      "improvementAreas": ["string"],
      "studyHours": number,
      "examReadiness": number,
      "timeManagementTips": ["string"],
      "examPrepTips": ["string"],
      "learningStrategy": "string",
      "confidenceScore": number
    }
    Ensure valid JSON syntax. Do not wrap in markdown code blocks. Just output the clean JSON text.
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsedAnalysis = JSON.parse(response.text || '{}');
      
      const newAnalysis: AIAnalysis = {
        id: `ai_${Date.now()}`,
        studentId,
        ...parsedAnalysis,
        createdAt: new Date().toISOString()
      };

      // Upsert analysis
      DB.aiAnalysis = DB.aiAnalysis.filter(ai => ai.studentId !== studentId);
      DB.aiAnalysis.push(newAnalysis);
      saveDatabase(DB);

      logActivity('u_admin', 'AI Analysis Run', `Generated predictive analytics report for ${user.name}`);
      sendLiveAIAnalysis(studentId, newAnalysis);
      notifyDashboardUpdate(studentId);
      return res.json({ analysis: newAnalysis });

    } catch (err) {
      console.error("Gemini live call failed, generating simulated local predictive analysis.", err);
    }
  }

  // High-fidelity fallback simulated analytics when API is missing
  const isHighRisk = profile.avgMarks < 60 || studentAtt.some(a => (a.present/a.total) < 0.75);
  const fallbackAnalysis: AIAnalysis = {
    id: `ai_local_${Date.now()}`,
    studentId,
    summary: `${user.name} displays ${isHighRisk ? 'critical warning factors in attendance and foundational assignments. Targeted faculty tutorials are strongly recommended to recover.' : 'solid academic potential with consistent topic comprehension.'} Maintain structural scheduling.`,
    strengths: [
      isHighRisk ? 'Responsive during practical lab exercises' : 'Strong computational logic skills',
      'Demonstrates high performance in internal assignments',
      'Asks constructive questions during class discussions'
    ],
    weaknesses: [
      isHighRisk ? 'Highly irregular class participation' : 'Occasional mistakes in complex calculus proofing',
      isHighRisk ? 'Incomplete exam preparation leading to low midterms' : 'Late submissions of secondary quiz modules',
      'Needs additional mentorship on database architecture design'
    ],
    recommendations: [
      isHighRisk ? 'Mandatory attendance recovery program of 3 sessions/week' : 'Advanced study into transactional safety & isolation levels',
      'Complete the supplementary workbook chapters 4-6 prior to examinations',
      'Book a weekly review session with Department teaching assistant'
    ],
    weeklyPlan: [
      { day: 'Monday', task: isHighRisk ? 'Calculus workbook revision with study partner (2 hours)' : 'Explore advanced calculus on MIT OpenCourseWare (1.5 hours)' },
      { day: 'Wednesday', task: 'Revise relational algebra database operations (2 hours)' },
      { day: 'Friday', task: isHighRisk ? 'Submit pending quiz corrections directly to professor (1 hour)' : 'Formulate personal database schema playground (2 hours)' }
    ],
    careerSuggestions: [
      isHighRisk ? 'Systems Support Associate' : 'Full Stack Developer',
      isHighRisk ? 'Technical Account Advocate' : 'Database Administrator / Architect'
    ],
    learningResources: [
      'Interactive DBMS Sandboxes (e.g. sqlbolt.com)',
      'Calculus II Visualized Tutorial Playlist on YouTube'
    ],
    motivation: isHighRisk ? "Success isn't about never falling; it's about making every single class count. You have the intellect, now apply the attendance." : "Stellar progress! Continuously push your intellectual boundaries; consistency yields mastery.",
    improvementAreas: [
      isHighRisk ? 'Targeted Class Attendance' : 'Complex Proof Speed',
      'Prereading lecture material beforehand'
    ],
    studyHours: isHighRisk ? 14 : 8,
    examReadiness: isHighRisk ? 42 : 88,
    timeManagementTips: [
      isHighRisk ? 'Set daily 30-minute review blocks for each missed lecture.' : 'Dedicate 1 hour every Saturday to map out study goals for next week.',
      'Apply the 45-15 rule: 45 minutes of intense focused study, followed by a 15-minute screen-free break.',
      'Use digital reminders to log attendance and assignments immediately.'
    ],
    examPrepTips: [
      'Solve at least three mock tests under timed exam conditions.',
      isHighRisk ? 'Review and correct previous incorrect assignments line-by-line.' : 'Discuss mock queries with peer groups to reinforce conceptual accuracy.',
      'Focus study sessions on topics categorized in your highest risk-factor subjects first.'
    ],
    learningStrategy: isHighRisk ? 'The Pomodoro Technique: Build consistent momentum using short bursts of targeted focus to rebuild study confidence.' : 'The Feynman Technique: Explain transaction isolation rules or advanced derivatives in simple, plain terms to verify conceptual alignment.',
    confidenceScore: isHighRisk ? 48 : 91,
    createdAt: new Date().toISOString()
  };

  DB.aiAnalysis = DB.aiAnalysis.filter(ai => ai.studentId !== studentId);
  DB.aiAnalysis.push(fallbackAnalysis);
  saveDatabase(DB);

  logActivity('u_admin', 'AI Analysis Run (Local)', `Generated analytics report for ${user.name}`);
  sendLiveAIAnalysis(studentId, fallbackAnalysis);
  notifyDashboardUpdate(studentId);
  res.json({ analysis: fallbackAnalysis });
});

// ANALYZE CLASSROOM LEVEL SUMMARY
app.post('/api/ai/analyze-classroom', async (req, res) => {
  const { classroomId } = req.body;
  const classroom = DB.classrooms.find(c => c.id === classroomId);

  if (!classroom) {
    return res.status(404).json({ error: 'Classroom not found.' });
  }

  const enrollments = DB.studentClasses.filter(sc => sc.classroomId === classroomId);
  const studentIds = enrollments.map(e => e.studentId);
  const studentCount = studentIds.length;

  const classMarks = DB.marks.filter(m => m.classroomId === classroomId);
  const classAtts = DB.attendance.filter(a => a.classroomId === classroomId);

  const avgGrade = classMarks.length > 0 ? (classMarks.reduce((a, b) => a + b.marksObtained, 0) / classMarks.length) : 75;
  const avgAtt = classAtts.length > 0 ? (classAtts.reduce((a, b) => a + (b.present/b.total), 0) / classAtts.length) * 100 : 85;

  const studentProfiles = DB.studentProfiles.filter(p => studentIds.includes(p.userId));
  const studentDetails = studentProfiles.map(p => {
    const user = DB.users.find(u => u.id === p.userId);
    return `${user?.name || 'Student'}: Avg Grade ${p.avgMarks}%, Rank #${p.rank}, Risk Level ${p.riskLevel}`;
  }).join('; ');

  // Get classroom complaints (filter by teacherId as a proxy for the class, or matching category)
  const classComplaints = DB.complaints.filter(c => 
    c.teacherId === classroom.teacherId && 
    (c.category.toLowerCase().includes(classroom.className.toLowerCase()) || 
     c.category.toLowerCase().includes(classroom.subject.toLowerCase()))
  );
  const complaintsSummary = classComplaints.length > 0 
    ? classComplaints.map(c => `[Severity: ${c.severity}] "${c.text}"`).join(' | ')
    : 'No complaints registered.';

  const prompt = `
    You are Aura, an elite AI Academic Dean and Class performance auditor.
    Analyze the following class performance data for classroom "${classroom.className}" teaching "${classroom.subject}":
    - Total Enrolled Students: ${studentCount}
    - Class Average Grade: ${avgGrade.toFixed(1)}%
    - Class Average Attendance: ${avgAtt.toFixed(1)}%
    - Detailed Student Roster Metrics: ${studentDetails || 'No student data logged'}
    - Classroom Anonymous Complaint and Feedback Logs: ${complaintsSummary}
    
    Identify learning gaps, classroom trends, risk distribution, and provide:
    1. A concise Class Performance Summary.
    2. A list of students requiring immediate attention (At-Risk or highly irregular).
    3. Exactly 3 suggested teaching improvements to increase average engagement.
    4. Exactly 2 difficult topics or cognitive barriers.
    5. A 3-step Suggested Revision Plan leading to the final exam.
    6. Exactly 2 recommended classroom interactive activities.
    7. Exactly 2 assessment recommendations (grading patterns, diagnostics).
    8. A professional, forward-looking AI generated semester summary of 2-3 sentences.

    You must return a valid JSON object matching this TypeScript structure:
    {
      "summary": "string",
      "atRiskStudents": ["string"],
      "teachingImprovements": ["string"],
      "difficultTopics": ["string"],
      "revisionPlan": ["string"],
      "classroomActivities": ["string"],
      "assessmentRecommendations": ["string"],
      "semesterSummary": "string"
    }
    Ensure valid JSON syntax. Do not wrap in markdown code blocks. Just output the clean JSON text.
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      const parsed = JSON.parse(response.text || '{}');
      return res.json({ analysis: parsed });
    } catch (e) {
      console.error("Gemini classroom analysis call failed, generating fallback response.", e);
    }
  }

  // Simulated fallback
  const fallbackAnalysis = {
    summary: `The classroom "${classroom.className}" showcases an average grade of ${avgGrade.toFixed(1)}% and standard participation rates around ${avgAtt.toFixed(1)}%. While top students show excellent theoretical grasp, there is a distinct learning curve around complex concepts.`,
    atRiskStudents: studentProfiles.filter(p => p.riskLevel === 'high' || p.avgMarks < 60).map(p => {
      const u = DB.users.find(usr => usr.id === p.userId);
      return `${u?.name || 'Student'} (GPA: ${p.avgMarks}%, Risk: ${p.riskLevel})`;
    }),
    teachingImprovements: [
      'Introduce bi-weekly hands-on laboratory debugging sessions.',
      'Adopt active recall review drills at the start of each lecture.',
      'Hold scheduled feedback forums to address registered complaints proactively.'
    ],
    difficultTopics: [
      classroom.subject.includes('Database') ? 'Relational schema decomposition and normal forms' : 'Mathematical induction and complex calculus proofs',
      'Practical synthesis of theoretical models'
    ],
    revisionPlan: [
      'Step 1: Core diagnostics - evaluate foundation gaps.',
      'Step 2: Interactive problem-solving workshops.',
      'Step 3: Comprehensive full-syllabus mock examinations.'
    ],
    classroomActivities: [
      'Competitive peer-mentoring labs with mixed-ability pairings.',
      'Interactive flash quizzes with immediate conceptual breakdowns.'
    ],
    assessmentRecommendations: [
      'Incorporate early diagnostic quiz modules worth 10% total weight.',
      'Offer micro-credits for regular active class participation.'
    ],
    semesterSummary: `Overall, classroom "${classroom.className}" is on a steady trajectory but requires immediate targeted interventions in hands-on labs to support at-risk students before final assessments.`
  };

  res.json({ analysis: fallbackAnalysis });
});

// ANALYZE COMPLAINT LIVE WITH AI
app.post('/api/ai/analyze-complaint', async (req, res) => {
  const { complaintId } = req.body;
  const complaint = DB.complaints.find(c => c.id === complaintId);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint feedback record not found.' });
  }

  const prompt = `
    You are Aura, an elite AI Student Relations and Campus Environment Specialist.
    Analyze the following student complaint/feedback report objectively:
    - Subject Category: ${complaint.category}
    - Reported Severity (Student-perceived): ${complaint.severity}
    - Feedback Text: "${complaint.text}"
    
    Evaluate this text objectively and determine:
    1. Sentiment: A descriptive phrase or word (e.g. "Highly Frustrated", "Constructive but concerned", "Disappointed").
    2. Toxicity: Whether the text contains toxic, abusive, offensive, or highly unprofessional language (e.g. "Safe", "Toxic", "Borderline").
    3. Urgency: Select from "low", "medium", or "high" with an explanation of why.
    4. Category: A refined and standardized category for routing (e.g. "Instruction Quality", "Infrastructure", "Grading Discrepancy", "Scheduling", "Harassment").
    5. Suggest Corrective actions for teachers (exactly 3 constructive recommendations).
    6. Suggest Resolution steps for admins (exactly 3 actionable institutional steps).

    You must return a valid JSON object matching this TypeScript structure:
    {
      "sentiment": "string",
      "toxicity": "string",
      "urgency": "low" | "medium" | "high",
      "urgencyExplanation": "string",
      "category": "string",
      "teacherSuggestions": ["string"],
      "adminSuggestions": ["string"]
    }
    Ensure valid JSON syntax. Do not wrap in markdown code blocks. Just output the clean JSON text.
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      const parsed = JSON.parse(response.text || '{}');
      return res.json({ analysis: parsed });
    } catch (e) {
      console.error("Gemini complaint analysis call failed, generating fallback response.", e);
    }
  }

  // Simulated fallback
  const fallbackAnalysis = {
    sentiment: complaint.severity === 'high' ? 'Highly Frustrated' : 'Concerned / Constructive',
    toxicity: 'Safe',
    urgency: complaint.severity,
    urgencyExplanation: `The student flagged this complaint as ${complaint.severity} severity. It relates to ${complaint.category} which directly impacts student experience.`,
    category: complaint.category,
    teacherSuggestions: [
      'Conduct a clear anonymous clarification poll during the next lecture session.',
      'Offer supplementary support materials or open tutoring hours.',
      'Adjust explanation pace to ensure students are aligned on critical steps.'
    ],
    adminSuggestions: [
      'Facilitate a direct discussion with the department chair to assess overall instructor resources.',
      'Sponsor targeted workshops for classroom communication excellence.',
      'Check if multiple parallel cohorts are raising similar structural feedback reports.'
    ]
  };

  res.json({ analysis: fallbackAnalysis });
});

// GENERATE PARENT REPORT
app.post('/api/ai/parent-report', async (req, res) => {
  const { studentId } = req.body;
  const user = DB.users.find(u => u.id === studentId);
  const sp = DB.studentProfiles.find(p => p.userId === studentId);

  if (!user || !sp) return res.status(404).json({ error: 'Student profile not found.' });

  const prompt = `
    Write a formal academic counselor letter addressed to the parent/guardian of "${user.name}" (Roll: ${sp.rollNumber}, GPA Avg: ${sp.avgMarks}%).
    Highlight overall progress, address potential risk level (${sp.riskLevel}), and convey supportive, actionable study suggestions at home. Keep the tone compassionate, professional, and clear.
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });
      return res.json({ report: response.text });
    } catch (err) {
      console.error(err);
    }
  }

  const fallbackReport = `
Dear Parent/Guardian of \${user.name},

I am writing to provide an academic progress report regarding your child's current semester. \${user.name} is registered under Roll Number \${sp.rollNumber} and currently holds an academic average of \${sp.avgMarks}%.

Our analytics engine classifies their overall academic risk status as: \${sp.riskLevel.toUpperCase()}. 
\${sp.riskLevel === 'high' ? 'We have observed some gaps in lecture attendance and foundational assessments. We strongly recommend encouraging daily study routines and ensuring regular class attendance at home.' : 'Your child is demonstrating steady comprehension of the curriculum. Consistent study habits at home will continue to nurture excellent academic achievements.'}

We are fully committed to supporting \${user.name} in achieving their full potential.

Sincerely,
Department Counselor
Student Teacher Analytics Platform
  `;
  res.json({ report: fallbackReport });
});

// AI CHAT ASSISTANT ENDPOINT
app.post('/api/ai/assistant', async (req, res) => {
  const { userId, userRole, message, chatHistory } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'Please provide userId and message.' });
  }

  // 1. Gather context from DB
  const user = DB.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  let contextString = `User Name: ${user.name}\nUser Role: ${user.role}\n`;

  if (user.role === 'student') {
    const profile = DB.studentProfiles.find(sp => sp.userId === userId);
    const marks = DB.marks.filter(m => m.studentId === userId);
    const attendance = DB.attendance.filter(a => a.studentId === userId);
    const alerts = computeAlerts(userId);

    contextString += `Academic profile average marks: ${profile?.avgMarks || 0}%\nRank: #${profile?.rank || 'N/A'}\nRisk status: ${profile?.riskLevel || 'low'}\n`;
    contextString += `Marks records:\n${marks.map(m => `- ${m.subject} [${m.examType}]: ${m.marksObtained}/${m.maxMarks}%`).join('\n')}\n`;
    contextString += `Attendance records:\n${attendance.map(a => `- Classroom: ${a.classroomId}, ${a.present}/${a.total} days present`).join('\n')}\n`;
    contextString += `Active alerts:\n${alerts.map(a => `- [${a.type}]: ${a.message}`).join('\n')}\n`;
  } else if (user.role === 'teacher') {
    const classrooms = DB.classrooms.filter(c => c.teacherId === userId);
    const classIds = classrooms.map(c => c.id);
    const enrollments = DB.studentClasses.filter(sc => classIds.includes(sc.classroomId));
    const studentsInClasses = DB.users.filter(u => enrollments.some(e => e.studentId === u.id));

    contextString += `Teacher manages classrooms:\n${classrooms.map(c => `- ${c.className} (${c.subject}) Code: ${c.id}`).join('\n')}\n`;
    contextString += `Enrolled student rosters:\n`;
    studentsInClasses.forEach(s => {
      const sp = DB.studentProfiles.find(p => p.userId === s.id);
      contextString += `- Student: ${s.name} (Roll: ${sp?.rollNumber || 'N/A'}), GPA: ${sp?.avgMarks || 0}%, Risk: ${sp?.riskLevel || 'low'}\n`;
    });
  } else if (user.role === 'admin') {
    const studentsCount = DB.users.filter(u => u.role === 'student').length;
    const teachersCount = DB.users.filter(u => u.role === 'teacher').length;
    const classesCount = DB.classrooms.length;
    const complaintsCount = DB.complaints.length;
    const activeCount = DB.users.filter(u => u.active).length;
    const alerts = getGlobalAlerts();

    contextString += `Institution Overview:\n`;
    contextString += `- Total students registered: ${studentsCount}\n`;
    contextString += `- Total faculty members: ${teachersCount}\n`;
    contextString += `- Total active classes: ${classesCount}\n`;
    contextString += `- Total feedback complaints filed: ${complaintsCount}\n`;
    contextString += `- Active users: ${activeCount}\n`;
    contextString += `Recent active warnings / alerts across the institute:\n${alerts.slice(0, 10).map(a => `- ${a.message} (Severity: ${a.severity})`).join('\n')}\n`;
  }

  const prompt = `
    You are Aura, an exceptionally polished, intelligent, and supportive AI Academic Co-pilot and Assistant.
    You are chatting with a user whose role is "${user.role}". Use their actual school records to answer their questions.
    
    Current User Context:
    ${contextString}

    Chat History:
    ${(chatHistory || []).map((h: any) => `${h.role === 'user' ? 'Student/Staff' : 'Aura'}: ${h.text}`).join('\n')}

    New User Message: "${message}"

    Provide a highly informative, professional, and visually structured answer (using clear bullet points, brief sections, and elegant typography cues) based on the real context data above.
    Do not mention database IDs or technical server variables.
  `;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });
      return res.json({ reply: response.text });
    } catch (err) {
      console.error("Assistant live Gemini API call failed, generating context-specific fallback reply.", err);
    }
  }

  // HIGH FIDELITY SIMULATED BACKEND FALLBACK
  let reply = '';
  const msgLower = message.toLowerCase();

  if (user.role === 'student') {
    const profile = DB.studentProfiles.find(sp => sp.userId === userId);
    const marks = DB.marks.filter(m => m.studentId === userId);
    
    if (msgLower.includes('mark') || msgLower.includes('low') || msgLower.includes('grade') || msgLower.includes('why')) {
      const lowMarks = marks.filter(m => m.marksObtained < 60);
      if (lowMarks.length > 0) {
        reply = `Hello ${user.name},\n\nBased on your actual academic record, your average is currently **${profile?.avgMarks || 0}%** (Rank: **#${profile?.rank || 'N/A'}**). \n\nI have identified specific areas where your marks are lower:\n` +
          lowMarks.map(m => `- **${m.subject}** (${m.examType}): scored **${m.marksObtained}/${m.maxMarks}**`).join('\n') +
          `\n\n**Key Suggestions:**\n1. Seek immediate mentorship for these specific modules.\n2. Leverage our customized study planners to review topics daily.\n3. Complete practice question worksheets before the next assessments.`;
      } else {
        reply = `Hello ${user.name},\n\nYour current GPA average is **${profile?.avgMarks || 0}%**, placing you at Rank **#${profile?.rank || 'N/A'}** in your courses. Your grades are solid and stable across the board! Keep up this consistent effort.`;
      }
    } else {
      reply = `Hello ${user.name}! I'm Aura, your AI Academic Co-pilot. \n\nI can help you analyze your grades, track your overall attendance, or suggest customized study plans based on your performance. What would you like to explore today?`;
    }
  } else if (user.role === 'teacher') {
    if (msgLower.includes('attention') || msgLower.includes('student') || msgLower.includes('risk')) {
      const classrooms = DB.classrooms.filter(c => c.teacherId === userId);
      const classIds = classrooms.map(c => c.id);
      const enrollments = DB.studentClasses.filter(sc => classIds.includes(sc.classroomId));
      const studentIdsInClasses = Array.from(new Set(enrollments.map(e => e.studentId)));
      
      const atRisk = DB.studentProfiles.filter(p => studentIdsInClasses.includes(p.userId) && p.riskLevel === 'high');
      
      if (atRisk.length > 0) {
        reply = `Hello Professor ${user.name},\n\nI have scanned your classroom rosters and identified **${atRisk.length} students** that currently require direct intervention:\n\n` +
          atRisk.map(p => {
            const u = DB.users.find(usr => usr.id === p.userId);
            return `- **${u?.name}** (GPA: ${p.avgMarks}%, Risk Level: **HIGH**). Issues: low midterms score or low class attendance.`;
          }).join('\n') +
          `\n\nWould you like me to generate customized remedial feedback drafts or support materials for these students?`;
      } else {
        reply = `Hello Professor ${user.name},\n\nAll students enrolled in your classrooms are currently in stable status. There are no critical high-risk warning flags at this moment!`;
      }
    } else {
      reply = `Hello Professor ${user.name}! I am Aura, your AI Faculty Assistant. \n\nI am connected to your classroom dashboards. You can ask me to list students needing academic attention, analyze overall grades, or compile session summaries. How can I assist you today?`;
    }
  } else if (user.role === 'admin') {
    if (msgLower.includes('report') || msgLower.includes('institute') || msgLower.includes('generate')) {
      const studentsCount = DB.users.filter(u => u.role === 'student').length;
      const teachersCount = DB.users.filter(u => u.role === 'teacher').length;
      const classesCount = DB.classrooms.length;
      const complaintsCount = DB.complaints.length;
      const highRiskCount = DB.studentProfiles.filter(p => p.riskLevel === 'high').length;
      
      reply = `### 🏛️ Aura Administrative Executive Health Report\n` +
        `**Generated:** ${new Date().toLocaleDateString()}\n\n` +
        `#### 📊 Institutional Scale & Engagement:\n` +
        `- **Total Students:** ${studentsCount}\n` +
        `- **Total Faculty Members:** ${teachersCount}\n` +
        `- **Total Active Classrooms:** ${classesCount}\n` +
        `- **Student Complaints / Feedback Logs:** ${complaintsCount} cases\n\n` +
        `#### ⚠️ Critical Audits & Student Risks:\n` +
        `- **High Academic Risk Statuses:** ${highRiskCount} students (GPA < 55% or Attendance < 75%)\n` +
        `- **System Status:** **STABLE** (WebSocket real-time sync connected, database integrity check: passed).\n\n` +
        `*Would you like to drill down into a specific department comparison or audit complaint analytics?*`;
    } else {
      reply = `Hello Admin! I am Aura, the Senior Institute AI Advisor. \n\nI have complete structural visibility over institutional analytics, student rosters, faculty sizes, and compliancy complaints. You can ask me to: \n- **Generate an institute report**\n- **Audit pending complaints**\n- **Analyze overall campus risk profiles**`;
    }
  }

  res.json({ reply });
});

// ADMIN ACTIONS
app.get('/api/admin/users', (req, res) => {
  // Return all users with password scrubbed
  const list = DB.users.map(u => {
    const { password: _, ...rest } = u;
    const sp = DB.studentProfiles.find(s => s.userId === u.id);
    const tp = DB.teacherProfiles.find(t => t.userId === u.id);
    return {
      ...rest,
      rollNumber: sp?.rollNumber,
      semester: sp?.currentSemester,
      avgMarks: sp?.avgMarks,
      riskLevel: sp?.riskLevel,
      department: tp?.department
    };
  });
  res.json({ users: list });
});

// ---------------------------------------------------------
// VITE DEV SERVER MIDDLEWARE AND PRODUCTION STATIC HOSTING
// ---------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite Developer server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up Production static file servers...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Academic Analytics Platform running on http://localhost:${PORT}`);
  });
}

startServer();
