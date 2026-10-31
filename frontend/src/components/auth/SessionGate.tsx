import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../../services/api";
import { UI_PREVIEW } from "../../services/uiPreview";
import "../../pages/detail/ImageDetailPage.css";
export default function SessionGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (UI_PREVIEW) return;
    let active = true;
    setState("loading");
    api("/auth/me")
      .then(() => {
        if (active) setState("ready");
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401)
          window.location.replace("/login");
        else setState("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (UI_PREVIEW || state === "ready") return children;
  return (
    <main className="detail-state" role="status">
      <h1>
        {state === "loading"
          ? "Đang kiểm tra phiên đăng nhập…"
          : "Không kết nối được dịch vụ tài khoản"}
      </h1>
      {state === "error" && (
        <>
          <p>Hãy khởi động backend và MongoDB rồi thử lại.</p>
          <button
            className="studio-button studio-button--primary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Thử lại
          </button>
          <a href="/login">Về đăng nhập</a>
        </>
      )}
    </main>
  );
}
