import mongoose, { type HydratedDocument } from 'mongoose';

const { Schema } = mongoose;

export const DAILY_USAGE_SCOPE_TYPES = ['user', 'application'] as const;
export type DailyUsageScopeType = (typeof DAILY_USAGE_SCOPE_TYPES)[number];

export interface DailyUsage {
  scopeType: DailyUsageScopeType;
  scopeId: string;
  dateKey: string;
  reservedRequests: number;
  updatedAt: Date;
}

export type DailyUsageDocument = HydratedDocument<DailyUsage>;

const dailyUsageSchema = new Schema<DailyUsage>(
  {
    scopeType: { type: String, enum: DAILY_USAGE_SCOPE_TYPES, required: true },
    scopeId: { type: String, required: true },
    dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    reservedRequests: { type: Number, min: 0, default: 0, required: true, validate: Number.isInteger },
  },
  { collection: 'dailyUsage', autoIndex: false, timestamps: { createdAt: false, updatedAt: true } },
);

dailyUsageSchema.index(
  { scopeType: 1, scopeId: 1, dateKey: 1 },
  { unique: true, name: 'daily_usage_scope_date_unique' },
);

export const DailyUsageModel: mongoose.Model<DailyUsage> = (mongoose.models.DailyUsage as mongoose.Model<DailyUsage> | undefined) ?? mongoose.model<DailyUsage>('DailyUsage', dailyUsageSchema);
