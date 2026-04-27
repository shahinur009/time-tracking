import { Request, Response } from 'express';
import { TimeEntry } from '../models/TimeEntry';
import { Types } from 'mongoose';

function parseRange(req: Request) {
  const q = req.query as Record<string, string | undefined>;
  const from = q.from ? new Date(q.from) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const to = q.to ? new Date(q.to) : new Date();
  return { from, to };
}

function scopeUser(req: Request): Types.ObjectId | null {
  if (req.user!.role === 'member') return new Types.ObjectId(req.user!.id);
  const q = req.query as Record<string, string | undefined>;
  return q.userId ? new Types.ObjectId(q.userId) : null;
}

function buildMatch(req: Request): Record<string, unknown> {
  const { from, to } = parseRange(req);
  const uid = scopeUser(req);
  const q = req.query as Record<string, string | undefined>;

  const match: Record<string, unknown> = {
    status: 'finished',
    startTime: { $gte: from, $lte: to },
  };
  if (uid) match.userId = uid;
  if (q.projectId) match.projectId = new Types.ObjectId(q.projectId);
  if (q.tagId) match.tags = new Types.ObjectId(q.tagId);
  if (q.billable === 'true') match.billable = true;
  if (q.billable === 'false') match.billable = false;
  if (q.description) {
    match.description = { $regex: q.description, $options: 'i' };
  }
  return match;
}

export async function summary(req: Request, res: Response): Promise<void> {
  const { from, to } = parseRange(req);
  const match = buildMatch(req);
  const q = req.query as Record<string, string | undefined>;

  const rawLimit = q.topActivitiesLimit;
  const unlimited = rawLimit === 'all' || rawLimit === '0';
  const parsedLimit = Number.parseInt(rawLimit || '', 10);
  const topLimit = unlimited
    ? null
    : Number.isFinite(parsedLimit) && parsedLimit > 0
    ? parsedLimit
    : 10;

  const topActivitiesPipeline: Record<string, unknown>[] = [
    { $match: match },
    {
      $group: {
        _id: { $ifNull: ['$description', ''] },
        total: { $sum: '$duration' },
      },
    },
    { $sort: { total: -1 } },
  ];
  if (topLimit !== null) topActivitiesPipeline.push({ $limit: topLimit });
  topActivitiesPipeline.push({ $project: { _id: 0, description: '$_id', total: 1 } });

  const [totalAgg, byProject, byDay, topActivities, byProjectDescription] =
    await Promise.all([
      TimeEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: '$duration' },
            count: { $sum: 1 },
            billable: {
              $sum: { $cond: [{ $eq: ['$billable', true] }, '$duration', 0] },
            },
            nonBillable: {
              $sum: { $cond: [{ $eq: ['$billable', true] }, 0, '$duration'] },
            },
          },
        },
      ]),
      TimeEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$projectId',
            total: { $sum: '$duration' },
            billable: {
              $sum: { $cond: [{ $eq: ['$billable', true] }, '$duration', 0] },
            },
            count: { $sum: 1 },
          },
        },
        { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'project' } },
        { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'clients',
            localField: 'project.clientId',
            foreignField: '_id',
            as: 'client',
          },
        },
        { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            projectId: '$_id',
            name: '$project.name',
            color: '$project.color',
            clientName: '$client.name',
            total: 1,
            billable: 1,
            count: 1,
          },
        },
        { $sort: { total: -1 } },
      ]),
      TimeEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
            total: { $sum: '$duration' },
            billable: {
              $sum: { $cond: [{ $eq: ['$billable', true] }, '$duration', 0] },
            },
            nonBillable: {
              $sum: { $cond: [{ $eq: ['$billable', true] }, 0, '$duration'] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      TimeEntry.aggregate(topActivitiesPipeline as never),
      TimeEntry.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              projectId: '$projectId',
              description: { $ifNull: ['$description', ''] },
            },
            total: { $sum: '$duration' },
            billable: {
              $sum: { $cond: [{ $eq: ['$billable', true] }, '$duration', 0] },
            },
            count: { $sum: 1 },
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
            description: '$_id.description',
            name: '$project.name',
            color: '$project.color',
            total: 1,
            billable: 1,
            count: 1,
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

  res.json({
    status: 'success',
    data: {
      total: totalAgg[0]?.total || 0,
      billable: totalAgg[0]?.billable || 0,
      nonBillable: totalAgg[0]?.nonBillable || 0,
      count: totalAgg[0]?.count || 0,
      byProject,
      byProjectDescription,
      byDay,
      topActivities,
      range: { from, to },
    },
  });
}

export async function detailed(req: Request, res: Response): Promise<void> {
  const match = buildMatch(req);
  const filter = match as Record<string, unknown>;

  const entries = await TimeEntry.find(filter)
    .populate('projectId', 'name color clientId')
    .populate('tags', 'name color')
    .populate('userId', 'name email')
    .sort({ startTime: -1 });

  res.json({ status: 'success', data: entries });
}

export async function weekly(req: Request, res: Response): Promise<void> {
  const { from, to } = parseRange(req);
  const match = buildMatch(req);

  const grid = await TimeEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          projectId: '$projectId',
          day: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
        },
        total: { $sum: '$duration' },
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
        name: '$project.name',
        color: '$project.color',
        total: 1,
      },
    },
  ]);

  res.json({ status: 'success', data: grid, range: { from, to } });
}
