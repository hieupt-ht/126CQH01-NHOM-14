import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/ui/Icon';
import ReferenceArtwork from '../../components/dashboard/ReferenceArtwork';
import ImageCard, { type ImageCardAction } from '../../components/library/ImageCard';
import type { LibraryImage } from './libraryDemoData';
import { libraryDemoImages } from './libraryDemoData';
import './LibraryPage.css';

const PAGE_SIZE = 20;
type LibraryView = 'gallery' | 'loading' | 'empty' | 'error';
type DialogName = 'rename' | 'delete' | null;

function LibrarySkeleton() {
  return <div className="library-grid library-grid--skeleton" aria-label="Đang tải dữ liệu minh họa" aria-busy="true">{Array.from({ length: 8 }, (_, index) => <div className="library-skeleton-card" key={index}><span /><div><span /><span /></div></div>)}</div>;
}

function EmptyState() {
  return <section className="library-state library-state--empty" aria-labelledby="library-empty-title"><span className="library-state__icon"><Icon name="image" size={25} /></span><h2 id="library-empty-title">Bạn chưa có hình ảnh nào</h2><p>Hãy bắt đầu tạo hình ảnh AI đầu tiên của bạn.</p><a className="studio-button studio-button--primary" href="/app/create"><Icon name="sparkles" size={16} />Tạo ảnh đầu tiên<Icon name="arrow" size={16} /></a></section>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <section className="library-state library-state--error" aria-labelledby="library-error-title"><span className="library-state__icon"><Icon name="info" size={25} /></span><h2 id="library-error-title">Không thể tải thư viện</h2><p>Đã xảy ra lỗi khi tải danh sách hình ảnh minh họa.</p><button type="button" className="studio-button studio-button--subtle" onClick={onRetry}><Icon name="history" size={16} />Thử lại</button><small>Đây chỉ là trạng thái xem trước; chưa gọi API.</small></section>;
}

function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return <nav className="library-pagination" aria-label="Phân trang thư viện"><button type="button" className="studio-button studio-button--subtle" disabled={page === 1} onClick={() => onPage(page - 1)}><Icon name="arrow" size={15} />Trang trước</button><span>Trang {page} / {pageCount}</span><button type="button" className="studio-button studio-button--subtle" disabled={page === pageCount} onClick={() => onPage(page + 1)}>Trang sau<Icon name="arrow" size={15} /></button></nav>;
}

