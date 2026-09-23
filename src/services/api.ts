import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const api = axios.create({
    baseURL: (import.meta as any).env.VITE_API_URL || 'https://bingotwogether.onrender.com/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add JWT token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor to handle unauthorized errors (token expired)
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: any) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            // Optional: window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
