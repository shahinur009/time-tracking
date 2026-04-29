import { Schema, model, Document, Types } from 'mongoose';

export interface IClickUpTaskAssignee {
  id: number | string;
  username?: string;
  email?: string;
  color?: string;
}

export interface IClickUpTask extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  clickupTaskId: string;
  clickupTeamId: string;
  clickupSpaceId?: string;
  clickupFolderId?: string;
  clickupListId?: string;
  name: string;
  status?: string;
  priority?: string | null;
  dueDate?: Date | null;
  url?: string;
  assignees: IClickUpTaskAssignee[];
  tags: string[];
  archived: boolean;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assigneeSchema = new Schema<IClickUpTaskAssignee>(
  {
    id: { type: Schema.Types.Mixed },
    username: String,
    email: String,
    color: String,
  },
  { _id: false },
);

const taskSchema = new Schema<IClickUpTask>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clickupTaskId: { type: String, required: true, index: true },
    clickupTeamId: { type: String, required: true, index: true },
    clickupSpaceId: { type: String, index: true },
    clickupFolderId: { type: String, index: true },
    clickupListId: { type: String, index: true },
    name: { type: String, required: true },
    status: { type: String },
    priority: { type: String, default: null },
    dueDate: { type: Date, default: null },
    url: { type: String },
    assignees: { type: [assigneeSchema], default: [] },
    tags: { type: [String], default: [] },
    archived: { type: Boolean, default: false, index: true },
    syncedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

taskSchema.index({ userId: 1, clickupTaskId: 1 }, { unique: true });
taskSchema.index({ userId: 1, name: 'text' });

taskSchema.set('toJSON', { virtuals: true, versionKey: false });

export const ClickUpTask = model<IClickUpTask>('ClickUpTask', taskSchema);
