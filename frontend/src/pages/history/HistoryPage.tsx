import { useEffect, useRef, useState, type RefObject } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon, { type IconName } from '../../components/ui/Icon';
import { libraryDemoImages } from '../library/libraryDemoData';
import { historyDemoItems, type GenerationHistoryItem, type GenerationStatus } from './historyDemoData';
import './HistoryPage.css';

type HistoryView = 'gallery' | 'loading' | 'empty' | 'error';

const statusMeta: Record<GenerationStatus, { label: string; icon: IconName; message: string }> = {
  queued: { label: 'Đang chờ', icon: 'history', message: 'Yêu cầu đang chờ được xử lý.' },
  processing: { label: 'Đang tạo', icon: 'sparkles', message: 'AI đang xử lý yêu cầu tạo ảnh.' },
  saving: { label: 'Đang lưu', icon: 'image', message: 'Đang lưu kết quả tạo ảnh.' },
  succeeded: { label: 'Thành công', icon: 'check', message: 'Tạo ảnh thành công.' },
  failed: { label: 'Thất bại', icon: 'info', message: 'Yêu cầu chưa hoàn tất.' },
  needs_review: { label: 'Cần kiểm tra', icon: 'history', message: 'Chưa xác định được kết quả tạo ảnh. Vui lòng kiểm tra lại sau.' },
};

function StatusBadge({ status }: { status: GenerationStatus }) {
  const meta = statusMeta[status];
  return <span className={`history-status history-status--${status}`} role="status"><Icon name={meta.icon} size={14} />{meta.label}</span>;
}

function DemoBanner() {
  return <div className="history-demo-banner" role="note"><span className="history-demo-banner__icon"><Icon name="info" size={16} /></span><div><strong>Dữ liệu minh họa – Chưa kết nối lịch sử thực tế</strong><p>Các job trên trang này là fixture cục bộ để kiểm tra giao diện, không phải yêu cầu đã gửi đến AI provider.</p></div></div>;
}

function HistoryLoading() {
  return <div className="history-table-skeleton" aria-label="Đang tải lịch sử minh họa" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <div key={index}><span /><span /><span /><span /><span /></div>)}</div>;
}

function HistoryState({ type, onRetry }: { type: 'empty' | 'error'; onRetry: () => void }) {
  const empty = type === 'empty';
  return <section className={`history-state history-state--${type}`} aria-labelledby="history-state-title"><span className="history-state__icon"><Icon name={empty ? 'history' : 'info'} size={25} /></span><h2 id="history-state-title">{empty ? 'Chưa có lịch sử tạo ảnh' : 'Không thể tải lịch sử tạo ảnh'}</h2><p>{empty ? 'Các lần yêu cầu tạo ảnh của bạn sẽ xuất hiện tại đây.' : 'Đã xảy ra lỗi khi tải danh sách lịch sử minh họa.'}</p>{empty ? <a className="studio-button studio-button--primary" href="/app/create"><Icon name="sparkles" size={16} />Tạo ảnh đầu tiên<Icon name="arrow" size={16} /></a> : <><button type="button" className="studio-button studio-button--subtle" onClick={onRetry}><Icon name="history" size={16} />Thử lại</button><small>Đây chỉ là trạng thái xem trước; chưa gọi API.</small></>}</section>;
}

function HistoryTable({ items, onOpen }: { items: GenerationHistoryItem[]; onOpen: (job: GenerationHistoryItem, trigger: HTMLButtonElement) => void }) {
  return <div className="history-table-wrap"><table className="history-table"><caption className="sr-only">Lịch sử các lần tạo ảnh minh họa</caption><thead><tr><th scope="col">Mô tả</th><th scope="col">Trạng thái</th><th scope="col">Thời điểm</th><th scope="col">Thời gian xử lý</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{items.map((job) => <tr key={job.demoKey}><td><button type="button" className="history-prompt-button" onClick={(event) => onOpen(job, event.currentTarget)}>{job.prompt}</button><span className="history-row__fixture">Fixture minh họa · Không phải job thật</span></td><td><StatusBadge status={job.status} /></td><td className="history-table__muted">{job.createdAtLabel}</td><td className="history-table__muted">{job.durationLabel}</td><td><button type="button" className="history-row-action" onClick={(event) => onOpen(job, event.currentTarget)}>Chi tiết<Icon name="arrow" size={14} /></button></td></tr>)}</tbody></table></div>;
}

