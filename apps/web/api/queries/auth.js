import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useRouter } from 'next/router';
import { auth } from '../services/auth';
import persister from '../../utils/persister';
import { useToast } from '../../hooks/useToast';
import { AuthKey } from '../../utils/consts';
import { queryInstance } from '../../pages/_app';

function persistSession(data, client) {
    if (!data?.user) return;
    persister.save({ key: 'token', value: data.accessToken });
    persister.save({ key: 'refreshToken', value: data.refreshToken });
    client.setQueryData(AuthKey, data.user);
    persister.save({ key: AuthKey, value: data.user });
}

export const useRegister = () => {
    const router = useRouter();
    const toast = useToast();
    const client = useQueryClient();

    return useMutation({
        mutationFn: auth.register,
        onSuccess: async (data) => {
            toast('success', 'Account created');
            persistSession(data, client);
            router.push('/tracker');
        },
        onError: (error) => {
            toast('error', error?.message || 'Registration failed');
        },
    });
};

export const useLogin = () => {
    const router = useRouter();
    const toast = useToast();
    const client = useQueryClient();

    return useMutation({
        mutationFn: auth.login,
        onSuccess: async (data) => {
            persistSession(data, client);
            router.push('/tracker');
        },
        onError: (error) => {
            toast('error', error?.message || 'Login failed');
        },
    });
};

export const useMe = (options) => {
    return useQuery({
        queryKey: ['me'],
        queryFn: auth.me,
        ...options,
    });
};

export const useLogout = () => {
    const router = useRouter();
    return useMutation({
        mutationFn: auth.logout,
        onSettled: () => {
            queryInstance?.setQueryData(AuthKey, null);
            persister.remove({ key: AuthKey });
            persister.remove({ key: 'token' });
            persister.remove({ key: 'refreshToken' });
            router.push('/login');
        },
    });
};
