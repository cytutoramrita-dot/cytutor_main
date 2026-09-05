import axios from 'axios';
import { User, Challenge, Classroom, ClassroomMember, ClassroomChallenge, Assignment, AssignmentProgressRow, LeaderboardEntry, JoinRequest } from '../types';

// Simplified API URL detection using environment variables
const getApiUrl = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback to default development URL
  return 'http://localhost:3001/api';
};

const API_URL = getApiUrl();
console.log('🔗 API URL:', API_URL, '| Current host:', window.location.hostname);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('cytutor_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401s
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Only force a logout if this request was actually sending a token —
            // an anonymous 401 (e.g. wrong password on /auth/login) isn't a session expiry
            const hadToken = Boolean(error.config?.headers?.Authorization);
            localStorage.removeItem('cytutor_token');
            if (hadToken) {
                window.dispatchEvent(new Event('cytutor:unauthorized'));
            }
        }
        return Promise.reject(error);
    }
);

export const auth = {
    checkEmail: async (email: string): Promise<{ exists: boolean; requiresVerification: boolean }> => {
        const response = await api.post('/auth/check-email', { email });
        return response.data;
    },
    register: async (email: string, password: string): Promise<{ success: boolean; message: string; email: string }> => {
        const response = await api.post('/auth/register', { email, password });
        return response.data;
    },
    verifyOtp: async (email: string, otp: string): Promise<{ token: string; user: Partial<User> }> => {
        const response = await api.post('/auth/verify-otp', { email, otp });
        return response.data;
    },
    resendOtp: async (email: string, otpType: 'signup' | 'forgot_password'): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/auth/resend-otp', { email, otpType });
        return response.data;
    },
    login: async (email: string, password: string): Promise<{ token: string; user: Partial<User> }> => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },
    forgotPassword: async (email: string): Promise<{ success: boolean; message: string; email: string }> => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },
    resetPassword: async (email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/auth/reset-password', { email, otp, newPassword });
        return response.data;
    },
};

export const users = {
    getMe: async (): Promise<User> => {
        const response = await api.get('/users/me');
        return response.data;
    },
    updateProfile: async (data: Partial<User>): Promise<User> => {
        const response = await api.put('/users/me', data);
        return response.data;
    },
    checkStreak: async (): Promise<{ status: string; stats: any; reward?: any }> => {
        const response = await api.post('/users/streak/check');
        return response.data;
    },
    restoreStreak: async (): Promise<{ success: boolean; newStreak: number; pointsSpent: number }> => {
        const response = await api.post('/users/streak/restore');
        return response.data;
    }
};

export const challenges = {
    getAll: async (): Promise<Challenge[]> => {
        const response = await api.get('/challenges');
        return response.data;
    },
    getById: async (id: string): Promise<Challenge> => {
        const response = await api.get(`/challenges/${id}`);
        return response.data;
    },
    start: async (id: string): Promise<any> => {
        const response = await api.post(`/challenges/${id}/start`);
        return response.data;
    },
    stop: async (id: string): Promise<any> => {
        const response = await api.post(`/challenges/${id}/stop`);
        return response.data;
    },
    submit: async (id: string, flag: string): Promise<{ success: boolean; points: number }> => {
        const response = await api.post(`/challenges/${id}/submit`, { flag });
        return response.data;
    }
};

export const tutorials = {
    getAll: async (): Promise<any[]> => {
        const response = await api.get('/tutorials');
        return response.data;
    },
    getById: async (id: string): Promise<any> => {
        const response = await api.get(`/tutorials/${id}`);
        return response.data;
    },
    updateProgress: async (id: string, progress: number, timeSpent?: number): Promise<any> => {
        const response = await api.post(`/tutorials/${id}/progress`, { 
            progress, 
            timeSpent: timeSpent || 0 
        });
        return response.data;
    },
    // submitQuiz removed - tutorials are now quiz-free
    rate: async (id: string, rating: number, feedback?: string): Promise<any> => {
        const response = await api.post(`/tutorials/${id}/rating`, { 
            rating, 
            feedback 
        });
        return response.data;
    }
};

