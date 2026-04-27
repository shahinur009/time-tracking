import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId?: Types.ObjectId | string;
  changes?: Record<string, unknown>;
  createdAt: Date;
}

const auditSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true, index: true },
    targetId: { type: Schema.Types.Mixed },
    changes: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditSchema.set('toJSON', { virtuals: true, versionKey: false });

export const AuditLog = model<IAuditLog>('AuditLog', auditSchema);
