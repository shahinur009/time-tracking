import { useMutation, useQuery, useQueryClient } from 'react-query';
import { entries } from '../services/entries';
import { useToast } from '../../hooks/useToast';

const LIST_KEY = 'entries';
const CURRENT_KEY = ['entries', 'current'];

export const useEntries = (params = {}) =>
    useQuery({
        queryKey: [LIST_KEY, params],
        queryFn: () => entries.list(params),
        keepPreviousData: true,
    });

export const useCurrentEntry = () =>
    useQuery({
        queryKey: CURRENT_KEY,
        queryFn: entries.current,
        refetchInterval: 30000,
    });

export const useEntry = (id) =>
    useQuery({
        queryKey: [LIST_KEY, 'detail', id],
        queryFn: () => entries.get(id),
        enabled: Boolean(id),
    });

export const useStartEntry = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: entries.start,
        onSuccess: () => {
            client.invalidateQueries(CURRENT_KEY);
            client.invalidateQueries(LIST_KEY);
            client.invalidateQueries(['report']);
        },
        onError: (e) => toast('error', e?.message || 'Could not start timer'),
    });
};

export const useStopEntry = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: entries.stop,
        onSuccess: () => {
            toast('success', 'Timer stopped');
            client.invalidateQueries(CURRENT_KEY);
            client.invalidateQueries(LIST_KEY);
            client.invalidateQueries(['report']);
        },
        onError: (e) => toast('error', e?.message || 'Could not stop timer'),
    });
};

export const useUpdateEntry = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: entries.update,
        onSuccess: () => {
            toast('success', 'Entry updated');
            client.invalidateQueries(LIST_KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useDeleteEntry = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: entries.delete,
        onSuccess: () => {
            toast('success', 'Entry deleted');
            client.invalidateQueries(LIST_KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useCreateEntry = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: entries.create,
        onSuccess: () => {
            toast('success', 'Entry created');
            client.invalidateQueries(LIST_KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};
