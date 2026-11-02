import { useEffect, useRef, useState } from "react";
import type { ImageRecord } from "../../services/resources";
import PrivateImage from "./PrivateImage";
import { trapDialogFocus } from "../ui/dialogFocus";
import "./ImageActionDialog.css";

export type ImageAction = "rename" | "delete";

// The page owns the mutation; this component owns confirmation and focus.
export default function ImageActionDialog({ image, action, onClose, onSave }: {
  image: ImageRecord;
  action: ImageAction;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef(document.activeElement as HTMLElement | null);
  const [title, setTitle] = useState(image.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  useEffect(() => {
    dialog.current?.showModal();
    const opener = trigger.current;
    return () => { opener?.focus(); };
  }, []);
  async function save() {
    if (submitting.current) return;
    if (action === "rename" && (!title.trim() || title.trim().length > 120)) {
      setError("Tên ảnh cần từ 1 đến 120 ký tự.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    dialog.current?.focus();
    setError("");
    try { await onSave(title.trim()); onClose(); }
    catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được thay đổi.");
    } finally { submitting.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="image-action-dialog" aria-labelledby="image-action-title"
    tabIndex={-1}
    onKeyDown={trapDialogFocus}
    onCancel={(event) => { if (submitting.current) event.preventDefault(); else onClose(); }}>
    <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <h2 id="image-action-title">{action === "delete" ? "Xóa hình ảnh?" : "Đổi tên hình ảnh"}</h2>
      {action === "delete" ? <>
        <PrivateImage src={image.contentUrl} title={image.title} className="image-action-dialog__preview" />
        <p className="image-action-dialog__title">{image.title}</p>
        <p>Ảnh sẽ bị ẩn khỏi thư viện. Lịch sử tạo vẫn được giữ; file trong kho ảnh được xử lý riêng.</p>
      </> : <>
        <label htmlFor="image-title">Tên hình ảnh</label>
        <input id="image-title" autoFocus value={title} disabled={busy}
          aria-invalid={Boolean(error)} aria-describedby={error ? "image-action-error" : undefined}
          onChange={(event) => { setTitle(event.target.value); setError(""); }} />
      </>}
      {error && <p id="image-action-error" role="alert">{error}</p>}
      <div className="image-action-dialog__actions">
        <button type="button" className="studio-button studio-button--subtle" autoFocus={action === "delete"}
          disabled={busy} onClick={onClose}>Hủy</button>
        <button className="studio-button studio-button--primary" disabled={busy}>
          {busy ? "Đang lưu…" : action === "delete" ? "Xác nhận xóa" : "Lưu"}
        </button>
      </div>
    </form>
  </dialog>;
}
