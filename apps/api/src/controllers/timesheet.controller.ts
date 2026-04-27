import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { TimeEntry } from '../models/TimeEntry';
import { Project } from '../models/Project';
import { AuditLog } from '../models/AuditLog';
import { TimesheetTemplate } from '../models/TimesheetTemplate';
import { ApiError } from '../utils/ApiError';
import { emitToTimesheet } from '../socket';

function isoMondayOf(day: string): string {
  const [y, m, d] = day.split('-').map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) return day;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function broadcastCell(
  targetUserId: string,
  day: string,
  payload: Record<string, unknown>,
): void {
  try {
    const weekStart = isoMondayOf(day);
    emitToTimesheet(targetUserId, weekStart, 'cell:updated', {
      ...payload,
      day,
      weekStart,
      userId: targetUserId,
    });
  } catch (err) {
    console.error('[socket] broadcastCell failed', err);
  }
}

function formatSec(total: number): string {
  const s = Math.max(0, Math.floor(total || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function dayStartInTz(dayStr: string, tz: string): Date {
  const [y, m, d] = dayStr.split('-').map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) throw new ApiError(400, 'Invalid day');
  const probe = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  if (!tz || tz === 'UTC') return probe;
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(probe);
    const obj: Record<string, string> = {};
    for (const p of parts) obj[p.type] = p.value;
    const asTzMs = Date.UTC(
      Number(obj.year),
      Number(obj.month) - 1,
      Number(obj.day),
      Number(obj.hour) === 24 ? 0 : Number(obj.hour),
      Number(obj.minute),
      Number(obj.second),
    );
    const offsetMs = asTzMs - probe.getTime();
    return new Date(probe.getTime() - offsetMs);
  } catch {
    return probe;
  }
}

function dayBoundsInTz(day: string, tz: string): { start: Date; end: Date } {
  const start = dayStartInTz(day, tz);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start, end };
}

function parseRangeInput(
  from: string,
  to: string,
  tz: string,
): { start: Date; end: Date } {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnly.test(from) && dateOnly.test(to)) {
    const start = dayStartInTz(from, tz);
    const endStart = dayStartInTz(to, tz);
    const end = new Date(endStart.getTime() + 24 * 3600 * 1000);
    return { start, end };
  }
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(400, 'Invalid range');
  }
  return { start, end };
}

function scopeUserId(req: Request): string {
  if (req.user!.role === 'member') return req.user!.id;
  const queryUserId = (req.query.userId as string | undefined) || undefined;
  return queryUserId || req.user!.id;
}

function bodyUserId(req: Request): string {
  if (req.user!.role === 'member') return req.user!.id;
  return (req.body.userId as string | undefined) || req.user!.id;
}

export async function getMatrix(req: Request, res: Response): Promise<void> {
  const from = req.query.from as string;
  const to = req.query.to as string;
  const tz = (req.query.tz as string) || 'UTC';
  if (!from || !to) throw new ApiError(400, 'from and to are required');

  const userId = scopeUserId(req);
  const { start, end } = parseRangeInput(from, to, tz);

  const match: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    startTime: { $gte: start, $lt: end },
    status: 'finished',
  };

  const cells = await TimeEntry.aggregate([
    { $match: match },
    {
      $addFields: {
        normalizedSource: { $ifNull: ['$source', 'tracker'] },
      },
    },
    {
      $group: {
        _id: {
          projectId: '$projectId',
          day: { $dateToString: { format: '%Y-%m-%d', date: '$startTime', timezone: tz } },
          source: '$normalizedSource',
        },
        total: { $sum: '$duration' },
        entryIds: { $push: '$_id' },
      },
    },
    {
      $group: {
        _id: { projectId: '$_id.projectId', day: '$_id.day' },
        bySource: {
          $push: {
            source: '$_id.source',
            total: '$total',
            entryIds: '$entryIds',
          },
        },
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: '_id.projectId',
        foreignField: '_id',
        as: 'project',
      },
    },
    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        projectId: '$_id.projectId',
        day: '$_id.day',
        projectName: '$project.name',
        projectColor: '$project.color',
        bySource: 1,
      },
    },
  ]);

  const projectIds = Array.from(
    new Set(cells.map((c) => (c.projectId ? c.projectId.toString() : 'null'))),
  );

  res.json({
    status: 'success',
    data: {
      cells: cells.map((c) => {
        const tracker = c.bySource.find((s: { source: string }) => s.source === 'tracker');
        const timesheet = c.bySource.find((s: { source: string }) => s.source === 'timesheet');
        return {
          projectId: c.projectId ? c.projectId.toString() : null,
          day: c.day,
          projectName: c.projectName || null,
          projectColor: c.projectColor || null,
          trackerSec: tracker?.total || 0,
          timesheetSec: timesheet?.total || 0,
          totalSec: (tracker?.total || 0) + (timesheet?.total || 0),
          timesheetEntryIds:
            timesheet?.entryIds?.map((id: Types.ObjectId) => id.toString()) || [],
          trackerEntryIds:
            tracker?.entryIds?.map((id: Types.ObjectId) => id.toString()) || [],
        };
      }),
      projectIds,
      range: { from, to },
      userId,
    },
  });
}

