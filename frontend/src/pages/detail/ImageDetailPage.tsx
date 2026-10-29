import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/ui/Icon';
import ReferenceArtwork from '../../components/dashboard/ReferenceArtwork';
import type { LibraryImage } from '../library/libraryDemoData';
import { libraryDemoImages } from '../library/libraryDemoData';
import './ImageDetailPage.css';

type DetailState = 'ready' | 'loading' | 'error' | 'not_found' | 'deleted';
type DialogName = 'rename' | 'delete' | null;
type Props = { fixtureKey: string };

function getBackHref() {
  const query = new URLSearchParams(window.location.search);
  if (query.get('from') !== 'library') return '/app/library';
  const page = Number(query.get('page'));
  return `/app/library?page=${Number.isInteger(page) && page > 0 ? page : 1}`;
}

function StatusPanel({ state, backHref, onRetry }: { state: Exclude<DetailState, 'ready'>; backHref: string; onRetry: () => void }) {
  const copy = {
    loading: { title: 'Đang tải chi tiết ảnh', body: 'Đang chuẩn bị dữ liệu xem trước.' },
    error: { title: 'Không thể tải chi tiết ảnh', body: 'Đã xảy ra lỗi khi tải metadata minh họa.' },
    not_found: { title: 'Không tìm thấy hình ảnh', body: 'Hình ảnh này không tồn tại trong bộ dữ liệu minh họa hiện tại.' },
    deleted: { title: 'Hình ảnh đã được xóa', body: 'Ảnh chỉ vừa được xóa khỏi phiên xem trước này; không có file thật bị xóa.' },
  }[state];
  return <section className={`detail-state detail-state--${state}`} aria-labelledby="detail-state-title" role="status"><span className="detail-state__icon"><Icon name={state === 'error' ? 'info' : state === 'deleted' ? 'close' : 'image'} size={25} /></span><h1 id="detail-state-title">{copy.title}</h1><p>{copy.body}</p>{state === 'error' && <button type="button" className="studio-button studio-button--subtle" onClick={onRetry}><Icon name="history" size={16} />Thử lại trạng thái</button>}<a className="studio-button studio-button--primary" href={backHref}><Icon name="arrow" size={16} />Quay lại thư viện</a></section>;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return <div className="detail-meta__item"><dt>{label}</dt><dd>{value}</dd></div>;
}

