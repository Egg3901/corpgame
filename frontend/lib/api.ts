import axios from 'axios';

// Automatically detect API URL based on current location
// In browser, use same hostname but port 3001
// Falls back to environment variable or localhost for SSR/build time
const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    // In browser: use same hostname but port 3001
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // Only change port if not already 3001
    if (window.location.port === '3001') {
      return `${protocol}//${hostname}:${window.location.port}`;
    }
    return `${protocol}//${hostname}:3001`;
  }
  // SSR/build time: use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

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
}

export interface LoginData {
  email: string;
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
  };
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

export default api;