function HistoryCards({ items, onOpen }: { items: GenerationHistoryItem[]; onOpen: (job: GenerationHistoryItem, trigger: HTMLButtonElement) => void }) {
  return <div className="history-cards">{items.map((job) => <article className="history-card" key={job.demoKey}><div className="history-card__top"><StatusBadge status={job.status} /><span>Fixture minh họa</span></div><button type="button" className="history-card__prompt" onClick={(event) => onOpen(job, event.currentTarget)}>{job.prompt}</button><dl><div><dt>Thời điểm</dt><dd>{job.createdAtLabel}</dd></div><div><dt>Thời gian xử lý</dt><dd>{job.durationLabel}</dd></div></dl><button type="button" className="studio-button studio-button--subtle history-card__detail" onClick={(event) => onOpen(job, event.currentTarget)}>Xem chi tiết<Icon name="arrow" size={14} /></button></article>)}</div>;
}

function Metadata({ job }: { job: GenerationHistoryItem }) {
  return <dl className="history-drawer__metadata"><div><dt>Model</dt><dd>{job.modelLabel}</dd></div><div><dt>Thời gian yêu cầu</dt><dd>{job.createdAtLabel}</dd></div><div><dt>Thời gian bắt đầu</dt><dd>{job.startedAtLabel}</dd></div><div><dt>Thời gian hoàn thành</dt><dd>{job.finishedAtLabel}</dd></div><div><dt>Thời gian xử lý</dt><dd>{job.durationLabel}</dd></div><div><dt>Trạng thái</dt><dd><StatusBadge status={job.status} /></dd></div></dl>;
}

function HistoryDrawer({ job, drawerRef, onClose, onReuse, onCopy }: { job: GenerationHistoryItem; drawerRef: RefObject<HTMLDialogElement | null>; onClose: () => void; onReuse: () => void; onCopy: () => void }) {
  const linkedImage = job.imageFixtureKey ? libraryDemoImages.find((image) => image.fixtureKey === job.imageFixtureKey) : null;
  const canViewImage = Boolean(linkedImage && !job.imageDeleted);
  return <dialog ref={drawerRef} className="history-drawer" aria-labelledby="history-drawer-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="history-drawer__header"><div><span className="section-eyebrow">GENERATION DETAIL</span><h2 id="history-drawer-title">Lần tạo ảnh</h2></div><button type="button" className="studio-icon-button" aria-label="Đóng chi tiết lần tạo ảnh" onClick={onClose}><Icon name="close" /></button></div><div className="history-drawer__status"><StatusBadge status={job.status} /><span>Fixture minh họa · Không phải job thật</span></div><section className="history-drawer__status-message" aria-live="polite"><Icon name={statusMeta[job.status].icon} size={17} /><p>{statusMeta[job.status].message}<small>{job.status === 'needs_review' ? 'Không tự động thử lại hoặc tạo job mới.' : job.status === 'queued' || job.status === 'processing' || job.status === 'saving' ? 'Cập nhật trực tiếp sẽ do backend cung cấp; bản demo không polling.' : ''}</small></p></section><section className="history-drawer__prompt" aria-labelledby="history-prompt-title"><div className="history-drawer__section-heading"><h3 id="history-prompt-title">Mô tả gốc</h3><button type="button" className="history-copy-button" onClick={onCopy}><Icon name="copy" size={14} />Sao chép</button></div><p>{job.prompt}</p></section><Metadata job={job} />{job.status === 'failed' && <div className="history-drawer__error" role="alert"><Icon name="info" size={16} /><p><strong>Thông tin lỗi</strong><span>{job.errorMessage ?? 'Chưa có thông tin lỗi an toàn.'}</span></p></div>}{job.status === 'succeeded' && <section className="history-drawer__image-link" aria-label="Ảnh liên kết">{job.imageDeleted ? <><Icon name="close" size={17} /><p><strong>Ảnh đã bị xóa khỏi thư viện.</strong><span>Lịch sử tạo vẫn được giữ lại.</span></p></> : canViewImage && linkedImage ? <><Icon name="image" size={17} /><p><strong>Ảnh đã lưu trong bản minh họa.</strong><span>{linkedImage.title}</span></p><a className="studio-button studio-button--subtle" href={`/app/images/${encodeURIComponent(linkedImage.fixtureKey)}?from=history`}>Xem ảnh<Icon name="arrow" size={14} /></a></> : <><Icon name="image" size={17} /><p><strong>Chưa có ảnh liên kết.</strong><span>Chỉ mở ảnh khi có reference hợp lệ.</span></p></>}</section>}{job.status === 'failed' && <button type="button" className="studio-button studio-button--primary history-drawer__reuse" onClick={onReuse}><Icon name="wand" size={16} />Dùng lại mô tả<Icon name="arrow" size={16} /></button>}</dialog>;
}

