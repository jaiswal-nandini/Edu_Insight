/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  password?: string; // Optional on client side for security
}

export interface StudentProfile {
  userId: string;
  rollNumber: string;
  currentSemester: string;
  avgMarks: number;
  rank: number;
  riskLevel: 'low' | 'medium' | 'high';
  knowledgeScore: number; // 0 to 100 representing academic mastery
}

export interface TeacherProfile {
  userId: string;
  department: string;
}

export interface AdminProfile {
  userId: string;
  accessLevel: string;
}

export interface Classroom {
  id: string; // Unique generated alphanumeric classroom code (e.g. AB5XQ9)
  className: string;
  subject: string;
  semester: string;
  teacherId: string; // FK to Users
  archived: boolean;
  studentCount?: number; // Calculated field
}

export interface StudentClass {
  studentId: string; // FK to Users (student)
  classroomId: string; // FK to Classrooms
}

export type ExamType = 
  | 'Internal 1'
  | 'Internal 2'
  | 'Mid Semester'
  | 'Final'
  | 'Assignment'
  | 'Quiz'
  | 'Lab'
  | 'Project';

export interface Mark {
  id: string;
  studentId: string; // FK to Users
  subject: string;
  classroomId: string; // FK to Classrooms
  examType: ExamType;
  marksObtained: number;
  maxMarks: number; // Usually 100
}

export interface Attendance {
  id: string;
  studentId: string; // FK to Users
  classroomId: string; // FK to Classrooms
  present: number;
  total: number;
}

export interface Complaint {
  id: string;
  studentId: string | null; // Null if anonymous
  studentName?: string; // Calculated for teachers/admins
  teacherId: string; // FK to Users (teacher the complaint is about)
  teacherName?: string; // Calculated
  text: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved';
  anonymous: boolean;
  upvotes: number;
  upvotedBy: string[]; // List of userIds who upvoted
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string; // FK to Users
  message: string;
  status: 'read' | 'unread';
  createdAt: string;
}

export interface AIAnalysis {
  id: string;
  studentId: string; // FK to Users
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  weeklyPlan: { day: string; task: string }[];
  careerSuggestions: string[];
  learningResources: string[];
  motivation: string;
  improvementAreas: string[];
  studyHours: number;
  examReadiness: number; // Percentage
  timeManagementTips: string[];
  examPrepTips: string[];
  learningStrategy: string;
  confidenceScore: number; // 0 to 100
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AcademicAlert {
  id: string;
  studentId: string;
  studentName: string;
  type: 'Low Marks' | 'Repeated Low Scores' | 'Poor Attendance' | 'Too Many Complaints' | 'Missing Assignments';
  message: string;
  severity: 'medium' | 'high';
  createdAt: string;
}
