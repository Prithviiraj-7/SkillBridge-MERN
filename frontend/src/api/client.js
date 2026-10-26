import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('skillbridge_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401 Unauthorized responses to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register')
    ) {
      // Clear expired token
      localStorage.removeItem('skillbridge_token');
      localStorage.removeItem('skillbridge_user');
      // Dispatch a custom event so AuthContext can clean state without reloading
      window.dispatchEvent(new Event('skillbridge_auth_expired'));
    }
    return Promise.reject(error);
  }
);

/**
 * Utility to extract normalized user-friendly error message from Axios error
 */
export const getErrorMessage = (error, defaultMsg = 'An unexpected error occurred') => {
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return defaultMsg;
};

export default api;
