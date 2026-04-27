import { Schema, model, Document, Types } from 'mongoose';

export interface ITimesheetTemplateCell {
  projectId: Types.ObjectId | null;
  dayOffset: number;
  durationSec: number;
}

export interface ITimesheetTemplate extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  includeTime: boolean;
  rows: Types.ObjectId[];
  cells: ITimesheetTemplateCell[];
  createdAt: Date;
  updatedAt: Date;
}

const cellSchema = new Schema<ITimesheetTemplateCell>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    dayOffset: { type: Number, required: true, min: 0, max: 6 },
    durationSec: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const templateSchema = new Schema<ITimesheetTemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    includeTime: { type: Boolean, default: false },
    rows: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    cells: { type: [cellSchema], default: [] },
  },
  { timestamps: true },
);

templateSchema.index({ userId: 1, name: 1 }, { unique: true });

templateSchema.set('toJSON', { virtuals: true, versionKey: false });

export const TimesheetTemplate = model<ITimesheetTemplate>(
  'TimesheetTemplate',
  templateSchema,
);
