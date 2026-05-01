import createBaseQuery from '../createBaseQuery';
import { methodsEnums } from '../../utils/consts';
import { API_URL } from '../../config';

const { GET, POST, DELETE } = methodsEnums;
const fetcher = createBaseQuery({});

const status = async () => {
    const res = await fetcher({ path: '/clickup/status', method: GET });
    return res?.data;
};

const teams = async () => {
    const res = await fetcher({ path: '/clickup/teams', method: GET });
    return res?.data;
};

const sync = async (body = {}) => {
    const res = await fetcher({ path: '/clickup/sync', method: POST, body });
    return res?.data;
};

const syncEntries = async () => {
    const res = await fetcher({
        path: '/clickup/sync-entries',
        method: POST,
        body: {},
    });
    return res?.data;
};

const setAutoPush = async (enabled) => {
    const res = await fetcher({
        path: '/clickup/auto-push',
        method: POST,
        body: { enabled },
    });
    return res?.data;
};

const retryWebhook = async () => {
    const res = await fetcher({
        path: '/clickup/webhook/subscribe',
        method: POST,
        body: {},
    });
    return res?.data;
};

const tasks = async (params = {}) => {
    const res = await fetcher({ path: '/clickup/tasks', method: GET, params });
    return res?.data;
};

const disconnect = async () => {
    const res = await fetcher({ path: '/clickup/disconnect', method: DELETE });
    return res?.data;
};

const connectToken = async (token) => {
    const res = await fetcher({
        path: '/clickup/connect-token',
        method: POST,
        body: { token },
    });
    return res?.data;
};

const pushEntry = async (id) => {
    const res = await fetcher({
        path: `/entries/${id}/push-clickup`,
        method: POST,
        body: {},
    });
    return res?.data;
};

const authorizeUrl = `${API_URL}/auth/clickup`;

export const clickup = {
    status,
    teams,
    sync,
    syncEntries,
    setAutoPush,
    retryWebhook,
    tasks,
    disconnect,
    connectToken,
    pushEntry,
    authorizeUrl,
};
