import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071/api';

console.log('API Base URL:', API_BASE_URL); // For debugging

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: false,
});

// for debug
apiClient.interceptors.request.use(
  (config) => {
    if (config) {
      const baseURL = config.baseURL || API_BASE_URL;
      const url = config.url || '';
      console.log('Making request to:', `${baseURL}${url}`);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default apiClient;
