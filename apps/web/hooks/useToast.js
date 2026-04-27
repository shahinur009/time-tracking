import { App } from 'antd';

export function useToast() {
    const { message } = App.useApp();

    return (type = 'info', content = '', duration = 3) => {
        if (!content) return;
        if (type === 'success') message.success(content, duration);
        else if (type === 'error') message.error(content, duration);
        else if (type === 'warning') message.warning(content, duration);
        else message.info(content, duration);
    };
}
