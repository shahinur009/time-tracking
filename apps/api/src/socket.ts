import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from './utils/jwt';
import { User, UserRole } from './models/User';
import { env } from './config/env';

export interface SocketUser {
  id: string;
  role: UserRole;
  email: string;
  name: string;
}

declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization as string | undefined)?.replace(
          /^Bearer\s+/i,
          '',
        );
      if (!token) return next(new Error('Missing token'));

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (!user || user.status !== 'active') {
        return next(new Error('User not found or inactive'));
      }

      socket.user = {
        id: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
      };
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const u = socket.user;
    if (!u) return socket.disconnect(true);

    socket.join(userRoom(u.id));
    if (u.role === 'admin') {
      socket.join(ADMIN_ROOM);
    }

    if (env.NODE_ENV !== 'production') {
      console.log(`[socket] connected ${u.email} (${u.role})`);
    }

    socket.on(
      'timesheet:join',
      (payload: { userId: string; weekStart: string }) => {
        if (!payload?.userId || !payload?.weekStart) return;
        if (
          u.role === 'member' &&
          payload.userId !== u.id
        ) {
          return;
        }
        const room = timesheetRoom(payload.userId, payload.weekStart);
        socket.join(room);
      },
    );

    socket.on(
      'timesheet:leave',
      (payload: { userId: string; weekStart: string }) => {
        if (!payload?.userId || !payload?.weekStart) return;
        const room = timesheetRoom(payload.userId, payload.weekStart);
        socket.leave(room);
        socket.to(room).emit('cell:blur', {
          editorId: u.id,
          editorName: u.name,
        });
      },
    );

    socket.on(
      'cell:focus',
      (payload: {
        userId: string;
        weekStart: string;
        projectId: string | null;
        day: string;
      }) => {
        if (!payload?.userId || !payload?.weekStart) return;
        const room = timesheetRoom(payload.userId, payload.weekStart);
        socket.to(room).emit('cell:focus', {
          editorId: u.id,
          editorName: u.name,
          editorEmail: u.email,
          projectId: payload.projectId,
          day: payload.day,
        });
      },
    );

    socket.on(
      'cell:blur',
      (payload: {
        userId: string;
        weekStart: string;
        projectId: string | null;
        day: string;
      }) => {
        if (!payload?.userId || !payload?.weekStart) return;
        const room = timesheetRoom(payload.userId, payload.weekStart);
        socket.to(room).emit('cell:blur', {
          editorId: u.id,
          editorName: u.name,
          projectId: payload.projectId,
          day: payload.day,
        });
      },
    );

    socket.on('disconnect', () => {
      if (env.NODE_ENV !== 'production') {
        console.log(`[socket] disconnected ${u.email}`);
      }
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export const ADMIN_ROOM = 'admin:all';
export const userRoom = (userId: string): string => `user:${userId}`;
export const timesheetRoom = (userId: string, weekStart: string): string =>
  `timesheet:${userId}:${weekStart}`;

export function emitToAdmins(event: string, payload: unknown): void {
  if (!io) return;
  io.to(ADMIN_ROOM).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(userRoom(userId)).emit(event, payload);
}

export function emitToTimesheet(
  userId: string,
  weekStart: string,
  event: string,
  payload: unknown,
): void {
  if (!io) return;
  io.to(timesheetRoom(userId, weekStart)).emit(event, payload);
}
