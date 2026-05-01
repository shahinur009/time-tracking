import { Request, Response } from 'express';
import { TimeEntry } from '../models/TimeEntry';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { AuditLog } from '../models/AuditLog';
import { emitToAdmins } from '../socket';
import {
  loadTokenForUser,
  postTimeEntry,
  putTimeEntry,
  deleteTimeEntry as cuDeleteTimeEntry,
} from '../services/clickup';

async function emitTimerStarted(entryId: string): Promise<void> {
  try {
    const entry = await TimeEntry.findById(entryId).lean();
    if (!entry) return;
    const [user, project] = await Promise.all([
      User.findById(entry.userId).select('name email').lean(),
      entry.projectId
        ? Project.findById(entry.projectId).select('name color').lean()
        : null,
    ]);
    emitToAdmins('timer:started', {
      entryId: entry._id.toString(),
      userId: entry.userId.toString(),
      userName: user?.name || '',
      userEmail: user?.email || '',
      projectId: entry.projectId ? entry.projectId.toString() : null,
      projectName: project?.name || null,
      projectColor: project?.color || null,
      description: entry.description || '',
      startTime: entry.startTime,
    });
  } catch (err) {
    console.error('[socket] emitTimerStarted failed', err);
  }
}

function emitTimerStopped(entryId: string, userId: string, duration: number): void {
  try {
    emitToAdmins('timer:stopped', {
      entryId,
      userId,
      duration,
      stoppedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[socket] emitTimerStopped failed', err);
  }
}

function durationSeconds(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}

async function stopRunningEntriesFor(userId: string, now: Date): Promise<void> {
  const running = await TimeEntry.find({ userId, status: 'running' });
  for (const entry of running) {
    entry.endTime = now;
    entry.duration = durationSeconds(entry.startTime, now);
    entry.status = 'finished';
    await entry.save();
    emitTimerStopped(entry.id, userId, entry.duration);
  }
}

export async function listEntries(req: Request, res: Response): Promise<void> {
  const { from, to, userId, projectId } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = {};

  if (req.user!.role === 'member') {
    filter.userId = req.user!.id;
  } else if (userId) {
    filter.userId = userId;
  }

  if (projectId) filter.projectId = projectId;

  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    filter.startTime = range;
  }

  const entries = await TimeEntry.find(filter)
    .populate('projectId', 'name color')
    .populate('tags', 'name color')
    .populate('userId', 'name email')
    .sort({ startTime: -1 })
    .limit(500);

  res.json({ status: 'success', data: entries });
}

export async function startEntry(req: Request, res: Response): Promise<void> {
  const now = new Date();
  await stopRunningEntriesFor(req.user!.id, now);

  const entry = await TimeEntry.create({
    userId: req.user!.id,
    projectId: req.body.projectId || null,
    description: req.body.description || '',
    billable: Boolean(req.body.billable),
    tags: req.body.tags || [],
    taggedUsers: req.body.taggedUsers || [],
    clickupTaskId: req.body.clickupTaskId,
    clickupTaskTitle: req.body.clickupTaskTitle,
    clickupListId: req.body.clickupListId,
    clickupSpaceId: req.body.clickupSpaceId,
    clickupTeamId: req.body.clickupTeamId,
    startTime: now,
    status: 'running',
  });

  emitTimerStarted(entry.id);

  res.status(201).json({ status: 'success', data: entry });
}

export async function stopEntry(req: Request, res: Response): Promise<void> {
  const { done, skipPush } = req.body as { done?: boolean; skipPush?: boolean };
  if (done !== true) {
    throw new ApiError(400, 'Stop requires { done: true } to finalize entry');
  }

  const running = await TimeEntry.findOne({
    userId: req.user!.id,
    status: 'running',
  });
  if (!running) throw new ApiError(404, 'No running entry');

  const now = new Date();
  running.endTime = now;
  running.duration = durationSeconds(running.startTime, now);
  running.status = 'finished';
  await running.save();

  emitTimerStopped(running.id, req.user!.id, running.duration);

  if (running.clickupTaskId && skipPush !== true) {
    autoPushIfEnabled(running.id, req.user!.id).catch((err) =>
      console.error('[entry] auto-push failed', err),
    );
  }

  res.json({ status: 'success', data: running });
}

async function autoPushIfEnabled(entryId: string, userId: string): Promise<void> {
  const user = await User.findById(userId).select('autoPushToClickup');
  if (!user?.autoPushToClickup) return;

  const entry = await TimeEntry.findById(entryId);
  if (!entry || !entry.clickupTaskId || entry.pushedToClickup) return;

  const t = await loadTokenForUser(userId);
  if (!t) return;
  const teamId = entry.clickupTeamId || t.teamId;
  if (!teamId) return;

  try {
    const result = await postTimeEntry(t.token, teamId, {
      start: entry.startTime.getTime(),
      duration: entry.duration * 1000,
      tid: entry.clickupTaskId,
      description: entry.description || '',
    });
    entry.pushedToClickup = true;
    entry.pushedToClickupAt = new Date();
    entry.clickupTimeEntryId = result.id;
    await entry.save();
  } catch (err) {
    console.error('[entry] autoPush postTimeEntry failed', err);
  }
}

export async function currentRunning(req: Request, res: Response): Promise<void> {
  const entry = await TimeEntry.findOne({
    userId: req.user!.id,
    status: 'running',
  }).populate('projectId', 'name color');
  res.json({ status: 'success', data: entry });
}

export async function getEntry(req: Request, res: Response): Promise<void> {
  const entry = await TimeEntry.findById(req.params.id)
    .populate('projectId', 'name color')
    .populate('tags', 'name color')
    .populate('userId', 'name email');
  if (!entry) throw new ApiError(404, 'Entry not found');

  if (req.user!.role === 'member' && entry.userId.toString() !== req.user!.id) {
    throw new ApiError(403, 'Cannot view another user\'s entry');
  }

  res.json({ status: 'success', data: entry });
}

export async function createEntry(req: Request, res: Response): Promise<void> {
  const start = new Date(req.body.startTime);
  const end = new Date(req.body.endTime);
  if (start >= end) throw new ApiError(400, 'startTime must be before endTime');

  const entry = await TimeEntry.create({
    ...req.body,
    startTime: start,
    endTime: end,
    duration: durationSeconds(start, end),
    status: 'finished',
  });

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'entry.create',
    targetType: 'TimeEntry',
    targetId: entry.id,
    changes: req.body,
  });

  res.status(201).json({ status: 'success', data: entry });
}

