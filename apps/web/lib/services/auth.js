import { API_URL } from '../../config';
import createBaseQuery from '../createBaseQuery';
import persister from '../../utils/persister';
import { AuthKey, methodsEnums } from '../../utils/consts';
import { queryInstance } from '../../pages/_app';

const { GET, POST } = methodsEnums;

const restApiFetcher = createBaseQuery({});

const register = async (args) => {
    const response = await restApiFetcher({
        ignoreToken: true,
        path: '/auth/register',
        method: POST,
        body: args,
    });
    return response?.data;
};

const login = async (args) => {
    const response = await restApiFetcher({
        ignoreToken: true,
        path: '/auth/login',
        method: POST,
        body: args,
    });
    return response?.data;
};

const me = async () => {
    const response = await restApiFetcher({
        path: '/auth/me',
        method: GET,
    });
    return response?.data;
};

const logoutCall = async () => {
    const response = await restApiFetcher({
        ignoreToken: true,
        path: '/auth/logout',
        method: POST,
    });
    return response?.data;
};

const refreshToken = async () => {
    try {
        const refresh = persister.get({ key: 'refreshToken' });
        if (!refresh) throw new Error('No refresh token');

        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: refresh }),
        });

        if (!res.ok) throw new Error('Refresh failed');

        const result = await res.json();
        const accessToken = result?.data?.accessToken;
        const newRefresh = result?.data?.refreshToken;

        if (!accessToken) throw new Error('No access token returned');

        persister.save({ key: 'token', value: accessToken });
        if (newRefresh) persister.save({ key: 'refreshToken', value: newRefresh });
        return accessToken;
    } catch (error) {
        queryInstance?.setQueryData(AuthKey, null);
        persister.remove({ key: AuthKey });
        persister.remove({ key: 'token' });
        persister.remove({ key: 'refreshToken' });
        throw error;
    }
};

export const auth = {
    register,
    login,
    me,
    logout: logoutCall,
    refreshToken,
};
