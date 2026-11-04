import mongoose, { type HydratedDocument, type Types } from 'mongoose';
import type { StoredObject } from '../storage/storage.js';

const { Schema } = mongoose;

export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface User {
  avatar: { storage: StoredObject; revision: string; bytes: number } | null;
  avatarPendingDeletion: StoredObject[];
  displayName: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  activeGenerationId: Types.ObjectId | null;
  lastGenerationAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    displayName: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    status: { type: String, enum: USER_STATUSES, default: 'active', required: true },
    activeGenerationId: { type: Schema.Types.ObjectId, ref: 'Generation', default: null },
    lastGenerationAt: { type: Date, default: null },
    avatar: { type: new Schema({
      storage: { type: new Schema({ provider: { type: String, required: true }, accountAlias: String, container: String, key: { type: String, required: true }, version: String, deliveryMode: { type: String, enum: ['private'], required: true } }, { _id: false }), required: true },
      revision: { type: String, required: true, match: /^[a-f0-9]{32}$/ },
      bytes: { type: Number, required: true, min: 1 },
    }, { _id: false }), default: null },
    avatarPendingDeletion: { type: [new Schema({ provider: String, accountAlias: String, container: String, key: String, version: String, deliveryMode: String }, { _id: false })], default: () => [] },
  },
  {
    collection: 'users',
    autoIndex: false,
    timestamps: true,
    toJSON: {
      transform: (_document, result) => {
        Reflect.deleteProperty(result, 'passwordHash');
        Reflect.deleteProperty(result, '__v');
        return result;
      },
    },
    toObject: {
      transform: (_document, result) => {
        Reflect.deleteProperty(result, 'passwordHash');
        Reflect.deleteProperty(result, '__v');
        return result;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true, name: 'users_email_unique' });

export const UserModel: mongoose.Model<User> = (mongoose.models.User as mongoose.Model<User> | undefined) ?? mongoose.model<User>('User', userSchema);
