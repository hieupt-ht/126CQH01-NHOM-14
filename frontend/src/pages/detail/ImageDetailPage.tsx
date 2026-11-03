import { useRef, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { api } from "../../services/api";
import { useResource, type ImageRecord } from "../../services/resources";
import { imageBackHref } from "../../services/listNavigation";
import PrivateImage from "../../components/library/PrivateImage";
import ImageActionDialog, { type ImageAction } from "../../components/library/ImageActionDialog";
import { trapDialogFocus } from "../../components/ui/dialogFocus";
import "./ImageDetailPage.css";

export default function ImageDetailPage({ imageId }: { imageId: string }) {
  const { data: image, loading, error, reload } = useResource<ImageRecord>("/images/" + encodeURIComponent(imageId));
  const [action, setAction] = useState<ImageAction | null>(null);
  const [message, setMessage] = useState("");
  const lightbox = useRef<HTMLDialogElement>(null);
  const backHref = imageBackHref(window.location.search);
  const historyBack = backHref.split("?")[0] === "/app/history";
  return <DashboardLayout search="" onSearch={() => undefined} favoritesOnly={false}
    onFavorites={() => undefined} onCompose={() => undefined} activeItem={historyBack ? "history" : "library"} showSearch={false}>
    <div className="detail-page">
      <nav className="detail-breadcrumb" aria-label="Điều hướng chi tiết">
        <a href={backHref}>{historyBack ? "Quay lại lịch sử" : "Quay lại thư viện"}</a>
      </nav>
      {loading && !image ? <p role="status">Đang tải hình ảnh…</p> : error ? (
        <section className="detail-state" role="alert">
          <h1>Không mở được hình ảnh</h1><p>{error}</p>
          <button className="studio-button studio-button--subtle" onClick={reload}>Thử lại</button>
        </section>
      ) : image && <div className="detail-layout">
        <section className="detail-art-panel">
          <PrivateImage key={image.contentUrl} src={image.contentUrl} title={image.title} className="detail-live-art" />
          <button className="studio-button studio-button--subtle" onClick={() => lightbox.current?.showModal()}>Phóng to ảnh</button>
        </section>
        <aside className="detail-info-panel">
          <h1>{image.title}</h1>
          <p>{image.width} × {image.height} · {image.format} · {(image.bytes / 1024).toFixed(0)} KB</p>
          <p>{new Date(image.createdAt).toLocaleString("vi-VN")}</p>
          <section className="detail-prompt"><h2>Mô tả gốc</h2><p>{image.prompt}</p></section>
          <p>Model: {image.model || "Không có thông tin"}</p>
          <div className="detail-actions">
            <a className="studio-button studio-button--primary" href={image.downloadUrl}>Tải ảnh</a>
            <a className="studio-button studio-button--subtle" href={"/app/history?job=" + encodeURIComponent(image.generationId)}>Xem lần tạo ảnh</a>
            <button className="studio-button studio-button--subtle" onClick={async () => {
              try { await navigator.clipboard.writeText(image.prompt ?? ""); setMessage("Đã sao chép mô tả."); }
              catch { setMessage("Hãy chọn và sao chép mô tả thủ công."); }
            }}>Sao chép mô tả</button>
            <a className="studio-button studio-button--subtle" href={"/app/create?prompt=" + encodeURIComponent(image.prompt ?? "")}>Dùng lại mô tả</a>
            <button className="studio-button studio-button--subtle" onClick={() => setAction("rename")}>Đổi tên</button>
            <button className="studio-button detail-button--danger" onClick={() => setAction("delete")}>Xóa ảnh</button>
          </div>
        </aside>
      </div>}
      {message && <p role="status">{message}</p>}
    </div>
    {action && image && <ImageActionDialog image={image} action={action} onClose={() => setAction(null)}
      onSave={async (title) => {
        await api("/images/" + image.id, {
          method: action === "delete" ? "DELETE" : "PATCH",
          ...(action === "rename" ? { body: JSON.stringify({ title }) } : {}),
        });
        if (action === "delete") {
          const destination = new URL(backHref, window.location.origin);
          destination.searchParams.set("notice", "deleted");
          window.location.assign(destination.pathname + destination.search);
        } else {
          setMessage("Đã lưu tên ảnh.");
          reload();
        }
      }} />}
    <dialog ref={lightbox} className="detail-dialog detail-dialog--lightbox" aria-label="Ảnh phóng to" tabIndex={-1} onKeyDown={trapDialogFocus}>
      <button className="studio-button studio-button--subtle" autoFocus onClick={() => lightbox.current?.close()}>Đóng ảnh</button>
      {image && <PrivateImage key={image.contentUrl} src={image.contentUrl} title={image.title} className="detail-live-art" />}
    </dialog>
  </DashboardLayout>;
}