export default function ImageDetailPage({ fixtureKey }: Props) {
  const initialImage = libraryDemoImages.find((image) => image.fixtureKey === fixtureKey) ?? null;
  const [image, setImage] = useState<LibraryImage | null>(initialImage);
  const [state, setState] = useState<DetailState>(initialImage ? 'ready' : 'not_found');
  const [dialog, setDialog] = useState<DialogName>(null);
  const [renameValue, setRenameValue] = useState(initialImage?.title ?? '');
  const [renameError, setRenameError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const renameDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const lightboxDialog = useRef<HTMLDialogElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const backHref = getBackHref();

  const setDetailState = (nextState: DetailState) => {
    if (nextState === 'ready' && !image && initialImage) setImage(initialImage);
    setState(nextState);
  };

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
    if (lightboxOpen && lightboxDialog.current && !lightboxDialog.current.open) lightboxDialog.current.showModal();
    if (!lightboxOpen && lightboxDialog.current?.open) lightboxDialog.current.close();
  }, [lightboxOpen]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 3600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const closeDialog = () => {
    setDialog(null);
    setRenameError('');
    requestAnimationFrame(() => lastTrigger.current?.focus());
  };

  const copyPrompt = async () => {
    if (!image) return;
    try {
      await navigator.clipboard.writeText(image.prompt);
      setFeedback('Đã sao chép mô tả minh họa.');
    } catch {
      setFeedback('Chưa thể sao chép tự động; hãy chọn và sao chép mô tả thủ công.');
    }
  };

  const reusePrompt = () => {
    if (!image) return;
    window.location.assign(`/app/create?prompt=${encodeURIComponent(image.prompt)}`);
  };

  const saveRename = () => {
    if (!image) return;
    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      setRenameError('Tên hình ảnh không được để trống.');
      return;
    }
    if (nextTitle === image.title) {
      setRenameError('Hãy nhập tên mới trước khi lưu.');
      return;
    }
    setImage((current) => current ? { ...current, title: nextTitle } : current);
    setFeedback('Đã đổi tên ảnh minh họa trong phiên xem trước. Thay đổi chưa được lưu trên server.');
    closeDialog();
  };

  const deleteImage = () => {
    setDialog(null);
    setState('deleted');
    setImage(null);
    setFeedback('Đã xóa khỏi dữ liệu minh họa. Không có file hoặc bản ghi thật bị xóa.');
  };

  if (state !== 'ready' || !image) {
    return <DashboardLayout search="" onSearch={() => undefined} favoritesOnly={false} onFavorites={() => undefined} onCompose={() => undefined} activeItem="library" showSearch={false}><div className="detail-page"><nav className="detail-breadcrumb" aria-label="Đường dẫn"><a href={backHref}>Thư viện của tôi</a><Icon name="chevron" size={14} /><span>Chi tiết ảnh</span></nav>{state === 'loading' && <StatusPanel state={state} backHref={backHref} onRetry={() => setDetailState(initialImage ? 'ready' : 'not_found')} />}{state === 'error' && <StatusPanel state={state} backHref={backHref} onRetry={() => setDetailState(initialImage ? 'ready' : 'not_found')} />}{state === 'not_found' && <StatusPanel state={state} backHref={backHref} onRetry={() => setDetailState('not_found')} />}{state === 'deleted' && <StatusPanel state={state} backHref={backHref} onRetry={() => setDetailState('not_found')} />}</div>{import.meta.env.DEV && <DetailDevStates onState={setDetailState} />}</DashboardLayout>;
  }

  return <DashboardLayout search="" onSearch={() => undefined} favoritesOnly={false} onFavorites={() => undefined} onCompose={() => undefined} activeItem="library" showSearch={false}>
    <div className="detail-page">
      <nav className="detail-breadcrumb" aria-label="Đường dẫn"><a href={backHref}><Icon name="arrow" size={14} />Thư viện của tôi</a><Icon name="chevron" size={14} /><span>{image.title}</span></nav>
      <div className="detail-demo-banner" role="note"><Icon name="info" size={16} /><p><strong>Ảnh minh họa · Chế độ xem trước</strong><span>Đây là fixture cục bộ, chưa phải ảnh thật đã lưu của tài khoản.</span></p></div>
      <div className="detail-layout">
        <section className="detail-art-panel" aria-labelledby="detail-art-title"><div className="detail-panel-heading"><div><span className="section-eyebrow">IMAGE PREVIEW</span><h1 id="detail-art-title">{image.title}</h1></div><button type="button" className="studio-icon-button" onClick={() => setLightboxOpen(true)} aria-label="Mở ảnh minh họa toàn màn hình"><Icon name="grid" size={17} /></button></div><button type="button" className="detail-art-button" onClick={() => setLightboxOpen(true)} aria-label={`Phóng to ${image.title}`}><ReferenceArtwork region={image.region} label={`Ảnh minh họa: ${image.title}`} className="detail-art" loading="eager" /></button><p className="detail-art-caption"><Icon name="image" size={14} />Ảnh minh họa · Không áp dụng filter lên artwork</p></section>
        <aside className="detail-info-panel" aria-labelledby="detail-info-title"><div className="detail-panel-heading"><div><span className="section-eyebrow">IMAGE DETAILS</span><h2 id="detail-info-title">Thông tin hình ảnh</h2></div><span className="detail-demo-badge">DEMO</span></div><div className="detail-title-block"><h3>{image.title}</h3><span>{image.category}</span></div><section className="detail-prompt" aria-labelledby="detail-prompt-title"><div className="detail-subheading"><h3 id="detail-prompt-title">Mô tả gốc</h3><span>DEMO PROMPT</span></div><p>{image.prompt}</p></section><dl className="detail-meta"><MetaItem label="Model" value={image.modelLabel} /><MetaItem label="Thời điểm" value={image.createdAtLabel} /><MetaItem label="Kích thước" value="Chưa có dữ liệu thật" /><MetaItem label="Định dạng" value="Chưa có dữ liệu thật" /><MetaItem label="Dung lượng" value="Chưa có dữ liệu thật" /></dl><div className="detail-actions"><button type="button" className="studio-button studio-button--primary" onClick={() => setFeedback('Chưa có file gốc để tải; download endpoint chưa được kết nối.')}><Icon name="arrow" size={16} />Tải ảnh</button><button type="button" className="studio-button studio-button--subtle" onClick={copyPrompt}><Icon name="copy" size={16} />Sao chép mô tả</button><button type="button" className="studio-button studio-button--subtle" onClick={reusePrompt}><Icon name="wand" size={16} />Dùng lại mô tả</button><div className="detail-actions__secondary"><button type="button" className="studio-button studio-button--subtle" onClick={(event) => { lastTrigger.current = event.currentTarget; setRenameValue(image.title); setRenameError(''); setDialog('rename'); }}><Icon name="wand" size={15} />Đổi tên</button><button type="button" className="studio-button detail-button--danger" onClick={(event) => { lastTrigger.current = event.currentTarget; setDialog('delete'); }}><Icon name="close" size={15} />Xóa</button></div></div></aside>
      </div>
      {feedback && <div className="detail-toast" role="status" aria-live="polite"><Icon name="check" size={16} />{feedback}</div>}
    </div>
    <dialog className="detail-dialog detail-dialog--lightbox" ref={lightboxDialog} aria-label={`Ảnh minh họa ${image.title}`} onCancel={() => setLightboxOpen(false)} onClose={() => setLightboxOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setLightboxOpen(false); }}><button type="button" className="studio-icon-button detail-dialog__close" aria-label="Đóng ảnh toàn màn hình" onClick={() => setLightboxOpen(false)}><Icon name="close" /></button><ReferenceArtwork region={image.region} label={`Ảnh minh họa phóng to: ${image.title}`} className="detail-lightbox__art" loading="eager" /></dialog>
    <dialog className="detail-dialog" ref={renameDialog} aria-labelledby="detail-rename-title" onCancel={closeDialog} onClose={closeDialog} onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>{<form method="dialog" onSubmit={(event) => { event.preventDefault(); saveRename(); }}><div className="detail-dialog__header"><div><span className="section-eyebrow">DEMO ACTION</span><h2 id="detail-rename-title">Đổi tên hình ảnh</h2></div><button type="button" className="studio-icon-button" aria-label="Đóng dialog đổi tên" onClick={closeDialog}><Icon name="close" /></button></div><label htmlFor="detail-rename-input">Tên hình ảnh</label><input ref={renameInput} id="detail-rename-input" value={renameValue} onChange={(event) => { setRenameValue(event.target.value); setRenameError(''); }} aria-invalid={Boolean(renameError)} aria-describedby={renameError ? 'detail-rename-error' : 'detail-rename-note'} />{renameError ? <p className="detail-dialog__error" id="detail-rename-error" role="alert">{renameError}</p> : <p className="detail-dialog__note" id="detail-rename-note">Thay đổi chỉ tồn tại trong phiên xem trước này.</p>}<div className="detail-dialog__actions"><button type="button" className="studio-button studio-button--subtle" onClick={closeDialog}>Hủy</button><button type="submit" className="studio-button studio-button--primary">Lưu thay đổi</button></div></form>}</dialog>
    <dialog className="detail-dialog" ref={deleteDialog} aria-labelledby="detail-delete-title" onCancel={closeDialog} onClose={closeDialog} onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>{<div><div className="detail-dialog__header"><div><span className="section-eyebrow">DEMO ACTION</span><h2 id="detail-delete-title">Xóa hình ảnh?</h2></div><button type="button" className="studio-icon-button" aria-label="Đóng dialog xóa" onClick={closeDialog}><Icon name="close" /></button></div><p className="detail-dialog__description">Bạn có chắc chắn muốn xóa hình ảnh này khỏi thư viện?</p><p className="detail-dialog__note">Chỉ xóa khỏi dữ liệu minh họa trong phiên này, không xóa file thật.</p><div className="detail-dialog__actions"><button type="button" className="studio-button studio-button--subtle" onClick={closeDialog}>Hủy</button><button type="button" className="studio-button detail-button--danger" onClick={deleteImage}><Icon name="close" size={15} />Xóa minh họa</button></div></div>}</dialog>
    {import.meta.env.DEV && <DetailDevStates onState={setDetailState} />}
  </DashboardLayout>;
}

function DetailDevStates({ onState }: { onState: (state: DetailState) => void }) {
  return <details className="detail-dev-states"><summary>DEV · Xem trạng thái chi tiết</summary><div><button type="button" onClick={() => onState('ready')}>Ready</button><button type="button" onClick={() => onState('loading')}>Loading</button><button type="button" onClick={() => onState('error')}>Error</button><button type="button" onClick={() => onState('not_found')}>Not found</button><button type="button" onClick={() => onState('deleted')}>Deleted</button></div></details>;
}
