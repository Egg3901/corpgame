import axios from 'axios';

// Automatically detect API URL based on current location
// In production (behind nginx), use same origin and proxy /api to backend.
// In local dev, default to backend on port 3001.
// Falls back to environment variable or localhost for SSR/build time.
const getApiUrl = (): string => {
  // If explicitly set, always respect it (works for both browser + SSR)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const { hostname, port, origin, protocol } = window.location;

    // Local development: frontend on 3000, backend on 3001 (no nginx)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port === '3001') return origin;
      return `${protocol}//${hostname}:3001`;
    }

    // Production: same-origin requests (nginx proxies /api to backend)
    return origin;
  }

  // SSR/build time: default to local backend unless overridden
  return 'http://localhost:3001';
};

// Debug function - logs API URL detection
const debugApiUrl = (): void => {
  if (typeof window !== 'undefined') {
    console.log('API URL Detection:', {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      detectedUrl: getApiUrl()
    });
  }
};

// Call debug function (only in browser)
if (typeof window !== 'undefined') {
  debugApiUrl();
}

// Create axios instance - baseURL will be set dynamically per request
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor: Set baseURL dynamically and add auth token
api.interceptors.request.use((config) => {
  // Dynamically set baseURL based on current window location (for browser requests)
  if (typeof window !== 'undefined' && !config.baseURL) {
    config.baseURL = getApiUrl();
  } else if (!config.baseURL) {
    // Fallback for SSR
    config.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  
  // Add auth token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
});

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log full error for debugging
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - is the backend server running?');
    } else if (error.message === 'Network Error') {
      console.error('Network error - check CORS settings and server availability');
    }
    return Promise.reject(error);
  }
);

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  player_name?: string;
  gender?: 'm' | 'f' | 'nonbinary';
  age?: number;
  starting_state?: string;
  registration_secret?: string;
  admin_secret?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
    player_name?: string;
    gender?: 'm' | 'f' | 'nonbinary';
    age?: number;
    starting_state?: string;
    is_admin?: boolean;
    profile_slug: string;
    profile_image_url?: string | null;
    is_banned?: boolean;
    registration_ip?: string;
    last_login_ip?: string;
    last_login_at?: string;
  };
}

export interface ProfileResponse {
  id: number;
  username: string;
  player_name?: string;
  gender?: 'm' | 'f' | 'nonbinary';
  age?: number;
  starting_state?: string;
  profile_slug: string;
  profile_image_url?: string | null;
  is_admin?: boolean;
  is_banned?: boolean;
  created_at: string;
}

export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post('/api/auth/register', data);
      return response.data;
    } catch (error: any) {
      console.error('Registration API error:', error);
      throw error;
    }
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await api.post('/api/auth/login', data);
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error: any) {
      console.error('GetMe API error:', error);
      throw error;
    }
  },
};

export const profileAPI = {
  getBySlug: async (slug: string): Promise<ProfileResponse> => {
    const response = await api.get(`/api/profile/${slug}`);
    return response.data;
  },
  uploadAvatar: async (file: File): Promise<{ profile_image_url: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post('/api/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default api;
