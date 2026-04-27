import { Schema, model, Document, Types } from 'mongoose';

export interface IClient extends Document {
  _id: Types.ObjectId;
  name: string;
  archived: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true, index: true },
    archived: { type: Boolean, default: false, index: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

clientSchema.set('toJSON', { virtuals: true, versionKey: false });

export const Client = model<IClient>('Client', clientSchema);