export default function LibraryPage() {
  const [images, setImages] = useState<LibraryImage[]>(libraryDemoImages);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<LibraryView>('gallery');
  const [brokenKey, setBrokenKey] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const renameDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);
  const lastActionTrigger = useRef<HTMLButtonElement | null>(null);

  const pageCount = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const selectedImage = selectedKey ? images.find((image) => image.fixtureKey === selectedKey) ?? null : null;
  const visibleImages = images.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  useEffect(() => {
    const currentDialog = dialog === 'rename' ? renameDialog.current : deleteDialog.current;
    if (dialog && currentDialog && !currentDialog.open) currentDialog.showModal();
    if (!dialog) {
      if (renameDialog.current?.open) renameDialog.current.close();
      if (deleteDialog.current?.open) deleteDialog.current.close();
    }
    if (dialog === 'rename') requestAnimationFrame(() => renameInput.current?.focus());
  }, [dialog]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 3600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const closeDialog = () => {
    setDialog(null);
    setSelectedKey(null);
    setRenameError('');
    requestAnimationFrame(() => lastActionTrigger.current?.focus());
  };

  const handleAction = (action: ImageCardAction, image: LibraryImage, trigger: HTMLButtonElement) => {
    lastActionTrigger.current = trigger;
    setSelectedKey(image.fixtureKey);
    if (action === 'download') {
      setFeedback('Tải ảnh minh họa chưa có file gốc; backend download chưa được kết nối.');
      return;
    }
    if (action === 'rename') {
      setRenameValue(image.title);
      setRenameError('');
      setDialog('rename');
      return;
    }
    if (action === 'delete') setDialog('delete');
  };

  const saveRename = () => {
    if (!selectedImage) return;
    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      setRenameError('Tên hình ảnh không được để trống.');
      return;
    }
    if (nextTitle === selectedImage.title) {
      setRenameError('Hãy nhập tên mới trước khi lưu.');
      return;
    }
    setImages((current) => current.map((image) => image.fixtureKey === selectedImage.fixtureKey ? { ...image, title: nextTitle } : image));
    setFeedback('Đã đổi tên ảnh minh họa trong phiên xem trước. Thay đổi chưa được lưu trên server.');
    closeDialog();
  };

  const confirmDelete = () => {
    if (!selectedImage || deleteSubmitting) return;
    setDeleteSubmitting(true);
    setImages((current) => current.filter((image) => image.fixtureKey !== selectedImage.fixtureKey));
    setFeedback('Đã xóa khỏi dữ liệu minh họa. Không có file hoặc bản ghi thật bị xóa.');
    setDeleteSubmitting(false);
    closeDialog();
  };

  const retryDemo = () => {
    setView('gallery');
    setFeedback('Đã quay lại dữ liệu minh họa; chưa gọi API thư viện.');
  };

  return <DashboardLayout search="" onSearch={() => undefined} favoritesOnly={false} onFavorites={() => undefined} onCompose={() => undefined} activeItem="library" showSearch={false}>
    <div className="library-page">
      <header className="library-header">
        <div><span className="section-eyebrow">MY IMAGE LIBRARY</span><h1>Thư viện của tôi</h1><p>Khám phá và quản lý những hình ảnh bạn đã tạo bằng AI.</p></div>
        <a className="studio-button studio-button--primary" href="/app/create"><Icon name="sparkles" size={16} />Tạo ảnh mới<Icon name="arrow" size={16} /></a>
      </header>
      <div className="library-demo-banner" role="note"><span className="library-demo-banner__icon"><Icon name="info" size={16} /></span><div><strong>Dữ liệu minh họa – Chưa kết nối thư viện thực tế</strong><p>Ảnh và metadata trên trang này chỉ phục vụ đánh giá giao diện, không đại diện cho tài khoản hiện tại.</p></div></div>
      <div className="library-toolbar"><div><h2>Ảnh đã tạo</h2><span>{images.length} ảnh minh họa · {PAGE_SIZE} ảnh / trang</span></div><span className="library-toolbar__scope"><span className="status-dot" />Chỉ dữ liệu minh họa</span></div>
      {view === 'loading' && <LibrarySkeleton />}
      {view === 'empty' && <EmptyState />}
      {view === 'error' && <ErrorState onRetry={retryDemo} />}
      {view === 'gallery' && images.length === 0 && <EmptyState />}
      {view === 'gallery' && images.length > 0 && <><div className="library-grid">{visibleImages.map((image) => <ImageCard key={image.fixtureKey} image={image} imageUnavailable={brokenKey === image.fixtureKey} onAction={handleAction} />)}</div><Pagination page={page} pageCount={pageCount} onPage={setPage} /></>}
      {feedback && <div className="library-toast" role="status" aria-live="polite"><Icon name="check" size={16} />{feedback}</div>}
    </div>
    <dialog className="library-dialog" ref={renameDialog} aria-labelledby="rename-dialog-title" onCancel={closeDialog} onClose={closeDialog} onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      {selectedImage && <form method="dialog" onSubmit={(event) => { event.preventDefault(); saveRename(); }}><div className="library-dialog__header"><div><span className="section-eyebrow">DEMO ACTION</span><h2 id="rename-dialog-title">Đổi tên hình ảnh</h2></div><button type="button" className="studio-icon-button" aria-label="Đóng dialog đổi tên" onClick={closeDialog}><Icon name="close" /></button></div><label htmlFor="rename-image-title">Tên hình ảnh</label><input ref={renameInput} id="rename-image-title" value={renameValue} onChange={(event) => { setRenameValue(event.target.value); setRenameError(''); }} aria-invalid={Boolean(renameError)} aria-describedby={renameError ? 'rename-image-error' : 'rename-image-note'} />{renameError ? <p className="library-dialog__error" id="rename-image-error" role="alert">{renameError}</p> : <p className="library-dialog__note" id="rename-image-note">Thay đổi chỉ tồn tại trong phiên xem trước này.</p>}<div className="library-dialog__actions"><button type="button" className="studio-button studio-button--subtle" onClick={closeDialog}>Hủy</button><button type="submit" className="studio-button studio-button--primary">Lưu thay đổi</button></div></form>}
    </dialog>
    <dialog className="library-dialog library-dialog--delete" ref={deleteDialog} aria-labelledby="delete-dialog-title" onCancel={closeDialog} onClose={closeDialog} onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      {selectedImage && <div><div className="library-dialog__header"><div><span className="section-eyebrow">DEMO ACTION</span><h2 id="delete-dialog-title">Xóa hình ảnh?</h2></div><button type="button" className="studio-icon-button" aria-label="Đóng dialog xóa" onClick={closeDialog}><Icon name="close" /></button></div><div className="library-delete-preview"><ReferenceArtwork region={selectedImage.region} label={`Ảnh minh họa cần xóa: ${selectedImage.title}`} className="library-delete-preview__thumb" loading="lazy" /><strong>{selectedImage.title}</strong></div><p className="library-dialog__description">Bạn có chắc chắn muốn xóa hình ảnh này khỏi thư viện?</p><p className="library-dialog__note">Chỉ xóa khỏi dữ liệu minh họa trong phiên này, không xóa file thật.</p><div className="library-dialog__actions"><button type="button" className="studio-button studio-button--subtle" onClick={closeDialog}>Hủy</button><button type="button" className="studio-button library-button--danger" disabled={deleteSubmitting} onClick={confirmDelete}><Icon name="close" size={15} />Xóa minh họa</button></div></div>}
    </dialog>
    {import.meta.env.DEV && <details className="library-dev-states"><summary>DEV · Xem trạng thái thư viện</summary><div><button type="button" onClick={() => setView('gallery')}>Gallery</button><button type="button" onClick={() => setView('loading')}>Loading</button><button type="button" onClick={() => setView('empty')}>Empty</button><button type="button" onClick={() => setView('error')}>Error</button><button type="button" onClick={() => setBrokenKey((current) => current ? null : images[0]?.fixtureKey ?? null)}>Broken thumbnail</button></div></details>}
  </DashboardLayout>;
}