export const classrooms = {
  // ── Classrooms ──────────────────────────────────────────────────────────
  create: async (name: string, description?: string): Promise<Classroom> => {
    const r = await api.post('/classrooms', { name, description });
    return r.data;
  },
  getMy: async (): Promise<Classroom[]> => {
    const r = await api.get('/classrooms/my');
    return r.data;
  },
  join: async (invite_code: string): Promise<{ success: boolean; status: 'pending'; classroom: { id: string; name: string } }> => {
    const r = await api.post('/classrooms/join', { invite_code });
    return r.data;
  },
  // Admin: list classrooms awaiting approval
  getPending: async (): Promise<(Classroom & { creator_name: string; creator_email: string })[]> => {
    const r = await api.get('/classrooms/pending');
    return r.data;
  },
  // Admin: approve or reject a pending classroom
  approveClassroom: async (id: string): Promise<Classroom> => {
    const r = await api.patch(`/classrooms/${id}/approve`);
    return r.data;
  },
  rejectClassroom: async (id: string): Promise<Classroom> => {
    const r = await api.patch(`/classrooms/${id}/reject`);
    return r.data;
  },
  getById: async (id: string): Promise<Classroom> => {
    const r = await api.get(`/classrooms/${id}`);
    return r.data;
  },
  update: async (id: string, data: { name?: string; description?: string }): Promise<Classroom> => {
    const r = await api.patch(`/classrooms/${id}`, data);
    return r.data;
  },
  deactivate: async (id: string): Promise<{ success: boolean }> => {
    const r = await api.delete(`/classrooms/${id}`);
    return r.data;
  },
  // Student: leave a classroom they're a member of
  leave: async (id: string): Promise<{ success: boolean }> => {
    const r = await api.post(`/classrooms/${id}/leave`);
    return r.data;
  },

  // ── Members ──────────────────────────────────────────────────────────────
  getMembers: async (id: string): Promise<ClassroomMember[]> => {
    const r = await api.get(`/classrooms/${id}/members`);
    return r.data;
  },
  removeMember: async (classroomId: string, userId: string): Promise<{ success: boolean }> => {
    const r = await api.delete(`/classrooms/${classroomId}/members/${userId}`);
    return r.data;
  },
  getMemberAssignments: async (classroomId: string, userId: string): Promise<Assignment[]> => {
    const r = await api.get(`/classrooms/${classroomId}/members/${userId}/assignments`);
    return r.data;
  },
  // Mentor: manage join requests
  getJoinRequests: async (classroomId: string): Promise<JoinRequest[]> => {
    const r = await api.get(`/classrooms/${classroomId}/join-requests`);
    return r.data;
  },
  approveJoin: async (classroomId: string, userId: string): Promise<{ success: boolean }> => {
    const r = await api.patch(`/classrooms/${classroomId}/members/${userId}/approve`);
    return r.data;
  },
  rejectJoin: async (classroomId: string, userId: string): Promise<{ success: boolean }> => {
    const r = await api.patch(`/classrooms/${classroomId}/members/${userId}/reject`);
    return r.data;
  },

  // ── Classroom Challenges ─────────────────────────────────────────────────
  createChallenge: async (classroomId: string, data: Partial<ClassroomChallenge>): Promise<ClassroomChallenge> => {
    const r = await api.post(`/classrooms/${classroomId}/challenges`, data);
    return r.data;
  },
  // Uploads files for a downloadable classroom challenge; returns their URLs
  // to pass into createChallenge's file_attachments.
  uploadChallengeFiles: async (classroomId: string, files: File[]): Promise<{ urls: string[] }> => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    const r = await api.post(`/classrooms/${classroomId}/challenges/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  },
  getChallenges: async (classroomId: string): Promise<ClassroomChallenge[]> => {
    const r = await api.get(`/classrooms/${classroomId}/challenges`);
    return r.data;
  },
  updateChallenge: async (classroomId: string, challengeId: string, data: Partial<ClassroomChallenge>): Promise<ClassroomChallenge> => {
    const r = await api.patch(`/classrooms/${classroomId}/challenges/${challengeId}`, data);
    return r.data;
  },
  deleteChallenge: async (classroomId: string, challengeId: string): Promise<{ success: boolean }> => {
    const r = await api.delete(`/classrooms/${classroomId}/challenges/${challengeId}`);
    return r.data;
  },

  // ── Assignments ──────────────────────────────────────────────────────────
  createAssignment: async (classroomId: string, data: {
    title: string;
    instructions?: string;
    global_challenge_id?: string;
    classroom_challenge_id?: string;
    due_date?: string;
  }): Promise<Assignment> => {
    const r = await api.post(`/classrooms/${classroomId}/assignments`, data);
    return r.data;
  },
  getAssignments: async (classroomId: string): Promise<Assignment[]> => {
    const r = await api.get(`/classrooms/${classroomId}/assignments`);
    return r.data;
  },
  getMyAssignments: async (): Promise<Assignment[]> => {
    const r = await api.get('/classrooms/my/assignments');
    return r.data;
  },
  getAssignmentById: async (assignmentId: string): Promise<Assignment> => {
    const r = await api.get(`/classrooms/assignments/${assignmentId}`);
    return r.data;
  },
  updateAssignment: async (classroomId: string, assignmentId: string, data: {
    title?: string;
    instructions?: string;
    due_date?: string;
    is_active?: boolean;
  }): Promise<Assignment> => {
    const r = await api.patch(`/classrooms/${classroomId}/assignments/${assignmentId}`, data);
    return r.data;
  },
  deleteAssignment: async (classroomId: string, assignmentId: string): Promise<{ success: boolean }> => {
    const r = await api.delete(`/classrooms/${classroomId}/assignments/${assignmentId}`);
    return r.data;
  },
  getAssignmentProgress: async (classroomId: string, assignmentId: string): Promise<AssignmentProgressRow[]> => {
    const r = await api.get(`/classrooms/${classroomId}/assignments/${assignmentId}/progress`);
    return r.data;
  },
  submitAssignment: async (assignmentId: string, flag: string): Promise<{
    correct: boolean; attempts: number; points_awarded: number; message: string;
  }> => {
    const r = await api.post(`/classrooms/assignments/${assignmentId}/submit`, { flag });
    return r.data;
  },

  // ── Leaderboard ──────────────────────────────────────────────────────────
  getLeaderboard: async (classroomId: string): Promise<LeaderboardEntry[]> => {
    const r = await api.get(`/classrooms/${classroomId}/leaderboard`);
    return r.data;
  },
};

export default api;
