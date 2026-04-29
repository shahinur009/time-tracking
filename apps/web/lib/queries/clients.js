import { useMutation, useQuery, useQueryClient } from 'react-query';
import { clients } from '../services/clients';
import { useToast } from '../../hooks/useToast';

const KEY = ['clients'];

export const useClients = () =>
    useQuery({ queryKey: KEY, queryFn: clients.list });

export const useCreateClient = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: clients.create,
        onSuccess: () => {
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useUpdateClient = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: clients.update,
        onSuccess: () => {
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useDeleteClient = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: clients.delete,
        onSuccess: () => {
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};
