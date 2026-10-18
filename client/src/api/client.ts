import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token & generate idempotency key for mutations
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('newtonite_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Automatically attach a unique idempotency key to mutating methods if not already set
  const method = config.method?.toUpperCase();
  if (['POST', 'PUT', 'PATCH'].includes(method || '')) {
    if (!config.headers['X-Idempotency-Key'] && !config.headers['Idempotency-Key']) {
      // Use crypto.randomUUID if available, else random fallback
      const uuid =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'idemp-' + Math.random().toString(36).substring(2) + Date.now();
      config.headers['X-Idempotency-Key'] = uuid;
    }
  }

  return config;
});

// Response interceptor: handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url?.includes('/auth/login')) {
      localStorage.removeItem('newtonite_token');
      localStorage.removeItem('newtonite_user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);
