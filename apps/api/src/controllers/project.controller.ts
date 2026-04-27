import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Project } from '../models/Project';
import { ApiError } from '../utils/ApiError';

export async function listProjects(req: Request, res: Response): Promise<void> {
  const filter: Record<string, unknown> = { archived: false };
  if (req.user!.role === 'member') {
    filter.$or = [
      { isPublic: true },
      { members: req.user!.id },
      { createdBy: req.user!.id },
    ];
  }
  const projects = await Project.find(filter)
    .populate('clientId', 'name')
    .sort({ createdAt: -1 });
  res.json({ status: 'success', data: projects });
}

export async function createProject(req: Request, res: Response): Promise<void> {
  const project = await Project.create({
    ...req.body,
    createdBy: req.user!.id,
  });
  res.status(201).json({ status: 'success', data: project });
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!project) throw new ApiError(404, 'Project not found');
  res.json({ status: 'success', data: project });
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { archived: true },
    { new: true },
  );
  if (!project) throw new ApiError(404, 'Project not found');
  res.json({ status: 'success', message: 'Project archived' });
}

export async function addTask(req: Request, res: Response): Promise<void> {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  const name = String(req.body?.name || '').trim();
  if (!name) throw new ApiError(400, 'Task name is required');
  project.tasks.push({ name, status: 'active' } as never);
  await project.save();
  res.status(201).json({ status: 'success', data: project });
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  const task = project.tasks.id(req.params.taskId as unknown as Types.ObjectId);
  if (!task) throw new ApiError(404, 'Task not found');
  if (req.body.name !== undefined) task.name = String(req.body.name);
  if (req.body.status !== undefined) task.status = req.body.status;
  await project.save();
  res.json({ status: 'success', data: project });
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  const task = project.tasks.id(req.params.taskId as unknown as Types.ObjectId);
  if (!task) throw new ApiError(404, 'Task not found');
  task.deleteOne();
  await project.save();
  res.json({ status: 'success', data: project });
}

export async function toggleFavorite(req: Request, res: Response): Promise<void> {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  const uid = new Types.ObjectId(req.user!.id);
  const idx = project.favoriteBy.findIndex((id) => id.toString() === uid.toString());
  if (idx >= 0) project.favoriteBy.splice(idx, 1);
  else project.favoriteBy.push(uid);
  await project.save();
  res.json({ status: 'success', data: project });
}