export async function upsertCell(req: Request, res: Response): Promise<void> {
  const userId = bodyUserId(req);
  const { projectId, day, durationSec, description, billable, tz } = req.body as {
    projectId: string | null;
    day: string;
    durationSec: number;
    description?: string;
    billable?: boolean;
    tz?: string;
  };

  const { start, end } = dayBoundsInTz(day, tz || 'UTC');

  const projectFilter: Record<string, unknown> = projectId
    ? { projectId: new Types.ObjectId(projectId) }
    : { projectId: null };

  const baseFilter = {
    userId: new Types.ObjectId(userId),
    startTime: { $gte: start, $lt: end },
    status: 'finished',
    ...projectFilter,
  };

  const trackerAgg = await TimeEntry.aggregate([
    {
      $match: {
        ...baseFilter,
        $or: [{ source: 'tracker' }, { source: { $exists: false } }, { source: null }],
      },
    },
    { $group: { _id: null, total: { $sum: '$duration' } } },
  ]);
  let trackerSum = trackerAgg[0]?.total || 0;

  const isPrivileged = req.user!.role === 'admin';

  if (durationSec < trackerSum) {
    if (!isPrivileged) {
      throw new ApiError(
        422,
        `Cell already has ${formatSec(trackerSum)} of tracked time. Delete tracker entries before lowering total below that.`,
      );
    }
    const removed = await TimeEntry.deleteMany({
      ...baseFilter,
      $or: [{ source: 'tracker' }, { source: { $exists: false } }, { source: null }],
    });
    await AuditLog.create({
      actorId: req.user!.id,
      action: 'timesheet.cell.tracker-overwrite',
      targetType: 'TimeEntry',
      targetId: projectId || 'no-project',
      changes: { day, projectId, durationSec, removedTrackerEntries: removed.deletedCount },
    });
    trackerSum = 0;
  }

  const timesheetSec = durationSec - trackerSum;

  const existing = await TimeEntry.findOne({ ...baseFilter, source: 'timesheet' });

  if (timesheetSec === 0) {
    if (existing) {
      await TimeEntry.deleteOne({ _id: existing._id });
      await AuditLog.create({
        actorId: req.user!.id,
        action: 'timesheet.cell.clear',
        targetType: 'TimeEntry',
        targetId: existing.id,
        changes: { day, projectId, durationSec },
      });
    }
    broadcastCell(userId, day, {
      projectId: projectId || null,
      totalSec: trackerSum,
      timesheetSec: 0,
      editorId: req.user!.id,
      action: 'clear',
    });
    res.json({ status: 'success', data: null });
    return;
  }

  if (existing) {
    existing.duration = timesheetSec;
    existing.endTime = new Date(start.getTime() + timesheetSec * 1000);
    if (description !== undefined) existing.description = description;
    if (billable !== undefined) existing.billable = billable;
    existing.version = (existing.version || 0) + 1;
    await existing.save();

    await AuditLog.create({
      actorId: req.user!.id,
      action: 'timesheet.cell.update',
      targetType: 'TimeEntry',
      targetId: existing.id,
      changes: { day, projectId, durationSec },
    });

    broadcastCell(userId, day, {
      projectId: projectId || null,
      totalSec: trackerSum + timesheetSec,
      timesheetSec,
      version: existing.version,
      editorId: req.user!.id,
      action: 'update',
    });

    res.json({ status: 'success', data: existing });
    return;
  }

  const created = await TimeEntry.create({
    userId,
    projectId: projectId || null,
    description: description || '',
    billable: Boolean(billable),
    startTime: start,
    endTime: new Date(start.getTime() + timesheetSec * 1000),
    duration: timesheetSec,
    status: 'finished',
    source: 'timesheet',
    version: 1,
  });

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'timesheet.cell.create',
    targetType: 'TimeEntry',
    targetId: created.id,
    changes: { day, projectId, durationSec },
  });

  broadcastCell(userId, day, {
    projectId: projectId || null,
    totalSec: trackerSum + timesheetSec,
    timesheetSec,
    version: 1,
    editorId: req.user!.id,
    action: 'create',
  });

  res.status(201).json({ status: 'success', data: created });
}

