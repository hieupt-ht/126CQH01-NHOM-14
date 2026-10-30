import mongoose, { type HydratedDocument, type Types } from 'mongoose';

const { Schema } = mongoose;

export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface User {
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

export const UserModel = mongoose.models.User ?? mongoose.model<User>('User', userSchema);
