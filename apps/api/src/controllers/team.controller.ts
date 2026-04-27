import { Request, Response } from 'express';
import { TimeEntry } from '../models/TimeEntry';
import { ApiError } from '../utils/ApiError';

export async function liveTimers(req: Request, res: Response): Promise<void> {
  if (req.user!.role !== 'admin') {
    throw new ApiError(403, 'Admin only');
  }

  const running = await TimeEntry.find({ status: 'running' })
    .populate('userId', 'name email')
    .populate('projectId', 'name color')
    .sort({ startTime: -1 })
    .lean();

  const data = running.map((e) => {
    const user = e.userId as unknown as { _id: unknown; name?: string; email?: string } | null;
    const project = e.projectId as unknown as { _id: unknown; name?: string; color?: string } | null;
    return {
      entryId: String(e._id),
      userId: user ? String(user._id) : null,
      userName: user?.name || '',
      userEmail: user?.email || '',
      projectId: project ? String(project._id) : null,
      projectName: project?.name || null,
      projectColor: project?.color || null,
      description: e.description || '',
      startTime: e.startTime,
    };
  });

  res.json({ status: 'success', data });
}