export async function deleteRow(req: Request, res: Response): Promise<void> {
  const userId = bodyUserId(req);
  const { projectId, weekStart, weekEnd, tz } = req.body as {
    projectId: string | null;
    weekStart: string;
    weekEnd: string;
    tz?: string;
  };

  const { start, end } = parseRangeInput(weekStart, weekEnd, tz || 'UTC');

  const filter: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    startTime: { $gte: start, $lt: end },
    source: 'timesheet',
  };
  filter.projectId = projectId ? new Types.ObjectId(projectId) : null;

  const trackerExists = await TimeEntry.exists({
    userId: new Types.ObjectId(userId),
    startTime: { $gte: start, $lt: end },
    source: 'tracker',
    projectId: projectId ? new Types.ObjectId(projectId) : null,
  });

  const result = await TimeEntry.deleteMany(filter);

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'timesheet.row.delete',
    targetType: 'TimeEntry',
    targetId: projectId || 'no-project',
    changes: { projectId, weekStart, weekEnd, removed: result.deletedCount },
  });

  emitToTimesheet(userId, isoMondayOf(weekStart), 'row:deleted', {
    userId,
    weekStart: isoMondayOf(weekStart),
    projectId: projectId || null,
    editorId: req.user!.id,
  });

  res.json({
    status: 'success',
    data: {
      removed: result.deletedCount,
      trackerEntriesPreserved: Boolean(trackerExists),
    },
  });
}

export async function copyWeek(req: Request, res: Response): Promise<void> {
  const userId = bodyUserId(req);
  const { fromWeekStart, toWeekStart, tz } = req.body as {
    fromWeekStart: string;
    toWeekStart: string;
    tz?: string;
  };

  const fromStart = dayStartInTz(fromWeekStart, tz || 'UTC');
  const toStart = dayStartInTz(toWeekStart, tz || 'UTC');
  const offsetMs = toStart.getTime() - fromStart.getTime();

  const fromEnd = new Date(fromStart.getTime() + 7 * 24 * 3600 * 1000);

  const sources = await TimeEntry.find({
    userId: new Types.ObjectId(userId),
    startTime: { $gte: fromStart, $lt: fromEnd },
    source: 'timesheet',
    status: 'finished',
  });

  if (sources.length === 0) {
    res.json({ status: 'success', data: { copied: 0 } });
    return;
  }

  const cloned = sources.map((s) => ({
    userId: s.userId,
    projectId: s.projectId,
    description: s.description,
    billable: s.billable,
    tags: s.tags,
    taggedUsers: s.taggedUsers,
    duration: s.duration,
    startTime: new Date(s.startTime.getTime() + offsetMs),
    endTime: s.endTime ? new Date(s.endTime.getTime() + offsetMs) : null,
    status: 'finished' as const,
    source: 'timesheet' as const,
  }));

  let inserted = 0;
  for (const doc of cloned) {
    try {
      await TimeEntry.create(doc);
      inserted += 1;
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e.code !== 11000) throw err;
    }
  }

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'timesheet.week.copy',
    targetType: 'TimeEntry',
    targetId: userId,
    changes: { fromWeekStart, toWeekStart, copied: inserted, attempted: sources.length },
  });

  emitToTimesheet(userId, toWeekStart, 'week:copied', {
    userId,
    weekStart: toWeekStart,
    inserted,
    editorId: req.user!.id,
  });

  res.json({
    status: 'success',
    data: { copied: inserted, skippedDuplicates: sources.length - inserted },
  });
}

