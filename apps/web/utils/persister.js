import { isBrowser } from './isBrowser';
import { AuthKey } from './consts';

const persister = {};

persister.save = ({ key, value } = {}) => {
    if (!isBrowser) return;
    localStorage.setItem(key, JSON.stringify(value));
};

persister.remove = ({ key } = {}) => {
    if (!isBrowser) return;
    localStorage.removeItem(key);
};

persister.get = ({ key } = {}) => {
    if (!isBrowser) return null;
    return JSON.parse(localStorage.getItem(key) || 'null');
};

export const persistAuth = isBrowser ? persister.get({ key: AuthKey }) : {};

export default persister;
