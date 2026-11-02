import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { api } from "../../services/api";
import { useResource, type ImageRecord, type Page } from "../../services/resources";
import { useListNavigation, useRestoreListScroll } from "../../services/listNavigation";
import ImageCard from "../../components/library/ImageCard";
import ImageActionDialog, { type ImageAction } from "../../components/library/ImageActionDialog";
import "./LibraryPage.css";

export default function LibraryPage() {
  const { cursor, previous, move } = useListNavigation();
  const { data, error, loading, reload } = useResource<Page<ImageRecord>>(
    "/images?limit=20" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
  );
  useRestoreListScroll(loading);
  const [selected, setSelected] = useState<{ image: ImageRecord; action: ImageAction } | null>(null);
  const [message, setMessage] = useState(new URLSearchParams(window.location.search).get("notice") === "deleted"
    ? "Đã xóa khỏi thư viện. Lịch sử tạo vẫn được giữ." : "");
  return <DashboardLayout search="" onSearch={() => undefined} favoritesOnly={false}
    onFavorites={() => undefined} onCompose={() => undefined} activeItem="library" showSearch={false}>
    <div className="library-page">
      <header className="library-header">
        <div><span className="section-eyebrow">MY IMAGE LIBRARY</span><h1 tabIndex={-1}>Thư viện của tôi</h1><p>Ảnh đã lưu của tài khoản hiện tại.</p></div>
        <a className="studio-button studio-button--primary" href="/app/create">Tạo ảnh mới</a>
      </header>
      {message && <p role="status">{message}</p>}
      {loading && !data ? <div role="status" aria-label="Đang tải thư viện">
        <span className="sr-only">Đang tải thư viện…</span>
        <div className="library-grid library-grid--skeleton" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => <div className="library-skeleton-card" key={index}><span /><div><span /><span /></div></div>)}
        </div>
      </div> : error ? <section className="library-state" role="alert">
        <p>{error}</p><button className="studio-button studio-button--subtle" onClick={reload}>Thử lại</button>
        {cursor && <a className="studio-button studio-button--subtle" href="/app/library">Về trang đầu</a>}
      </section> : !data?.items.length ? <section className="library-state">
        <h2>{cursor ? "Trang này không còn ảnh" : "Bạn chưa có hình ảnh nào"}</h2>
        <a className="studio-button studio-button--primary" href="/app/create">Tạo ảnh mới</a>
      </section> : <div className="library-grid">
        {data.items.map((image) => <ImageCard key={image.id} image={image}
          onAction={(action, image) => setSelected({ action, image })} />)}
      </div>}
      <nav className="library-pagination" aria-label="Phân trang thư viện">
        {(previous.length > 0 || cursor) && <button className="studio-button studio-button--subtle"
          disabled={loading} onClick={() => move(previous.at(-1) ?? "", true)}>Trang trước</button>}
        {!error && data?.nextCursor && <button className="studio-button studio-button--subtle"
          disabled={loading} onClick={() => move(data.nextCursor!)}>Trang sau</button>}
      </nav>
    </div>
    {selected && <ImageActionDialog image={selected.image} action={selected.action} onClose={() => setSelected(null)}
      onSave={async (title) => {
        await api("/images/" + selected.image.id, {
          method: selected.action === "delete" ? "DELETE" : "PATCH",
          ...(selected.action === "rename" ? { body: JSON.stringify({ title }) } : {}),
        });
        setMessage(selected.action === "delete" ? "Đã xóa khỏi thư viện. Lịch sử tạo vẫn được giữ." : "Đã lưu tên ảnh.");
        if (selected.action === "delete") requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(".library-header h1")?.focus();
        });
        reload();
      }} />}
  </DashboardLayout>;
}
