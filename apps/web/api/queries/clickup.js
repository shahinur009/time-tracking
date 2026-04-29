import { useMutation, useQuery, useQueryClient } from 'react-query';
import { clickup } from '../services/clickup';
import { useToast } from '../../hooks/useToast';

const STATUS_KEY = ['clickup', 'status'];
const TASKS_KEY = (params) => ['clickup', 'tasks', params];

export const useClickupStatus = (options = {}) =>
    useQuery({
        queryKey: STATUS_KEY,
        queryFn: clickup.status,
        staleTime: 30 * 1000,
        ...options,
    });

export const useClickupTasks = (params = {}, options = {}) =>
    useQuery({
        queryKey: TASKS_KEY(params),
        queryFn: () => clickup.tasks(params),
        keepPreviousData: true,
        ...options,
    });

export const useClickupSync = () => {
    const toast = useToast();
    const client = useQueryClient();
    return useMutation({
        mutationFn: clickup.sync,
        onSuccess: (data) => {
            toast('success', `Synced ${data?.tasks ?? 0} tasks`);
            client.invalidateQueries(['clickup']);
        },
        onError: (err) => toast('error', err?.message || 'Sync failed'),
    });
};

export const useClickupConnectToken = () => {
    const toast = useToast();
    const client = useQueryClient();
    return useMutation({
        mutationFn: clickup.connectToken,
        onSuccess: () => {
            toast('success', 'ClickUp connected');
            client.invalidateQueries(['clickup']);
        },
        onError: (err) => toast('error', err?.message || 'Connect failed'),
    });
};

export const useClickupDisconnect = () => {
    const toast = useToast();
    const client = useQueryClient();
    return useMutation({
        mutationFn: clickup.disconnect,
        onSuccess: () => {
            toast('success', 'ClickUp disconnected');
            client.invalidateQueries(['clickup']);
        },
        onError: (err) => toast('error', err?.message || 'Disconnect failed'),
    });
};

export const usePushEntryToClickup = () => {
    const toast = useToast();
    const client = useQueryClient();
    return useMutation({
        mutationFn: clickup.pushEntry,
        onSuccess: () => {
            toast('success', 'Pushed to ClickUp');
            client.invalidateQueries(['entries']);
        },
        onError: (err) => toast('error', err?.message || 'Push failed'),
    });
};
