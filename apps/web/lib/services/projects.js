import createBaseQuery from '../createBaseQuery';
import { methodsEnums } from '../../utils/consts';

const { GET, POST, PATCH, DELETE } = methodsEnums;
const fetcher = createBaseQuery({});

export const projects = {
    list: async () => {
        const response = await fetcher({ path: '/projects', method: GET });
        return response?.data;
    },
    create: async (body) => {
        const response = await fetcher({ path: '/projects', method: POST, body });
        return response?.data;
    },
    update: async ({ id, ...body }) => {
        const response = await fetcher({ path: `/projects/${id}`, method: PATCH, body });
        return response?.data;
    },
    delete: async (id) => {
        const response = await fetcher({ path: `/projects/${id}`, method: DELETE });
        return response;
    },
    addTask: async ({ id, name }) => {
        const response = await fetcher({
            path: `/projects/${id}/tasks`,
            method: POST,
            body: { name },
        });
        return response?.data;
    },
    updateTask: async ({ id, taskId, ...body }) => {
        const response = await fetcher({
            path: `/projects/${id}/tasks/${taskId}`,
            method: PATCH,
            body,
        });
        return response?.data;
    },
    deleteTask: async ({ id, taskId }) => {
        const response = await fetcher({
            path: `/projects/${id}/tasks/${taskId}`,
            method: DELETE,
        });
        return response?.data;
    },
    toggleFavorite: async (id) => {
        const response = await fetcher({
            path: `/projects/${id}/favorite`,
            method: POST,
        });
        return response?.data;
    },
};
