import { useQuery } from 'react-query';
import { reports } from '../services/reports';

export const useSummaryReport = (params = {}) =>
    useQuery({
        queryKey: ['report', 'summary', params],
        queryFn: () => reports.summary(params),
        keepPreviousData: true,
    });

export const useDetailedReport = (params = {}) =>
    useQuery({
        queryKey: ['report', 'detailed', params],
        queryFn: () => reports.detailed(params),
    });

export const useWeeklyReport = (params = {}) =>
    useQuery({
        queryKey: ['report', 'weekly', params],
        queryFn: () => reports.weekly(params),
    });

export const useCalendar = (params = {}) =>
    useQuery({
        queryKey: ['calendar', params],
        queryFn: () => reports.calendar(params),
    });
