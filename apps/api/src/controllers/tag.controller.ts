import { Request, Response } from 'express';
import { Tag } from '../models/Tag';
import { ApiError } from '../utils/ApiError';

export async function listTags(_req: Request, res: Response): Promise<void> {
  const tags = await Tag.find().sort({ name: 1 });
  res.json({ status: 'success', data: tags });
}

export async function createTag(req: Request, res: Response): Promise<void> {
  const { name, color } = req.body;
  const existing = await Tag.findOne({ name });
  if (existing) {
    res.status(200).json({ status: 'success', data: existing });
    return;
  }
  const tag = await Tag.create({ name, color });
  res.status(201).json({ status: 'success', data: tag });
}

export async function deleteTag(req: Request, res: Response): Promise<void> {
  const tag = await Tag.findByIdAndDelete(req.params.id);
  if (!tag) throw new ApiError(404, 'Tag not found');
  res.json({ status: 'success', message: 'Tag deleted' });
}
