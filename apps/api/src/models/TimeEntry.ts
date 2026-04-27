import { Schema, model, Document, Types } from 'mongoose';

export type EntryStatus = 'running' | 'finished';
export type EntrySource = 'tracker' | 'timesheet';

export interface ITimeEntry extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  projectId?: Types.ObjectId | null;
  description: string;
  billable: boolean;
  tags: Types.ObjectId[];
  taggedUsers: Types.ObjectId[];
  startTime: Date;
  endTime?: Date | null;
  duration: number;
  status: EntryStatus;
  source: EntrySource;

  clickupTaskId?: string;
  clickupTaskTitle?: string;
  clickupListId?: string;
  clickupSpaceId?: string;
  clickupTeamId?: string;
  pushedToClickup: boolean;
  pushedToClickupAt?: Date | null;
  clickupTimeEntryId?: string | null;

  version: number;

  createdAt: Date;
  updatedAt: Date;
}

const entrySchema = new Schema<ITimeEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    description: { type: String, default: '' },
    billable: { type: Boolean, default: false },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    taggedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, default: null },
    duration: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['running', 'finished'],
      default: 'running',
      index: true,
    },
    source: {
      type: String,
      enum: ['tracker', 'timesheet'],
      default: 'tracker',
      index: true,
    },

    clickupTaskId: { type: String, index: true },
    clickupTaskTitle: { type: String },
    clickupListId: { type: String, index: true },
    clickupSpaceId: { type: String, index: true },
    clickupTeamId: { type: String, index: true },
    pushedToClickup: { type: Boolean, default: false },
    pushedToClickupAt: { type: Date, default: null },
    clickupTimeEntryId: { type: String, default: null, index: true },

    version: { type: Number, default: 0 },
  },
  { timestamps: true },
);

entrySchema.index({ userId: 1, status: 1 });
entrySchema.index({ userId: 1, startTime: -1 });
entrySchema.index(
  { userId: 1, projectId: 1, startTime: 1, source: 1 },
  {
    unique: true,
    partialFilterExpression: { source: 'timesheet' },
  },
);

entrySchema.set('toJSON', { virtuals: true, versionKey: false });

export const TimeEntry = model<ITimeEntry>('TimeEntry', entrySchema);
