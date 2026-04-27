import '@/styles/globals.css';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ConfigProvider, App as AntdApp } from 'antd';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from 'react-query';
import { theme } from '@/config/antd.theme';
import { SidebarProvider } from '@/context/SidebarContext';
import { SocketProvider } from '@/context/SocketContext';
import AppLayout from '@/Components/Layout/AppLayout';

export const queryInstance = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const NO_LAYOUT_ROUTES = ['/login', '/signup'];

function App({ Component, pageProps }) {
    const [queryClient] = useState(queryInstance);
    const router = useRouter();
    const noLayout = NO_LAYOUT_ROUTES.includes(router.pathname);

    return (
        <QueryClientProvider client={queryClient}>
            <ConfigProvider theme={theme}>
                <ThemeProvider theme={{ ...theme.token }}>
                    <AntdApp>
                        <SocketProvider>
                            <SidebarProvider>
                                {noLayout ? (
                                    <Component {...pageProps} />
                                ) : (
                                    <AppLayout>
                                        <Component {...pageProps} />
                                    </AppLayout>
                                )}
                            </SidebarProvider>
                        </SocketProvider>
                    </AntdApp>
                </ThemeProvider>
            </ConfigProvider>
        </QueryClientProvider>
    );
}

export default dynamic(() => Promise.resolve(App), { ssr: false });
