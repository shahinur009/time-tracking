import { useMutation, useQuery, useQueryClient } from 'react-query';
import { users } from '../services/users';
import { useToast } from '../../hooks/useToast';

const KEY = ['users'];

export const useUsers = (options = {}) =>
    useQuery({ queryKey: KEY, queryFn: users.list, ...options });

export const useCreateUser = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: users.create,
        onSuccess: () => {
            toast('success', 'User created');
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useUpdateUser = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: users.update,
        onSuccess: () => {
            toast('success', 'User updated');
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useUpdateUserRole = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: users.updateRole,
        onSuccess: () => {
            toast('success', 'Role updated');
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useDeleteUser = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: users.delete,
        onSuccess: () => {
            toast('success', 'User deleted');
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};
