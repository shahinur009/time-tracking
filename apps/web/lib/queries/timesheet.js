import { useMutation, useQuery, useQueryClient } from 'react-query';
import { timesheet } from '../services/timesheet';
import { useToast } from '../../hooks/useToast';

const matrixKey = (params) => ['timesheet', 'matrix', params];

export const useTimesheetMatrix = (params = {}) =>
    useQuery({
        queryKey: matrixKey(params),
        queryFn: () => timesheet.matrix(params),
        keepPreviousData: true,
        enabled: Boolean(params.from && params.to),
    });

export const useTimesheetProjects = () =>
    useQuery({
        queryKey: ['timesheet', 'projects'],
        queryFn: timesheet.projects,
    });

export const useUpsertCell = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: timesheet.upsertCell,
        onSuccess: () => {
            client.invalidateQueries(['timesheet', 'matrix']);
            client.invalidateQueries(['entries']);
            client.invalidateQueries(['report']);
        },
        onError: (e) => toast('error', e?.message || 'Could not save cell'),
    });
};

export const useDeleteTimesheetRow = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: timesheet.deleteRow,
        onSuccess: (data) => {
            client.invalidateQueries(['timesheet', 'matrix']);
            if (data?.trackerEntriesPreserved) {
                toast('warning', 'Row removed. Tracker-recorded time on this project was kept.');
            } else {
                toast('success', 'Row deleted');
            }
        },
        onError: (e) => toast('error', e?.message || 'Could not delete row'),
    });
};

export const useCopyWeek = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: timesheet.copyWeek,
        onSuccess: (data) => {
            client.invalidateQueries(['timesheet', 'matrix']);
            const copied = data?.copied || 0;
            const skipped = data?.skippedDuplicates || 0;
            if (copied === 0) toast('warning', 'Previous week was empty — nothing to copy');
            else toast('success', `Copied ${copied} cells${skipped ? ` (${skipped} skipped)` : ''}`);
        },
        onError: (e) => toast('error', e?.message || 'Could not copy week'),
    });
};

export const useTimesheetTemplates = () =>
    useQuery({
        queryKey: ['timesheet', 'templates'],
        queryFn: timesheet.listTemplates,
    });

export const useCreateTemplate = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: timesheet.createTemplate,
        onSuccess: () => {
            client.invalidateQueries(['timesheet', 'templates']);
            toast('success', 'Template saved');
        },
        onError: (e) => toast('error', e?.message || 'Could not save template'),
    });
};

export const useDeleteTemplate = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: timesheet.deleteTemplate,
        onSuccess: () => {
            client.invalidateQueries(['timesheet', 'templates']);
            toast('success', 'Template removed');
        },
        onError: (e) => toast('error', e?.message || 'Could not delete template'),
    });
};

export const useApplyTemplate = () => {
    const client = useQueryClient();
    const toast = useToast();
    return useMutation({
        mutationFn: timesheet.applyTemplate,
        onSuccess: (data) => {
            client.invalidateQueries(['timesheet', 'matrix']);
            const inserted = data?.inserted || 0;
            if (inserted > 0) toast('success', `Template applied (${inserted} cells)`);
            else toast('success', 'Template applied');
        },
        onError: (e) => toast('error', e?.message || 'Could not apply template'),
    });
};
