import { Schema, model, Document, Types } from 'mongoose';

export interface ITag extends Document {
  _id: Types.ObjectId;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    color: { type: String, default: '#8C8C8C' },
  },
  { timestamps: true },
);

tagSchema.set('toJSON', { virtuals: true, versionKey: false });

export const Tag = model<ITag>('Tag', tagSchema);
