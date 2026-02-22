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
  created_at: string;
  updated_at: string;
}

export interface SubjectFormData {
  name: string;
  description?: string;
  color?: string;
}
