import mongoose, { type HydratedDocument, type Types } from 'mongoose';

const { Schema } = mongoose;

export const IMAGE_FORMATS = ['png', 'jpeg', 'webp'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];
export const STORAGE_DELETION_STATUSES = ['not_requested', 'pending', 'deleted', 'failed'] as const;
export type StorageDeletionStatus = (typeof STORAGE_DELETION_STATUSES)[number];

export interface ImageStorage {
  provider: string;
  key: string;
  version?: string;
  deliveryMode: string;
}

export interface Image {
  userId: Types.ObjectId;
  generationId: Types.ObjectId;
  title: string;
  storage: ImageStorage;
  width: number;
  height: number;
  format: ImageFormat;
  bytes: number;
  isFavorite: boolean;
  deletedAt: Date | null;
  storageDeletionStatus: StorageDeletionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ImageDocument = HydratedDocument<Image>;

const imageStorageSchema = new Schema<ImageStorage>(
  {
    provider: { type: String, required: true },
    key: { type: String, required: true },
    version: { type: String },
    deliveryMode: { type: String, required: true },
  },
  { _id: false },
);

const imageSchema = new Schema<Image>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    generationId: { type: Schema.Types.ObjectId, ref: 'Generation', required: true, immutable: true },
    title: { type: String, required: true, trim: true },
    storage: { type: imageStorageSchema, required: true },
    width: { type: Number, required: true, min: 1, validate: Number.isInteger },
    height: { type: Number, required: true, min: 1, validate: Number.isInteger },
    format: { type: String, enum: IMAGE_FORMATS, required: true },
    bytes: { type: Number, required: true, min: 1, validate: Number.isInteger },
    isFavorite: { type: Boolean, default: false, required: true },
    deletedAt: { type: Date, default: null },
    storageDeletionStatus: { type: String, enum: STORAGE_DELETION_STATUSES, default: 'not_requested', required: true },
  },
  { collection: 'images', autoIndex: false, timestamps: true },
);

imageSchema.index({ generationId: 1 }, { unique: true, name: 'images_generation_unique' });
imageSchema.index({ userId: 1, deletedAt: 1, createdAt: -1, _id: -1 }, { name: 'images_user_library' });

export const ImageModel = mongoose.models.Image ?? mongoose.model<Image>('Image', imageSchema);
