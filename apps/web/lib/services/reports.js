import createBaseQuery from '../createBaseQuery';
import { methodsEnums } from '../../utils/consts';

const { GET } = methodsEnums;
const fetcher = createBaseQuery({});

export const reports = {
    summary: async (params) => {
        const response = await fetcher({ path: '/reports/summary', method: GET, params });
        return response?.data;
    },
    detailed: async (params) => {
        const response = await fetcher({ path: '/reports/detailed', method: GET, params });
        return response?.data;
    },
    weekly: async (params) => {
        const response = await fetcher({ path: '/reports/weekly', method: GET, params });
        return response?.data;
    },
    calendar: async (params) => {
        const response = await fetcher({ path: '/calendar', method: GET, params });
        return response?.data;
    },
};
