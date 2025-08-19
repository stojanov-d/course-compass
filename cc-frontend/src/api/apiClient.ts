import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === 'development'
    ? 'http://localhost:7071/api'
    : '/api');

if (import.meta.env.MODE === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: false,
});

apiClient.interceptors.request.use(
  (config) => {
    const storedAuth = localStorage.getItem('courseCompassAuth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        if (authData.token) {
          config.headers.Authorization = `Bearer ${authData.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }

    return config;
  },
  (error) => {
    if (import.meta.env.MODE === 'development') {
      console.error('Request interceptor error:', error);
    }
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.MODE === 'development') {
      console.error('API Error:', error.response?.status, error.response?.data);
    }

    if (error.response?.status === 401) {
      if (import.meta.env.MODE === 'development') {
        console.log('Authentication failed, clearing stored session');
      }
      localStorage.removeItem('courseCompassAuth');
      window.location.reload();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
