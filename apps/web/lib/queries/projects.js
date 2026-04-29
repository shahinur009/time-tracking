import { useMutation, useQuery, useQueryClient } from 'react-query';
import { projects } from '../services/projects';
import { useToast } from '../../hooks/useToast';

const KEY = ['projects'];

export const useProjects = () =>
    useQuery({ queryKey: KEY, queryFn: projects.list });

export const useCreateProject = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: projects.create,
        onSuccess: () => {
            toast('success', 'Project created');
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useUpdateProject = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: projects.update,
        onSuccess: () => {
            toast('success', 'Project updated');
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useDeleteProject = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: projects.delete,
        onSuccess: () => {
            toast('success', 'Project archived');
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useAddProjectTask = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: projects.addTask,
        onSuccess: () => {
            toast('success', 'Task created');
            client.invalidateQueries(KEY);
        },
        onError: (e) => toast('error', e?.message),
    });
};

export const useUpdateProjectTask = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: projects.updateTask,
        onSuccess: () => client.invalidateQueries(KEY),
        onError: (e) => toast('error', e?.message),
    });
};

export const useDeleteProjectTask = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: projects.deleteTask,
        onSuccess: () => client.invalidateQueries(KEY),
        onError: (e) => toast('error', e?.message),
    });
};

export const useToggleProjectFavorite = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: projects.toggleFavorite,
        onSuccess: () => client.invalidateQueries(KEY),
    });
};
