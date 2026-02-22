import axios from 'axios';
import type { SubjectFormData } from '../types';

/** Read the csrftoken cookie that Django sets after login. */
function getCsrfToken(): string {
    const match = document.cookie
        .split(';')
        .find((c) => c.trim().startsWith('csrftoken='));
    return match ? match.trim().substring('csrftoken='.length) : '';
}

/**
 * Single shared axios instance.
 * withCredentials: true  → sends Django session cookie on every request
 * X-CSRFToken interceptor → required by DRF SessionAuthentication for POST/PATCH/DELETE
 */
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL as string,
    withCredentials: true,
});

// Inject CSRF token on all mutating requests
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
    create: (data: SubjectFormData) => API.post('/api/subjects/', data),
    update: (id: number, data: Partial<SubjectFormData>) =>
        API.patch(`/api/subjects/${id}/`, data),
    remove: (id: number) => API.delete(`/api/subjects/${id}/`),
};

export default API;
