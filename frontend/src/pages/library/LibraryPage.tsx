import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { api } from "../../services/api";
import { useResource, type ImageRecord, type Page, type StatsRecord } from "../../services/resources";
import { useListNavigation, useRestoreListScroll } from "../../services/listNavigation";
import ImageCard from "../../components/library/ImageCard";
import ImageActionDialog, { type ImageAction } from "../../components/library/ImageActionDialog";
import BulkDeleteDialog from "../../components/library/BulkDeleteDialog";
import "./LibraryPage.css";

export default function LibraryPage() {
  const { cursor, previous, move } = useListNavigation();
  const { data, error, loading, reload } = useResource<Page<ImageRecord>>(
    "/images?limit=20" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
  );
  const stats = useResource<StatsRecord>("/stats/me");
  useRestoreListScroll(loading);
  const [selected, setSelected] = useState<{ image: ImageRecord; action: ImageAction } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkMode, setBulkMode] = useState<"selected" | "all" | null>(null);
  const [message, setMessage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const count = Number(params.get("count"));
    return params.get("notice") === "deleted"
      ? `${Number.isInteger(count) && count > 0 ? `Đã xóa ${count} ảnh khỏi thư viện. ` : "Đã xóa khỏi thư viện. "}Lịch sử tạo vẫn được giữ.` : "";
  });
  const toggleSelected = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return <DashboardLayout search="" onSearch={() => undefined} favoritesOnly={false}
    onFavorites={() => undefined} onCompose={() => undefined} activeItem="library" showSearch={false}>
    <div className="library-page">
      <header className="library-header">
        <div><span className="section-eyebrow">MY IMAGE LIBRARY</span><h1 tabIndex={-1}>Thư viện của tôi</h1><p>Ảnh đã lưu của tài khoản hiện tại.</p></div>
        <a className="studio-button studio-button--primary" href="/app/create">Tạo ảnh mới</a>
      </header>
      {message && <p role="status">{message}</p>}
      {!error && data && data.items.length > 0 && <div className="library-selection-toolbar">
        <span>{selectedIds.size ? `Đã chọn ${selectedIds.size} ảnh` : "Chọn ảnh bằng ô ở góc phải mỗi thẻ"}</span>
        <div>
          {selectedIds.size > 0 && <button type="button" className="studio-button studio-button--subtle" onClick={() => setSelectedIds(new Set())}>Bỏ chọn</button>}
          {selectedIds.size >= 2 && <button type="button" className="library-button--danger" onClick={() => setBulkMode("selected")}>Xóa đã chọn ({selectedIds.size})</button>}
          <button type="button" className="studio-button studio-button--subtle library-delete-all" onClick={() => setBulkMode("all")}>Xóa tất cả</button>
        </div>
      </div>}
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
        {data.items.map((image) => <ImageCard key={image.id} image={image} checked={selectedIds.has(image.id)} onToggle={toggleSelected}
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
        if (selected.action === "delete") setSelectedIds((current) => { const next = new Set(current); next.delete(selected.image.id); return next; });
        if (selected.action === "delete") requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(".library-header h1")?.focus();
        });
        reload();
      }} />}
    {bulkMode && <BulkDeleteDialog mode={bulkMode} count={bulkMode === "selected" ? selectedIds.size : stats.data?.totals.savedImages ?? null}
      onClose={() => setBulkMode(null)} onDelete={async () => {
        const input = bulkMode === "all" ? { all: true } : { ids: [...selectedIds] };
        const result = await api<{ deletedCount: number }>("/images", { method: "DELETE", body: JSON.stringify(input) });
        window.location.assign(`/app/library?notice=deleted&count=${result.deletedCount}`);
      }} />}
  </DashboardLayout>;
}
