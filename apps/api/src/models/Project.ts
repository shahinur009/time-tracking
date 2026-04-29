import { Schema, model, Document, Types } from 'mongoose';

export interface IProjectTask {
  _id: Types.ObjectId;
  name: string;
  status: 'active' | 'done';
}

export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  color: string;
  description?: string;
  clientId?: Types.ObjectId | null;
  isPublic: boolean;
  tasks: Types.DocumentArray<IProjectTask>;
  createdBy: Types.ObjectId;
  members: Types.ObjectId[];
  archived: boolean;
  favoriteBy: Types.ObjectId[];

  clickupListId?: string;
  clickupFolderId?: string;
  clickupSpaceId?: string;

  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<IProjectTask>(
  {
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'done'],
      default: 'active',
    },
  },
  { _id: true, timestamps: false },
);

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true, index: true },
    color: { type: String, default: '#4DC9FF' },
    description: { type: String, default: '' },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true,
    },
    isPublic: { type: Boolean, default: true },
    tasks: { type: [taskSchema], default: [] },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    archived: { type: Boolean, default: false, index: true },
    favoriteBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    clickupListId: { type: String, index: true },
    clickupFolderId: { type: String, index: true },
    clickupSpaceId: { type: String, index: true },
  },
  { timestamps: true },
);

projectSchema.set('toJSON', { virtuals: true, versionKey: false });

export const Project = model<IProject>('Project', projectSchema);
