import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'admin' | 'member';
export type UserStatus = 'active' | 'inactive';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  status: UserStatus;

  clickupUserId?: string;
  clickupTeamId?: string;
  clickupAccessToken?: string;
  clickupConnectedAt?: Date;

  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, select: false },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },

    clickupUserId: { type: String },
    clickupTeamId: { type: String },
    clickupAccessToken: { type: String, select: false },
    clickupConnectedAt: { type: Date },

    lastActiveAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete (ret as Record<string, unknown>).password;
    delete (ret as Record<string, unknown>).clickupAccessToken;
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);
