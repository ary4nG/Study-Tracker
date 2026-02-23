import axios from 'axios';
import type { SubjectFormData, Topic } from '../types';

function getCsrfToken(): string {
    const match = document.cookie
        .split(';')
        .find((c) => c.trim().startsWith('csrftoken='));
    return match ? match.trim().substring('csrftoken='.length) : '';
}

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL as string,
    withCredentials: true,
});

API.interceptors.request.use((config) => {
    const method = config.method?.toLowerCase();
    if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
        config.headers['X-CSRFToken'] = getCsrfToken();
    }
    return config;
});

export const auth = {
    getCurrentUser: () => API.get('/api/auth/user/'),
    logout: () => API.post('/api/auth/logout/'),
};

export const subjects = {
    list: () => API.get('/api/subjects/'),
    get: (id: number) => API.get(`/api/subjects/${id}/`),
    create: (data: SubjectFormData) => API.post('/api/subjects/', data),
    update: (id: number, data: Partial<SubjectFormData>) =>
        API.patch(`/api/subjects/${id}/`, data),
    remove: (id: number) => API.delete(`/api/subjects/${id}/`),
};

export const topics = {
    list: (subjectId: number) => API.get(`/api/topics/?subject=${subjectId}`),
    create: (subjectId: number, name: string) =>
        API.post('/api/topics/', { subject: subjectId, name }),
    update: (id: number, data: Partial<Topic>) =>
        API.patch(`/api/topics/${id}/`, data),
    remove: (id: number) => API.delete(`/api/topics/${id}/`),
};

export const syllabusParser = {
    save: (subjectId: number, topicNames: string[]) =>
        API.post(`/api/subjects/${subjectId}/parse-syllabus/`, { topics: topicNames }),
};

export interface SessionPayload {
    subject: number;
    topic: number | null;
    start_time: string;  // ISO 8601
    end_time: string;    // ISO 8601
    duration_seconds: number;
    notes?: string;
}

export const sessions = {
    list: () => API.get('/api/sessions/'),
    create: (data: SessionPayload) => API.post('/api/sessions/', data),
};

export default API;
