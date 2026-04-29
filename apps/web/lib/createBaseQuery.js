import axios from 'axios';
import { API_URL } from '../config';
import { auth } from './services/auth';
import persister from '@/utils/persister';

const apiClient = axios.create({
    baseURL: API_URL,
});

apiClient.interceptors.request.use(
    async (config) => {
        if (!config.ignoreToken) {
            try {
                const token = persister.get({ key: 'token' });
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                console.error('Error getting token:', error);
            }
        }
        return config;
    },
    (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.ignoreToken
        ) {
            originalRequest._retry = true;
            try {
                const newToken = await auth.refreshToken();
                if (newToken) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);

export default function createBaseQuery() {
    return async function fetch({
        body,
        path = '',
        credentials = false,
        ignoreToken = false,
        method = 'POST',
        headers: extraHeaders = {},
        params,
        ...restOptions
    }) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...extraHeaders,
            };

            const requestConfig = {
                method,
                headers,
                data: body,
                params,
                url: `${API_URL}${path}`,
                withCredentials: credentials,
                ignoreToken,
                ...restOptions,
            };

            const result = await apiClient(requestConfig);

            if (result.data.status === 'error') {
                throw new Error(result.data.message);
            }
            return result.data;
        } catch (error) {
            const { status, message } = makeErrorResponse({
                status: error.response?.status,
                data: error.response?.data || { message: error.message },
            });
            return Promise.reject({ status, message });
        }
    };
}

function makeErrorResponse({ status, data = {} }) {
    let message = data.message || data.error || 'Internal Server Error';

    if (Array.isArray(data.message)) {
        message = data.message
            .map((msg) => {
                if (Array.isArray(msg?.errors)) return msg.errors.join(',');
                return msg;
            })
            .join(',');
    }
    return { status, message };
}
