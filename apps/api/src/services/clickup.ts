import { Types } from 'mongoose';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { ClickUpTask } from '../models/ClickUpTask';
import { User } from '../models/User';
import { decryptSecret, encryptSecret } from '../utils/crypto';

export interface ClickUpTokenResponse {
  access_token: string;
  token_type?: string;
}

export interface ClickUpUser {
  id: number | string;
  username?: string;
  email?: string;
  color?: string;
  profilePicture?: string;
}

export interface ClickUpTeam {
  id: string;
  name: string;
  color?: string;
}

interface RawTask {
  id: string;
  name: string;
  status?: { status?: string };
  priority?: { priority?: string } | null;
  due_date?: string | null;
  url?: string;
  archived?: boolean;
  assignees?: Array<{
    id: number | string;
    username?: string;
    email?: string;
    color?: string;
  }>;
  tags?: Array<{ name: string }>;
  list?: { id: string };
  folder?: { id: string; hidden?: boolean };
  space?: { id: string };
  team_id?: string;
}

function isPersonalToken(token: string): boolean {
  return token.startsWith('pk_');
}

async function clickupFetch<T>(
  path: string,
  init: RequestInit & { token: string; useBearer?: boolean },
): Promise<T> {
  const url = path.startsWith('http') ? path : `${env.CLICKUP_API_BASE}${path}`;
  const headers = new Headers(init.headers);
  const useBearer =
    init.useBearer !== undefined ? init.useBearer : !isPersonalToken(init.token);
  const authValue = useBearer ? `Bearer ${init.token}` : init.token;
  headers.set('Authorization', authValue);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      `ClickUp API ${res.status}: ${typeof body === 'object' && body && 'err' in (body as Record<string, unknown>) ? (body as { err: string }).err : text || res.statusText}`,
      body,
    );
  }
  return body as T;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.CLICKUP_CLIENT_ID,
    redirect_uri: env.CLICKUP_REDIRECT_URI,
    state,
  });
  return `${env.CLICKUP_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<ClickUpTokenResponse> {
  const params = new URLSearchParams({
    client_id: env.CLICKUP_CLIENT_ID,
    client_secret: env.CLICKUP_CLIENT_SECRET,
    code,
  });
  const res = await fetch(
    `${env.CLICKUP_API_BASE}/oauth/token?${params.toString()}`,
    { method: 'POST' },
  );
  const body = (await res.json().catch(() => null)) as ClickUpTokenResponse | null;
  if (!res.ok || !body?.access_token) {
    throw new ApiError(
      res.status || 502,
      `ClickUp token exchange failed: ${res.status}`,
      body,
    );
  }
  return body;
}

export async function fetchAuthorizedUser(token: string): Promise<ClickUpUser> {
  const data = await clickupFetch<{ user: ClickUpUser }>('/user', { token });
  return data.user;
}

export async function fetchTeams(token: string): Promise<ClickUpTeam[]> {
  const data = await clickupFetch<{ teams: ClickUpTeam[] }>('/team', { token });
  return data.teams || [];
}

async function fetchSpaces(token: string, teamId: string) {
  const data = await clickupFetch<{ spaces: Array<{ id: string; name: string }> }>(
    `/team/${teamId}/space?archived=false`,
    { token },
  );
  return data.spaces || [];
}

async function fetchFolders(token: string, spaceId: string) {
  const data = await clickupFetch<{ folders: Array<{ id: string; name: string }> }>(
    `/space/${spaceId}/folder?archived=false`,
    { token },
  );
  return data.folders || [];
}

async function fetchFolderlessLists(token: string, spaceId: string) {
  const data = await clickupFetch<{ lists: Array<{ id: string; name: string }> }>(
    `/space/${spaceId}/list?archived=false`,
    { token },
  );
  return data.lists || [];
}

async function fetchLists(token: string, folderId: string) {
  const data = await clickupFetch<{ lists: Array<{ id: string; name: string }> }>(
    `/folder/${folderId}/list?archived=false`,
    { token },
  );
  return data.lists || [];
}

async function fetchListTasks(
  token: string,
  listId: string,
  page: number,
): Promise<{ tasks: RawTask[]; last_page?: boolean }> {
  return clickupFetch(
    `/list/${listId}/task?archived=false&subtasks=true&include_closed=false&page=${page}`,
    { token },
  );
}

function rawToDoc(
  userId: string,
  teamId: string,
  spaceId: string | undefined,
  folderId: string | undefined,
  listId: string,
  raw: RawTask,
) {
  return {
    userId: new Types.ObjectId(userId),
    clickupTaskId: raw.id,
    clickupTeamId: raw.team_id || teamId,
    clickupSpaceId: raw.space?.id || spaceId,
    clickupFolderId: raw.folder?.id || folderId,
    clickupListId: raw.list?.id || listId,
    name: raw.name,
    status: raw.status?.status,
    priority: raw.priority?.priority || null,
    dueDate: raw.due_date ? new Date(Number(raw.due_date)) : null,
    url: raw.url,
    archived: Boolean(raw.archived),
    assignees: (raw.assignees || []).map((a) => ({
      id: a.id,
      username: a.username,
      email: a.email,
      color: a.color,
    })),
    tags: (raw.tags || []).map((t) => t.name),
    syncedAt: new Date(),
  };
}

export interface SyncSummary {
  teams: number;
  tasks: number;
}

export async function syncUserTasks(
  userId: string,
  token: string,
  scopeTeamId?: string,
): Promise<SyncSummary> {
  const teams = await fetchTeams(token);
  const targetTeams = scopeTeamId ? teams.filter((t) => t.id === scopeTeamId) : teams;

  const seenTaskIds: string[] = [];
  let taskCount = 0;

  for (const team of targetTeams) {
    const spaces = await fetchSpaces(token, team.id);
    for (const space of spaces) {
      const folders = await fetchFolders(token, space.id);
      const folderlessLists = await fetchFolderlessLists(token, space.id);

      const allLists: Array<{ id: string; folderId?: string }> = [
        ...folderlessLists.map((l) => ({ id: l.id })),
      ];
      for (const folder of folders) {
        const lists = await fetchLists(token, folder.id);
        for (const list of lists) allLists.push({ id: list.id, folderId: folder.id });
      }

      for (const list of allLists) {
        let page = 0;
        while (true) {
          const { tasks, last_page } = await fetchListTasks(token, list.id, page);
          if (!tasks || tasks.length === 0) break;
          const ops = tasks.map((raw) => {
            const doc = rawToDoc(userId, team.id, space.id, list.folderId, list.id, raw);
            seenTaskIds.push(raw.id);
            taskCount += 1;
            return {
              updateOne: {
                filter: { userId: new Types.ObjectId(userId), clickupTaskId: raw.id },
                update: { $set: doc },
                upsert: true,
              },
            };
          });
          if (ops.length) {
            await ClickUpTask.bulkWrite(
              ops as Parameters<typeof ClickUpTask.bulkWrite>[0],
              { ordered: false },
            );
          }
          if (last_page || tasks.length < 100) break;
          page += 1;
          if (page > 50) break;
        }
      }
    }
  }

  return { teams: targetTeams.length, tasks: taskCount };
}

export async function postTimeEntry(
  token: string,
  teamId: string,
  payload: { start: number; duration: number; tid: string; description?: string },
): Promise<{ id: string }> {
  const data = await clickupFetch<{ data?: { id: string }; id?: string }>(
    `/team/${teamId}/time_entries`,
    {
      token,
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  const id = data?.data?.id || data?.id;
  if (!id) throw new ApiError(502, 'ClickUp did not return a time entry id', data);
  return { id };
}

export async function loadTokenForUser(userId: string): Promise<{
  token: string;
  teamId?: string;
} | null> {
  const user = await User.findById(userId).select('+clickupAccessToken clickupTeamId');
  if (!user || !user.clickupAccessToken) return null;
  try {
    const token = decryptSecret(user.clickupAccessToken);
    return { token, teamId: user.clickupTeamId };
  } catch {
    return null;
  }
}

export async function storeTokenForUser(
  userId: string,
  token: string,
  clickupUserId: string,
  defaultTeamId?: string,
): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    clickupAccessToken: encryptSecret(token),
    clickupUserId,
    clickupTeamId: defaultTeamId,
    clickupConnectedAt: new Date(),
  });
}
