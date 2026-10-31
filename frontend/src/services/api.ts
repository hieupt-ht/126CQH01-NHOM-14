import { UI_PREVIEW, previewResponse } from "./uiPreview";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
let csrfToken: string | null = null;
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (UI_PREVIEW) return previewResponse(path, options) as T;
  const method = options.method ?? "GET";
  if (
    !["GET", "HEAD"].includes(method) &&
    !["/auth/login", "/auth/register"].includes(path) &&
    !csrfToken
  ) {
    const result = await api<{ csrfToken: string }>("/auth/csrf");
    csrfToken = result.csrfToken;
  }
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (csrfToken && !["GET", "HEAD"].includes(method))
    headers.set("X-CSRF-Token", csrfToken);
  let response: Response;
  try {
    response = await fetch("/api/v1" + path, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Không kết nối được backend. Kiểm tra server và thử lại.",
    );
  }
  if (response.status === 204) {
    csrfToken = null;
    return undefined as T;
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    if (response.status === 401 || result?.error?.code === "CSRF_INVALID")
      csrfToken = null;
    if (
      response.status === 401 &&
      !path.startsWith("/auth/") &&
      window.location.pathname.startsWith("/app")
    )
      window.location.replace("/login");
    throw new ApiError(
      response.status,
      result?.error?.code ?? "API_ERROR",
      result?.error?.message ?? "Không thể xử lý yêu cầu.",
    );
  }
  if (typeof result.data?.csrfToken === "string")
    csrfToken = result.data.csrfToken;
  return result.data as T;
}
export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
};