export async function updateEntry(req: Request, res: Response): Promise<void> {
  if (req.user!.role !== 'admin') {
    throw new ApiError(403, 'Only admins can edit time entries');
  }

  const entry = await TimeEntry.findById(req.params.id);
  if (!entry) throw new ApiError(404, 'Entry not found');

  const patch = req.body as Record<string, unknown>;
  if (patch.startTime) entry.startTime = new Date(String(patch.startTime));
  if (patch.endTime) entry.endTime = new Date(String(patch.endTime));
  if (patch.projectId !== undefined) entry.projectId = patch.projectId as never;
  if (patch.description !== undefined) entry.description = String(patch.description);
  if (patch.billable !== undefined) entry.billable = Boolean(patch.billable);
  if (patch.tags !== undefined) entry.tags = patch.tags as never;
  if (patch.taggedUsers !== undefined) entry.taggedUsers = patch.taggedUsers as never;
  if (patch.userId !== undefined) entry.userId = patch.userId as never;
  if (patch.source !== undefined) entry.source = patch.source as never;
  if (patch.status !== undefined) entry.status = patch.status as never;

  if (patch.duration !== undefined && patch.endTime === undefined) {
    const dur = Math.max(0, Math.floor(Number(patch.duration)));
    entry.endTime = new Date(entry.startTime.getTime() + dur * 1000);
    entry.duration = dur;
  } else if (entry.endTime) {
    if (entry.startTime >= entry.endTime) {
      throw new ApiError(400, 'startTime must be before endTime');
    }
    entry.duration = durationSeconds(entry.startTime, entry.endTime);
  }

  await entry.save();

  if (entry.clickupTimeEntryId && entry.clickupTeamId) {
    propagateEntryUpdate(entry.id).catch((err) =>
      console.error('[entry] update propagation failed', err),
    );
  }

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'entry.update',
    targetType: 'TimeEntry',
    targetId: entry.id,
    changes: req.body,
  });

  res.json({ status: 'success', data: entry });
}

async function propagateEntryUpdate(entryId: string): Promise<void> {
  const entry = await TimeEntry.findById(entryId);
  if (!entry || !entry.clickupTimeEntryId || !entry.clickupTeamId) return;
  const t = await loadTokenForUser(entry.userId.toString());
  if (!t) return;
  await putTimeEntry(t.token, entry.clickupTeamId, entry.clickupTimeEntryId, {
    start: entry.startTime.getTime(),
    end: entry.endTime ? entry.endTime.getTime() : undefined,
    duration: entry.duration * 1000,
    description: entry.description || '',
    tid: entry.clickupTaskId,
  });
}

export async function deleteEntry(req: Request, res: Response): Promise<void> {
  const entry = await TimeEntry.findById(req.params.id);
  if (!entry) throw new ApiError(404, 'Entry not found');

  if (entry.clickupTimeEntryId && entry.clickupTeamId) {
    const t = await loadTokenForUser(entry.userId.toString());
    if (t) {
      try {
        await cuDeleteTimeEntry(
          t.token,
          entry.clickupTeamId,
          entry.clickupTimeEntryId,
        );
      } catch (err) {
        console.error('[entry] delete propagation failed', err);
      }
    }
  }

  await TimeEntry.findByIdAndDelete(req.params.id);

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'entry.delete',
    targetType: 'TimeEntry',
    targetId: req.params.id,
  });

  res.json({ status: 'success', message: 'Entry deleted' });
}

export async function pushToClickup(req: Request, res: Response): Promise<void> {
  const entry = await TimeEntry.findById(req.params.id);
  if (!entry) throw new ApiError(404, 'Entry not found');

  if (entry.userId.toString() !== req.user!.id && req.user!.role !== 'admin') {
    throw new ApiError(403, 'Cannot push another user\'s entry');
  }
  if (entry.status !== 'finished' || !entry.endTime) {
    throw new ApiError(400, 'Only finished entries can be pushed');
  }
  if (!entry.clickupTaskId) {
    throw new ApiError(400, 'Entry has no clickupTaskId');
  }

  const ownerId = entry.userId.toString();
  const t = await loadTokenForUser(ownerId);
  if (!t) throw new ApiError(409, 'Owner has no ClickUp connection');

  const teamId = entry.clickupTeamId || t.teamId;
  if (!teamId) throw new ApiError(400, 'No clickupTeamId on entry or user');

  const result = await postTimeEntry(t.token, teamId, {
    start: entry.startTime.getTime(),
    duration: entry.duration * 1000,
    tid: entry.clickupTaskId,
    description: entry.description || '',
  });

  entry.pushedToClickup = true;
  entry.pushedToClickupAt = new Date();
  entry.clickupTimeEntryId = result.id;
  await entry.save();

  res.json({ status: 'success', data: entry });
}
