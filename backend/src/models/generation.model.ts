import mongoose, { type HydratedDocument, type Types } from 'mongoose';

const { Schema } = mongoose;

export const GENERATION_STATUSES = ['queued', 'processing', 'saving', 'succeeded', 'failed', 'needs_review'] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export interface GenerationLease {
  owner: string;
  expiresAt: Date;
  heartbeatAt: Date;
}

export interface GenerationCheckpoint {
  stage: string;
  storageKey: string;
}

export interface GenerationError {
  code: string;
  safeMessage: string;
  stage: string;
  occurredAt: Date;
}

export interface GenerationQuotaReservation {
  dateKey: string;
  userReserved: boolean;
  appReserved: boolean;
  releasedAt: Date | null;
}

export interface Generation {
  userId: Types.ObjectId;
  requestKey: string;
  requestFingerprint: string;
  originalPrompt: string;
  submittedPrompt: string;
  provider: string;
  model: string;
  settings: Record<string, unknown>;
  status: GenerationStatus;
  imageId: Types.ObjectId | null;
  lease: GenerationLease | null;
  checkpoint: GenerationCheckpoint | null;
  error: GenerationError | null;
  quotaReservation: GenerationQuotaReservation;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
}

export type GenerationDocument = HydratedDocument<Generation>;

const leaseSchema = new Schema<GenerationLease>(
  {
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    heartbeatAt: { type: Date, required: true },
  },
  { _id: false },
);

const checkpointSchema = new Schema<GenerationCheckpoint>(
  {
    stage: { type: String, required: true },
    storageKey: { type: String, required: true },
  },
  { _id: false },
);

const generationErrorSchema = new Schema<GenerationError>(
  {
    code: { type: String, required: true },
    safeMessage: { type: String, required: true },
    stage: { type: String, required: true },
    occurredAt: { type: Date, required: true },
  },
  { _id: false },
);

const quotaReservationSchema = new Schema<GenerationQuotaReservation>(
  {
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    userReserved: { type: Boolean, required: true },
    appReserved: { type: Boolean, required: true },
    releasedAt: { type: Date, default: null },
  },
  { _id: false },
);

const generationSchema = new Schema<Generation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    requestKey: { type: String, required: true },
    requestFingerprint: { type: String, required: true },
    originalPrompt: { type: String, required: true },
    submittedPrompt: { type: String, required: true },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    settings: { type: Schema.Types.Mixed, required: true, default: () => ({}) },
    status: { type: String, enum: GENERATION_STATUSES, default: 'queued', required: true },
    imageId: { type: Schema.Types.ObjectId, ref: 'Image', default: null },
    lease: { type: leaseSchema, default: null },
    checkpoint: { type: checkpointSchema, default: null },
    error: { type: generationErrorSchema, default: null },
    quotaReservation: { type: quotaReservationSchema, required: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, min: 0, default: null },
  },
  { collection: 'generations', autoIndex: false, timestamps: true },
);

generationSchema.index({ userId: 1, requestKey: 1 }, { unique: true, name: 'generations_user_request_unique' });
generationSchema.index({ userId: 1, createdAt: -1, _id: -1 }, { name: 'generations_user_history' });
generationSchema.index({ status: 1, createdAt: 1 }, { name: 'generations_worker_scan' });

export const GenerationModel = mongoose.models.Generation ?? mongoose.model<Generation>('Generation', generationSchema);
