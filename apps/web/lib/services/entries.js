import createBaseQuery from '../createBaseQuery';
import { methodsEnums } from '../../utils/consts';

const { GET, POST, PATCH, DELETE } = methodsEnums;
const fetcher = createBaseQuery({});

export const entries = {
    list: async (params) => {
        const response = await fetcher({ path: '/entries', method: GET, params });
        return response?.data;
    },
    current: async () => {
        const response = await fetcher({ path: '/entries/current', method: GET });
        return response?.data;
    },
    get: async (id) => {
        const response = await fetcher({ path: `/entries/${id}`, method: GET });
        return response?.data;
    },
    start: async (body) => {
        const response = await fetcher({ path: '/entries/start', method: POST, body });
        return response?.data;
    },
    stop: async () => {
        const response = await fetcher({
            path: '/entries/stop',
            method: POST,
            body: { done: true },
        });
        return response?.data;
    },
    create: async (body) => {
        const response = await fetcher({ path: '/entries', method: POST, body });
        return response?.data;
    },
    update: async ({ id, ...body }) => {
        const response = await fetcher({ path: `/entries/${id}`, method: PATCH, body });
        return response?.data;
    },
    delete: async (id) => {
        const response = await fetcher({ path: `/entries/${id}`, method: DELETE });
        return response;
    },
};