export async function listProjectsForRow(req: Request, res: Response): Promise<void> {
  const projects = await Project.find({ archived: { $ne: true } })
    .select('name color')
    .sort({ name: 1 });
  res.json({ status: 'success', data: projects });
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
  const userId = bodyUserId(req);
  const { name, weekStart, includeTime, tz } = req.body as {
    name: string;
    weekStart: string;
    includeTime?: boolean;
    tz?: string;
  };

  const start = dayStartInTz(weekStart, tz || 'UTC');
  const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);

  const entries = await TimeEntry.find({
    userId: new Types.ObjectId(userId),
    startTime: { $gte: start, $lt: end },
    status: 'finished',
    $or: [
      { source: 'timesheet' },
      { source: 'tracker' },
      { source: { $exists: false } },
      { source: null },
    ],
  });

  const projectIds = Array.from(
    new Set(
      entries
        .map((e) => (e.projectId ? e.projectId.toString() : null))
        .filter(Boolean),
    ),
  ) as string[];

  const cells: { projectId: Types.ObjectId | null; dayOffset: number; durationSec: number }[] = [];
  if (includeTime) {
    const bucket = new Map<string, number>();
    entries.forEach((e) => {
      const dayOffset = Math.floor(
        (e.startTime.getTime() - start.getTime()) / (24 * 3600 * 1000),
      );
      if (dayOffset < 0 || dayOffset > 6) return;
      const pid = e.projectId ? e.projectId.toString() : 'null';
      const key = `${pid}|${dayOffset}`;
      bucket.set(key, (bucket.get(key) || 0) + (e.duration || 0));
    });
    for (const [key, durationSec] of bucket) {
      const [pid, off] = key.split('|');
      cells.push({
        projectId: pid === 'null' ? null : new Types.ObjectId(pid),
        dayOffset: Number(off),
        durationSec,
      });
    }
  }

  try {
    const tpl = await TimesheetTemplate.create({
      userId,
      name: name.trim(),
      includeTime: Boolean(includeTime),
      rows: projectIds.map((id) => new Types.ObjectId(id)),
      cells,
    });

    await AuditLog.create({
      actorId: req.user!.id,
      action: 'timesheet.template.create',
      targetType: 'TimesheetTemplate',
      targetId: tpl.id,
      changes: { name: tpl.name, includeTime: tpl.includeTime, rows: projectIds.length },
    });

    res.status(201).json({ status: 'success', data: tpl });
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) {
      throw new ApiError(409, 'A template with this name already exists');
    }
    throw err;
  }
}

export async function listTemplates(req: Request, res: Response): Promise<void> {
  const userId = scopeUserId(req);
  const templates = await TimesheetTemplate.find({
    userId: new Types.ObjectId(userId),
  })
    .populate('rows', 'name color')
    .sort({ updatedAt: -1 });

  res.json({ status: 'success', data: templates });
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  const userId = scopeUserId(req);
  const tpl = await TimesheetTemplate.findOneAndDelete({
    _id: req.params.id,
    userId: new Types.ObjectId(userId),
  });
  if (!tpl) throw new ApiError(404, 'Template not found');

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'timesheet.template.delete',
    targetType: 'TimesheetTemplate',
    targetId: req.params.id,
  });

  res.json({ status: 'success', message: 'Template deleted' });
}

export async function applyTemplate(req: Request, res: Response): Promise<void> {
  const userId = bodyUserId(req);
  const { weekStart, tz } = req.body as { weekStart: string; tz?: string };

  const tpl = await TimesheetTemplate.findOne({
    _id: req.params.id,
    userId: new Types.ObjectId(userId),
  });
  if (!tpl) throw new ApiError(404, 'Template not found');

  const start = dayStartInTz(weekStart, tz || 'UTC');

  let inserted = 0;
  if (tpl.includeTime) {
    for (const cell of tpl.cells) {
      const dayStart = new Date(start.getTime() + cell.dayOffset * 24 * 3600 * 1000);
      try {
        await TimeEntry.create({
          userId,
          projectId: cell.projectId,
          description: '',
          billable: false,
          startTime: dayStart,
          endTime: new Date(dayStart.getTime() + cell.durationSec * 1000),
          duration: cell.durationSec,
          status: 'finished',
          source: 'timesheet',
        });
        inserted += 1;
      } catch (err: unknown) {
        const e = err as { code?: number };
        if (e.code !== 11000) throw err;
      }
    }
  }

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'timesheet.template.apply',
    targetType: 'TimesheetTemplate',
    targetId: tpl.id,
    changes: { weekStart, includeTime: tpl.includeTime, inserted },
  });

  emitToTimesheet(userId, weekStart, 'template:applied', {
    userId,
    weekStart,
    inserted,
    editorId: req.user!.id,
  });

  res.json({
    status: 'success',
    data: {
      rows: tpl.rows.map((r) => r.toString()),
      includeTime: tpl.includeTime,
      inserted,
    },
  });
}
