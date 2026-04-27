import { Request, Response } from 'express';
import { Client } from '../models/Client';
import { ApiError } from '../utils/ApiError';

export async function listClients(req: Request, res: Response): Promise<void> {
  const clients = await Client.find({ archived: false }).sort({ name: 1 });
  res.json({ status: 'success', data: clients });
}

export async function createClient(req: Request, res: Response): Promise<void> {
  const name = String(req.body?.name || '').trim();
  if (!name) throw new ApiError(400, 'Client name required');
  const client = await Client.create({
    name,
    createdBy: req.user!.id,
  });
  res.status(201).json({ status: 'success', data: client });
}

export async function updateClient(req: Request, res: Response): Promise<void> {
  const client = await Client.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!client) throw new ApiError(404, 'Client not found');
  res.json({ status: 'success', data: client });
}

export async function deleteClient(req: Request, res: Response): Promise<void> {
  const client = await Client.findByIdAndUpdate(
    req.params.id,
    { archived: true },
    { new: true },
  );
  if (!client) throw new ApiError(404, 'Client not found');
  res.json({ status: 'success', message: 'Client archived' });
}
