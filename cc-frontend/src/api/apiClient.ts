import axios from 'axios';

const AUTH_STORAGE_KEY = 'courseCompassAuth';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        if (session.token && session.expiresAt > Date.now()) {
          config.headers.Authorization = `Bearer ${session.token}`;
        }
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't clear the stored session on 401 - just redirect to home
      // The AuthProvider will handle re-authentication if needed
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
