import { Request, Response } from 'express';
import { User } from '../models/User';
import { ClickUpTask } from '../models/ClickUpTask';
import { ApiError } from '../utils/ApiError';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { randomToken } from '../utils/crypto';
import { clickupConfigured, env } from '../config/env';
import {
  buildAuthorizeUrl,
  exchangeCode,
  fetchAuthorizedUser,
  fetchTeams,
  loadTokenForUser,
  storeTokenForUser,
  syncUserTasks,
} from '../services/clickup';

const stateStore = new Map<string, { createdAt: number }>();
const STATE_TTL_MS = 10 * 60 * 1000;

function pruneStates(): void {
  const now = Date.now();
  for (const [k, v] of stateStore.entries()) {
    if (now - v.createdAt > STATE_TTL_MS) stateStore.delete(k);
  }
}

function ensureConfigured(): void {
  if (!clickupConfigured()) {
    throw new ApiError(503, 'ClickUp integration not configured on server');
  }
}

export async function authorize(_req: Request, res: Response): Promise<void> {
  ensureConfigured();
  pruneStates();
  const state = randomToken(24);
  stateStore.set(state, { createdAt: Date.now() });
  res.redirect(buildAuthorizeUrl(state));
}

export async function callback(req: Request, res: Response): Promise<void> {
  ensureConfigured();
  pruneStates();
  const { code, state, error } = req.query as Record<string, string | undefined>;

  const fail = (msg: string) =>
    res.redirect(
      `${env.WEB_URL}/auth/clickup-callback?error=${encodeURIComponent(msg)}`,
    );

  if (error) return fail(error);
  if (!code || !state || !stateStore.has(state)) return fail('invalid_state');
  stateStore.delete(state);

  try {
    const tokenRes = await exchangeCode(code);
    const cuUser = await fetchAuthorizedUser(tokenRes.access_token);
    if (!cuUser?.email) return fail('clickup_user_email_missing');

    const teams = await fetchTeams(tokenRes.access_token);
    const defaultTeamId = teams[0]?.id;

    const email = cuUser.email.toLowerCase();
    let user = await User.findOne({ email });
    const isFirst = !user && (await User.estimatedDocumentCount()) === 0;

    if (!user) {
      user = await User.create({
        email,
        name: cuUser.username || email,
        role: isFirst ? 'admin' : 'member',
        status: 'active',
      });
    }

    await storeTokenForUser(
      user.id,
      tokenRes.access_token,
      String(cuUser.id),
      defaultTeamId,
    );

    syncUserTasks(user.id, tokenRes.access_token, defaultTeamId).catch((err) => {
      console.error('[clickup] initial sync failed', err);
    });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role });

    const params = new URLSearchParams({
      accessToken,
      refreshToken,
    });
    return res.redirect(`${env.WEB_URL}/auth/clickup-callback?${params.toString()}`);
  } catch (err) {
    console.error('[clickup] callback error', err);
    return fail('exchange_failed');
  }
}

export async function status(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id).select(
    'clickupUserId clickupTeamId clickupConnectedAt',
  );
  const connected = Boolean(user?.clickupUserId);
  let lastSyncedAt: Date | null = null;
  if (connected) {
    const latest = await ClickUpTask.findOne({ userId: req.user!.id })
      .sort({ syncedAt: -1 })
      .select('syncedAt')
      .lean();
    lastSyncedAt = latest?.syncedAt || null;
  }
  res.json({
    status: 'success',
    data: {
      connected,
      clickupUserId: user?.clickupUserId || null,
      clickupTeamId: user?.clickupTeamId || null,
      connectedAt: user?.clickupConnectedAt || null,
      lastSyncedAt,
      configured: clickupConfigured(),
    },
  });
}

export async function teams(req: Request, res: Response): Promise<void> {
  const t = await loadTokenForUser(req.user!.id);
  if (!t) throw new ApiError(409, 'ClickUp not connected');
  const list = await fetchTeams(t.token);
  res.json({ status: 'success', data: list });
}

export async function sync(req: Request, res: Response): Promise<void> {
  const t = await loadTokenForUser(req.user!.id);
  if (!t) throw new ApiError(409, 'ClickUp not connected');
  const { teamId } = req.body as { teamId?: string };
  const summary = await syncUserTasks(req.user!.id, t.token, teamId || t.teamId);
  res.json({ status: 'success', data: summary });
}

export async function listTasks(req: Request, res: Response): Promise<void> {
  const { q, listId, spaceId, assigneeMe, limit } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { userId: req.user!.id, archived: false };
  if (listId) filter.clickupListId = listId;
  if (spaceId) filter.clickupSpaceId = spaceId;
  if (q) filter.name = { $regex: q.trim(), $options: 'i' };
  if (assigneeMe === 'true') {
    const user = await User.findById(req.user!.id).select('clickupUserId email');
    if (user?.clickupUserId) {
      filter.$or = [
        { 'assignees.id': user.clickupUserId },
        { 'assignees.id': Number(user.clickupUserId) },
        { 'assignees.email': user.email },
      ];
    }
  }
  const cap = Math.min(Number(limit) || 50, 200);
  const docs = await ClickUpTask.find(filter)
    .sort({ syncedAt: -1 })
    .limit(cap)
    .lean();
  res.json({ status: 'success', data: docs });
}

export async function connectPersonalToken(
  req: Request,
  res: Response,
): Promise<void> {
  const { token } = req.body as { token?: string };
  if (!token || !token.trim().startsWith('pk_')) {
    throw new ApiError(400, 'Provide a ClickUp personal token starting with "pk_"');
  }
  const t = token.trim();

  let cuUser;
  try {
    cuUser = await fetchAuthorizedUser(t);
  } catch {
    throw new ApiError(401, 'ClickUp rejected this token');
  }
  if (!cuUser?.id) throw new ApiError(401, 'ClickUp returned no user');

  const teams = await fetchTeams(t);
  const defaultTeamId = teams[0]?.id;

  await storeTokenForUser(req.user!.id, t, String(cuUser.id), defaultTeamId);

  syncUserTasks(req.user!.id, t, defaultTeamId).catch((err) => {
    console.error('[clickup] personal-token sync failed', err);
  });

  res.json({
    status: 'success',
    data: {
      connected: true,
      clickupUserId: String(cuUser.id),
      clickupTeamId: defaultTeamId || null,
      teams: teams.length,
    },
  });
}

export async function disconnect(req: Request, res: Response): Promise<void> {
  await User.findByIdAndUpdate(req.user!.id, {
    $unset: {
      clickupAccessToken: '',
      clickupUserId: '',
      clickupTeamId: '',
      clickupConnectedAt: '',
    },
  });
  await ClickUpTask.deleteMany({ userId: req.user!.id });
  res.json({ status: 'success', data: { disconnected: true } });
}
