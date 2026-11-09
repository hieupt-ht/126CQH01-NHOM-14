import { useEffect, useRef, useState } from "react";
import { trapDialogFocus } from "../ui/dialogFocus";
import "./ImageActionDialog.css";

export default function BulkDeleteDialog({ mode, count, onClose, onDelete }: {
  mode: "selected" | "all";
  count: number | null;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    const previousFocus = opener.current;
    return () => { previousFocus?.focus(); };
  }, []);
  const confirm = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try { await onDelete(); }
    catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không xóa được ảnh. Vui lòng thử lại.");
      submitting.current = false;
      setBusy(false);
    }
  };
  return <dialog ref={dialog} className="image-action-dialog" aria-labelledby="bulk-delete-title" tabIndex={-1}
    onKeyDown={trapDialogFocus}
    onCancel={(event) => { if (submitting.current) event.preventDefault(); else onClose(); }}>
    <form onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
      <h2 id="bulk-delete-title">{mode === "all" ? "Xóa tất cả ảnh?" : `Xóa ${count} ảnh đã chọn?`}</h2>
      <p>{mode === "all" ? `Toàn bộ ảnh${count === null ? "" : ` (${count} ảnh)`} trong thư viện của bạn sẽ bị ẩn, gồm cả các trang chưa mở.` : `${count} ảnh đã chọn sẽ bị ẩn khỏi thư viện.`} Lịch sử tạo vẫn được giữ; file trong kho ảnh được xử lý riêng.</p>
      {error && <p role="alert">{error}</p>}
      <div className="image-action-dialog__actions">
        <button type="button" className="studio-button studio-button--subtle" autoFocus disabled={busy} onClick={onClose}>Hủy</button>
        <button type="submit" className="library-button--danger" disabled={busy}>{busy ? "Đang xóa…" : mode === "all" ? "Xóa tất cả ảnh" : `Xóa ${count} ảnh`}</button>
      </div>
    </form>
  </dialog>;
}
