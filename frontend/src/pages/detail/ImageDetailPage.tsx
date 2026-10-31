import { useRef, useState, useEffect } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { api } from "../../services/api";
import { useResource, type ImageRecord } from "../../services/resources";
import "./ImageDetailPage.css";
export default function ImageDetailPage({ imageId }: { imageId: string }) {
  const {
    data: image,
    loading,
    error,
    reload,
  } = useResource<ImageRecord>("/images/" + encodeURIComponent(imageId));
  const [action, setAction] = useState<"rename" | "delete" | null>(null),
    [title, setTitle] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    lightbox = useRef<HTMLDialogElement>(null);
  const backHref =
    new URLSearchParams(window.location.search).get("from") === "history"
      ? "/app/history"
      : "/app/library";
  useEffect(() => {
    if (action) dialog.current?.showModal();
    else dialog.current?.close();
  }, [action]);
  const save = async () => {
    if (busy || !image) return;
    if (action === "rename" && (!title.trim() || title.trim().length > 120)) {
      setMessage("Tên ảnh cần từ 1 đến 120 ký tự.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await api("/images/" + image.id, {
        method: action === "delete" ? "DELETE" : "PATCH",
        ...(action === "rename" ? { body: JSON.stringify({ title }) } : {}),
      });
      if (action === "delete") {
        window.location.assign("/app/library");
        return;
      }
      setAction(null);
      reload();
      setMessage("Đã lưu tên ảnh.");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Không lưu được thay đổi.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <DashboardLayout
      search=""
      onSearch={() => undefined}
      favoritesOnly={false}
      onFavorites={() => undefined}
      onCompose={() => undefined}
      activeItem="library"
      showSearch={false}
    >
      <div className="detail-page">
        <nav className="detail-breadcrumb">
          <a href={backHref}>
            {backHref.endsWith("history")
              ? "Quay lại lịch sử"
              : "Quay lại thư viện"}
          </a>
        </nav>
        {loading ? (
          <p role="status">Đang tải hình ảnh…</p>
        ) : error ? (
          <section className="detail-state" role="alert">
            <h1>Không mở được hình ảnh</h1>
            <p>{error}</p>
            <button
              className="studio-button studio-button--subtle"
              onClick={reload}
            >
              Thử lại
            </button>
          </section>
        ) : (
          image && (
            <div className="detail-layout">
              <section className="detail-art-panel">
                <button
                  className="detail-art-button"
                  onClick={() => lightbox.current?.showModal()}
                  aria-label="Phóng to ảnh"
                >
                  <img
                    src={image.contentUrl}
                    className="detail-live-art"
                    alt={image.title}
                  />
                </button>
              </section>
              <aside className="detail-info-panel">
                <h1>{image.title}</h1>
                <p>
                  {image.width} × {image.height} · {image.format} ·{" "}
                  {(image.bytes / 1024).toFixed(0)} KB
                </p>
                <p>{new Date(image.createdAt).toLocaleString("vi-VN")}</p>
                <section className="detail-prompt">
                  <h2>Mô tả gốc</h2>
                  <p>{image.prompt}</p>
                </section>
                <p>Model: {image.model}</p>
                <div className="detail-actions">
                  <a
                    className="studio-button studio-button--primary"
                    href={image.downloadUrl}
                  >
                    Tải ảnh
                  </a>
                  <button
                    className="studio-button studio-button--subtle"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(image.prompt ?? "");
                        setMessage("Đã sao chép mô tả.");
                      } catch {
                        setMessage("Hãy chọn và sao chép mô tả thủ công.");
                      }
                    }}
                  >
                    Sao chép mô tả
                  </button>
                  <a
                    className="studio-button studio-button--subtle"
                    href={
                      "/app/create?prompt=" +
                      encodeURIComponent(image.prompt ?? "")
                    }
                  >
                    Dùng lại mô tả
                  </a>
                  <button
                    className="studio-button studio-button--subtle"
                    onClick={() => {
                      setTitle(image.title);
                      setMessage("");
                      setAction("rename");
                    }}
                  >
                    Đổi tên
                  </button>
                  <button
                    className="studio-button detail-button--danger"
                    onClick={() => {
                      setMessage("");
                      setAction("delete");
                    }}
                  >
                    Xóa ảnh
                  </button>
                </div>
              </aside>
            </div>
          )
        )}
        {message && !action && <p role="status">{message}</p>}
      </div>
      <dialog
        ref={dialog}
        className="detail-dialog"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setAction(null);
        }}
        onClose={() => setAction(null)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <h2>{action === "delete" ? "Xóa hình ảnh?" : "Đổi tên hình ảnh"}</h2>
          {action === "delete" ? (
            <p>Ảnh sẽ bị ẩn khỏi thư viện. Lịch sử tạo vẫn được giữ.</p>
          ) : (
            <>
              <label htmlFor="image-title">Tên hình ảnh</label>
              <input
                id="image-title"
                autoFocus
                value={title}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
              />
            </>
          )}
          {message && <p role="alert">{message}</p>}
          <div className="detail-dialog__actions">
            <button
              type="button"
              className="studio-button studio-button--subtle"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Hủy
            </button>
            <button
              className="studio-button studio-button--primary"
              disabled={busy}
            >
              {busy
                ? "Đang lưu…"
                : action === "delete"
                  ? "Xác nhận xóa"
                  : "Lưu"}
            </button>
          </div>
        </form>
      </dialog>
      <dialog ref={lightbox} className="detail-dialog detail-dialog--lightbox">
        <button
          className="studio-button studio-button--subtle"
          onClick={() => lightbox.current?.close()}
        >
          Đóng ảnh
        </button>
        {image && (
          <img
            className="detail-live-art"
            src={image.contentUrl}
            alt={image.title}
          />
        )}
      </dialog>
    </DashboardLayout>
  );
}
