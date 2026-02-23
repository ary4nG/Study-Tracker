// Shared TypeScript types for SyllabusTrackingApp

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  avatar_url: string;
}

export interface Subject {
  id: number;
  name: string;
  description: string;
  color: string;
  topic_count: number;
  mastered_count: number;
  created_at: string;
  updated_at: string;
}

export interface SubjectFormData {
  name: string;
  description?: string;
  color?: string;
}

export interface Topic {
  id: number;
  subject: number;
  name: string;
  status: 'not_started' | 'in_progress' | 'mastered';
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  subject: number | null;
  topic: number | null;
  subject_name: string | null;
  topic_name: string | null;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  notes: string;
  created_at: string;
}
