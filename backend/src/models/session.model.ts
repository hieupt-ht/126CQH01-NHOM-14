import mongoose, { type HydratedDocument, type Types } from 'mongoose';

const { Schema } = mongoose;

export interface Session {
  userId: Types.ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
}

export type SessionDocument = HydratedDocument<Session>;

const sessionSchema = new Schema<Session>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, select: false },
    createdAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true, default: Date.now },
  },
  {
    collection: 'sessions',
    autoIndex: false,
    versionKey: false,
    toJSON: {
      transform: (_document, result) => {
        Reflect.deleteProperty(result, 'tokenHash');
        return result;
      },
    },
    toObject: {
      transform: (_document, result) => {
        Reflect.deleteProperty(result, 'tokenHash');
        return result;
      },
    },
  },
);

sessionSchema.index({ tokenHash: 1 }, { unique: true, name: 'sessions_token_hash_unique' });
sessionSchema.index({ userId: 1, expiresAt: 1 }, { name: 'sessions_user_expiry' });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'sessions_expiry_ttl' });

export const SessionModel = mongoose.models.Session ?? mongoose.model<Session>('Session', sessionSchema);
