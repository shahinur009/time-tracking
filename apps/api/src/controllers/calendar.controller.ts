import { Request, Response } from 'express';
import { TimeEntry } from '../models/TimeEntry';

export async function calendar(req: Request, res: Response): Promise<void> {
  const q = req.query as Record<string, string | undefined>;
  const from = q.from ? new Date(q.from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const to = q.to ? new Date(q.to) : new Date(Date.now() + 1 * 24 * 3600 * 1000);

  const filter: Record<string, unknown> = {
    startTime: { $gte: from, $lte: to },
    status: 'finished',
  };
  if (req.user!.role === 'member') {
    filter.userId = req.user!.id;
  } else if (q.userId) {
    filter.userId = q.userId;
  }

  const entries = await TimeEntry.find(filter)
    .populate('projectId', 'name color')
    .sort({ startTime: 1 });

  res.json({ status: 'success', data: entries });
}
