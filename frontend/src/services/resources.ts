import { useCallback, useEffect, useState } from "react";
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
  const [result, setResult] = useState<{ path: string; data: T | null; error: string; loading: boolean }>({
    path, data: null, error: "", loading: true,
  });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setResult((current) => ({ path, data: current.path === path ? current.data : null, error: "", loading: true }));
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ path, data, error: "", loading: false });
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setResult((current) => ({
          path, data: current.path === path ? current.data : null, loading: false,
          error: reason instanceof Error ? reason.message : "Không tải được dữ liệu.",
        }));
      });
    return () => controller.abort();
  }, [path, revision]);
  return result.path === path ? { ...result, reload } : { data: null, error: "", loading: true, reload };
}
