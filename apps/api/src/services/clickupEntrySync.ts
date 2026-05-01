import { Types } from 'mongoose';
import { TimeEntry } from '../models/TimeEntry';
import { User } from '../models/User';
import { env } from '../config/env';
import {
  loadTokenForUser,
  pullTimeEntries,
  RawTimeEntry,
} from './clickup';

function toMs(v: string | number): number {
  return typeof v === 'number' ? v : Number(v);
}

async function upsertPulledEntry(
  userId: string,
  raw: RawTimeEntry,
  defaultTeamId?: string,
): Promise<{ inserted: boolean; updated: boolean }> {
  const existing = await TimeEntry.findOne({ clickupTimeEntryId: raw.id });
  const startMs = toMs(raw.start);
  const endMs = toMs(raw.end);
  const durSec = Math.max(0, Math.floor(toMs(raw.duration) / 1000));
  const remoteUpdatedAt = raw.date_updated
    ? new Date(toMs(raw.date_updated))
    : null;

  if (!existing) {
    await TimeEntry.create({
      userId: new Types.ObjectId(userId),
      description: raw.description || '',
      startTime: new Date(startMs),
      endTime: new Date(endMs),
      duration: durSec,
      status: 'finished',
      source: 'tracker',
      clickupTaskId: raw.task?.id,
      clickupTaskTitle: raw.task?.name,
      clickupListId: raw.task_location?.list_id
        ? String(raw.task_location.list_id)
        : undefined,
      clickupSpaceId: raw.task_location?.space_id
        ? String(raw.task_location.space_id)
        : undefined,
      clickupTeamId: raw.wid || defaultTeamId,
      clickupTimeEntryId: raw.id,
      pushedToClickup: true,
      pushedToClickupAt: new Date(),
    });
    return { inserted: true, updated: false };
  }

  if (
    remoteUpdatedAt &&
    existing.updatedAt &&
    existing.updatedAt.getTime() >= remoteUpdatedAt.getTime()
  ) {
    return { inserted: false, updated: false };
  }

  existing.startTime = new Date(startMs);
  existing.endTime = new Date(endMs);
  existing.duration = durSec;
  existing.description = raw.description || existing.description;
  if (raw.task?.id) existing.clickupTaskId = raw.task.id;
  if (raw.task?.name) existing.clickupTaskTitle = raw.task.name;
  existing.pushedToClickup = true;
  await existing.save();
  return { inserted: false, updated: true };
}

export async function syncUserEntries(userId: string): Promise<{
  inserted: number;
  updated: number;
  removed: number;
}> {
  const t = await loadTokenForUser(userId);
  if (!t || !t.teamId) return { inserted: 0, updated: 0, removed: 0 };

  const user = await User.findById(userId).select('clickupUserId');
  const assigneeId = user?.clickupUserId;

  const days = env.CLICKUP_ENTRY_PULL_DAYS;
  const endMs = Date.now();
  const startMs = endMs - days * 24 * 60 * 60 * 1000;

  const raws = await pullTimeEntries(t.token, t.teamId, startMs, endMs, assigneeId);

  let inserted = 0;
  let updated = 0;
  const seenIds: string[] = [];
  for (const raw of raws) {
    if (!raw.id) continue;
    seenIds.push(raw.id);
    const r = await upsertPulledEntry(userId, raw, t.teamId);
    if (r.inserted) inserted += 1;
    if (r.updated) updated += 1;
  }

  const local = await TimeEntry.find({
    userId,
    clickupTimeEntryId: { $ne: null },
    startTime: { $gte: new Date(startMs), $lte: new Date(endMs) },
  })
    .select('clickupTimeEntryId')
    .lean();

  const remoteSet = new Set(seenIds);
  const toDelete = local
    .filter((e) => e.clickupTimeEntryId && !remoteSet.has(e.clickupTimeEntryId))
    .map((e) => e._id);

  let removed = 0;
  if (toDelete.length) {
    const r = await TimeEntry.deleteMany({ _id: { $in: toDelete } });
    removed = r.deletedCount || 0;
  }

  await User.findByIdAndUpdate(userId, { lastEntrySyncAt: new Date() });
  return { inserted, updated, removed };
}

export async function syncAllConnectedUsers(): Promise<void> {
  const users = await User.find({
    clickupUserId: { $exists: true, $ne: null },
    clickupTeamId: { $exists: true, $ne: null },
  })
    .select('_id email')
    .lean();

  for (const u of users) {
    try {
      const r = await syncUserEntries(u._id.toString());
      if (r.inserted || r.updated || r.removed) {
        console.log(
          `[clickup-poll] ${u.email}: +${r.inserted} ~${r.updated} -${r.removed}`,
        );
      }
    } catch (err) {
      console.error(`[clickup-poll] ${u.email} failed`, err);
    }
  }
}
