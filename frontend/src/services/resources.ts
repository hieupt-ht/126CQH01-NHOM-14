import { useEffect, useState } from "react";
import { api } from "./api";
export type ImageRecord = {
  id: string;
  generationId: string;
  title: string;
  createdAt: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  contentUrl: string;
  downloadUrl: string;
  prompt?: string;
  model?: string;
};
export type GenerationRecord = {
  id: string;
  prompt: string;
  status:
    | "queued"
    | "processing"
    | "saving"
    | "succeeded"
    | "failed"
    | "needs_review";
  imageId: string | null;
  imageDeleted?: boolean;
  startedAt: string | null;
  completedAt: string | null;
  model: string;
  createdAt: string;
  durationMs: number | null;
  error: { code: string; message: string } | null;
};
export type UsageRecord = {
  grantedToday: number;
  remainingToday: number;
  acceptedToday: number;
  resetAt: string;
  configured: boolean;
};
export type StatsRecord = {
  totals: { savedImages: number; bytes: number };
  averageDurationMs: number | null;
  jobsByDay: { _id: string; count: number }[];
  jobsByStatus: { _id: string; count: number }[];
};
export type Page<T> = { items: T[]; nextCursor: string | null };
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Không tải được dữ liệu.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return {
    data,
    error,
    loading,
    reload: () => setRevision((value) => value + 1),
  };
}
