import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '@/config';
import persister from '@/utils/persister';
import useAuth from '@/hooks/useAuth';

const SocketContext = createContext({ socket: null, connected: false });

export function SocketProvider({ children }) {
    const { isAuth, user } = useAuth();
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!isAuth || !user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setConnected(false);
            }
            return;
        }

        const token = persister.get({ key: 'token' });
        if (!token) return;

        const socket = io(API_URL, {
            auth: { token },
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', (err) => {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[socket] connect_error', err.message);
            }
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
    }, [isAuth, user?._id || user?.id]);

    return (
        <SocketContext.Provider
            value={{ socket: socketRef.current, connected }}
        >
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}

export function useSocketEvent(event, handler, deps = []) {
    const { socket } = useSocket();
    useEffect(() => {
        if (!socket || !event || !handler) return;
        socket.on(event, handler);
        return () => socket.off(event, handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, event, ...deps]);
}