function HistoryDevStates({ onView }: { onView: (view: HistoryView) => void }) {
  return <details className="history-dev-states"><summary>DEV · Xem trạng thái lịch sử</summary><div><button type="button" onClick={() => onView('gallery')}>Gallery</button><button type="button" onClick={() => onView('loading')}>Loading</button><button type="button" onClick={() => onView('empty')}>Empty</button><button type="button" onClick={() => onView('error')}>Error</button></div></details>;
}

export default function HistoryPage() {
  const [view, setView] = useState<HistoryView>('gallery');
  const [selectedJob, setSelectedJob] = useState<GenerationHistoryItem | null>(null);
  const [feedback, setFeedback] = useState('');
  const drawer = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (selectedJob && drawer.current && !drawer.current.open) drawer.current.showModal();
    if (selectedJob) requestAnimationFrame(() => drawer.current?.querySelector<HTMLButtonElement>('button')?.focus());
    if (!selectedJob) {
      if (drawer.current?.open) drawer.current.close();
      window.setTimeout(() => lastTrigger.current?.focus(), 0);
    }
  }, [selectedJob]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 3600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const closeDrawer = () => {
    setSelectedJob(null);
    window.setTimeout(() => lastTrigger.current?.focus(), 0);
  };

  const openDrawer = (job: GenerationHistoryItem, trigger: HTMLButtonElement) => {
    lastTrigger.current = trigger;
    setSelectedJob(job);
  };

  const copyPrompt = async () => {
    if (!selectedJob) return;
    try {
      await navigator.clipboard.writeText(selectedJob.prompt);
      setFeedback('Đã sao chép mô tả minh họa.');
    } catch {
      setFeedback('Chưa thể sao chép tự động; hãy chọn và sao chép mô tả thủ công.');
    }
  };

  const reusePrompt = () => {
    if (!selectedJob) return;
    window.location.assign(`/app/create?prompt=${encodeURIComponent(selectedJob.prompt)}`);
  };

  return <DashboardLayout search="" onSearch={() => undefined} favoritesOnly={false} onFavorites={() => undefined} onCompose={() => undefined} activeItem="history" showSearch={false}>
    <div className="history-page">
      <header className="history-header"><div><span className="section-eyebrow">GENERATION HISTORY</span><h1>Lịch sử tạo ảnh</h1><p>Xem lại các lần tạo ảnh và theo dõi trạng thái xử lý của bạn.</p></div><a className="studio-button studio-button--primary" href="/app/create"><Icon name="sparkles" size={16} />Tạo ảnh mới<Icon name="arrow" size={16} /></a></header>
      <DemoBanner />
      <div className="history-toolbar"><div><h2>Các lần yêu cầu</h2><span>{historyDemoItems.length} fixture · Bao gồm cả job chưa hoàn tất</span></div><span className="history-toolbar__scope"><span className="status-dot" />Chưa kết nối API</span></div>
      {view === 'loading' && <HistoryLoading />}
      {view === 'empty' && <HistoryState type="empty" onRetry={() => setView('gallery')} />}
      {view === 'error' && <HistoryState type="error" onRetry={() => { setView('gallery'); setFeedback('Đã quay lại dữ liệu minh họa; chưa gọi API lịch sử.'); }} />}
      {view === 'gallery' && <><HistoryTable items={historyDemoItems} onOpen={openDrawer} /><HistoryCards items={historyDemoItems} onOpen={openDrawer} /></>}
      {feedback && <div className="history-toast" role="status" aria-live="polite"><Icon name="check" size={16} />{feedback}</div>}
    </div>
    {selectedJob && <HistoryDrawer job={selectedJob} drawerRef={drawer} onClose={closeDrawer} onReuse={reusePrompt} onCopy={copyPrompt} />}
    {import.meta.env.DEV && <HistoryDevStates onView={setView} />}
  </DashboardLayout>;
}
