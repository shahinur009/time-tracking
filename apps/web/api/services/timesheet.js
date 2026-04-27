import createBaseQuery from '../createBaseQuery';
import { methodsEnums } from '../../utils/consts';

const { GET, PUT, POST, DELETE } = methodsEnums;
const fetcher = createBaseQuery({});

export const timesheet = {
    matrix: async (params) => {
        const response = await fetcher({
            path: '/timesheet/matrix',
            method: GET,
            params,
        });
        return response?.data;
    },
    projects: async () => {
        const response = await fetcher({ path: '/timesheet/projects', method: GET });
        return response?.data;
    },
    upsertCell: async (body) => {
        const response = await fetcher({
            path: '/timesheet/cell',
            method: PUT,
            body,
        });
        return response?.data;
    },
    deleteRow: async (body) => {
        const response = await fetcher({
            path: '/timesheet/row/delete',
            method: POST,
            body,
        });
        return response?.data;
    },
    copyWeek: async (body) => {
        const response = await fetcher({
            path: '/timesheet/copy-week',
            method: POST,
            body,
        });
        return response?.data;
    },
    listTemplates: async () => {
        const response = await fetcher({
            path: '/timesheet/templates',
            method: GET,
        });
        return response?.data;
    },
    createTemplate: async (body) => {
        const response = await fetcher({
            path: '/timesheet/templates',
            method: POST,
            body,
        });
        return response?.data;
    },
    deleteTemplate: async (id) => {
        const response = await fetcher({
            path: `/timesheet/templates/${id}`,
            method: DELETE,
        });
        return response;
    },
    applyTemplate: async ({ id, ...body }) => {
        const response = await fetcher({
            path: `/timesheet/templates/${id}/apply`,
            method: POST,
            body,
        });
        return response?.data;
    },
};
