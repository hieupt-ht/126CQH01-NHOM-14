// UI-only development mode. Production builds always use real authentication.
export const UI_PREVIEW =
  import.meta.env.DEV && import.meta.env.VITE_UI_PREVIEW !== "false";

const previewUser = {
  id: "ui-preview",
  displayName: "Khách xem thử",
  email: "preview@example.com",
  createdAt: "2026-10-31T00:00:00.000Z",
};

export function previewResponse(path: string, options: RequestInit): unknown {
  const method = (options.method ?? "GET").toUpperCase();
  const route = path.split("?")[0];
  if (method === "POST" && route === "/auth/login") {
    return { user: { ...previewUser } };
  }
  if (method === "POST" && route === "/auth/logout") return undefined;
  if (method === "GET" && route === "/auth/me") {
    return { user: { ...previewUser } };
  }
  if (method === "GET" && route === "/usage/me") {
    return {
      grantedToday: 0,
      acceptedToday: 0,
      remainingToday: 0,
      resetAt: new Date().toISOString(),
      configured: false,
    };
  }
  if (method === "GET" && route === "/stats/me") {
    return {
      totals: { savedImages: 0, bytes: 0 },
      averageDurationMs: null,
      jobsByDay: [],
      jobsByStatus: [],
    };
  }
  if (method === "GET" && ["/images", "/generations"].includes(route)) {
    return { items: [], nextCursor: null };
  }
  throw new Error(
    "Chế độ xem thử giao diện: thao tác này chưa kết nối DB hoặc dịch vụ tạo và lưu ảnh.",
  );
}
