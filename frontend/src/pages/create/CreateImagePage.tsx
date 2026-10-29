import { useEffect, useRef, useState, type RefObject } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/ui/Icon';
import ReferenceArtwork from '../../components/dashboard/ReferenceArtwork';
import { demoArtworks, type DemoArtwork } from '../dashboard/dashboardData';
import './CreateImagePage.css';

type GenerationState = 'idle' | 'queued' | 'processing' | 'saving' | 'succeeded' | 'failed' | 'needs_review' | 'status_error';

const promptExamples = [
  'Một con mèo cam ngồi cạnh cửa sổ, nắng buổi sáng, phong cách màu nước.',
  'Thành phố tương lai trong đêm mưa, ánh đèn neon xanh tím phản chiếu trên mặt đường, điện ảnh.',
  'Một căn nhà gỗ nhỏ giữa rừng thông phủ sương, ánh sáng xanh dịu, phong cách minh họa sách.',
  'Nhân vật phi hành gia đứng trên hành tinh xa lạ, bầu trời đầy tinh vân tím, chi tiết điện ảnh.',
];

const demoResultRegion = { x: 916, y: 617, width: 289, height: 165 };

function normalize(text: string) {
  return text.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

function CreateHero() {
  return <section className="create-hero" aria-labelledby="create-page-title">
    <div className="create-hero__copy">
      <span className="section-eyebrow">AI IMAGE STUDIO</span>
      <h1 id="create-page-title">Biến ý tưởng của bạn<br /><span>thành hình ảnh.</span></h1>
      <p>Mô tả điều bạn đang hình dung. FLUX STUDIO sẽ giúp bạn bắt đầu từ một khung hình đầy cảm hứng.</p>
    </div>
    <ReferenceArtwork region={{ x: 788, y: 72, width: 391, height: 283 }} label="Ảnh minh họa không gian sáng tạo AI" className="create-hero__art" loading="eager" />
    <span className="create-hero__orb create-hero__orb--one" aria-hidden="true" />
    <span className="create-hero__orb create-hero__orb--two" aria-hidden="true" />
  </section>;
}

function PromptEditor({
  prompt,
  onPrompt,
  inputRef,
  onExamples,
  error,
}: {
  prompt: string;
  onPrompt: (value: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onExamples: () => void;
  error: string;
}) {
  return <section className="create-card create-prompt" aria-labelledby="prompt-title">
    <div className="create-card__heading">
      <div>
        <span className="create-card__icon"><Icon name="wand" size={17} /></span>
        <div><h2 id="prompt-title">Bạn muốn tạo hình ảnh gì?</h2><p>Hãy mô tả rõ chủ thể, bối cảnh, ánh sáng hoặc phong cách bạn muốn thử.</p></div>
      </div>
      <span className="create-card__label">PROMPT</span>
    </div>
    <label className="sr-only" htmlFor="create-prompt">Mô tả hình ảnh muốn tạo</label>
    <textarea
      ref={inputRef}
      id="create-prompt"
      value={prompt}
      onChange={(event) => onPrompt(event.target.value)}
      placeholder="Ví dụ: Một căn phòng tối giản với cửa sổ lớn nhìn ra cực quang, ánh sáng xanh tím dịu..."
      aria-describedby={error ? 'create-prompt-error' : 'create-prompt-note'}
      aria-invalid={Boolean(error)}
      rows={6}
    />
    <div className="create-prompt__footer">
      <button type="button" className="studio-button studio-button--subtle create-example-button" onClick={onExamples}>
        <Icon name="book" size={15} />Ví dụ
      </button>
      <span className="create-prompt__count">{prompt.length} ký tự</span>
    </div>
    {error ? <p className="create-message create-message--error" id="create-prompt-error" role="alert"><Icon name="info" size={15} />{error}</p> : <p className="create-prompt__note" id="create-prompt-note"><Icon name="info" size={14} />Mô tả của bạn sẽ được gửi đến dịch vụ AI khi tính năng tạo ảnh được kết nối.</p>}
  </section>;
}

function GenerationPanel({ state, onGenerate, disabled }: { state: GenerationState; onGenerate: () => void; disabled: boolean }) {
  const busy = state === 'queued' || state === 'processing' || state === 'saving';
  return <aside className="create-card create-generation" aria-labelledby="generation-title">
    <div className="create-card__heading create-generation__heading">
      <div><span className="create-card__icon"><Icon name="sparkles" size={17} /></span><h2 id="generation-title">Thiết lập tạo ảnh</h2></div>
      <span className="create-card__label">DEMO</span>
    </div>
    <p className="create-generation__intro">Thông số tạo ảnh sẽ do backend cung cấp khi kết nối dịch vụ.</p>
    <div className="create-generation__field"><span>Model</span><div className="create-readonly"><Icon name="bolt" size={16} /><strong>Chưa cấu hình</strong><span className="create-readonly__dot" /></div></div>
    <div className="create-generation__facts">
      <div><span>Số lượng</span><strong>1 ảnh / lượt</strong></div>
      <div><span>Lượt còn</span><strong className="create-generation__muted">Chưa kết nối</strong></div>
    </div>
    <div className="create-generation__note"><Icon name="shield" size={17} /><p>Chưa gửi yêu cầu thật. Nút này chỉ xem trước luồng giao diện.</p></div>
    <button type="button" className="studio-button studio-button--primary create-generation__submit" onClick={onGenerate} disabled={disabled} aria-busy={busy}>
      {busy ? <span className="create-spinner" aria-hidden="true" /> : <Icon name="sparkles" size={17} />}
      {busy ? 'Đang xử lý...' : 'Tạo ảnh'}
      {!busy && <Icon name="arrow" size={17} />}
    </button>
    <p className="create-generation__footnote">Mỗi lần tạo chỉ tạo một ảnh.</p>
  </aside>;
}

function StateIcon({ state }: { state: GenerationState }) {
  if (state === 'succeeded') return <Icon name="check" size={18} />;
  if (state === 'failed' || state === 'status_error') return <Icon name="info" size={18} />;
  if (state === 'needs_review') return <Icon name="history" size={18} />;
  return <Icon name="sparkles" size={18} />;
}

function ResultPreview({ state, onReusePrompt, onRetryStatus }: { state: GenerationState; onReusePrompt: () => void; onRetryStatus: () => void }) {
  const copy: Record<GenerationState, { label: string; title: string; body: string }> = {
    idle: { label: 'CHƯA TẠO', title: 'Ảnh của bạn sẽ xuất hiện tại đây', body: 'Bắt đầu bằng một mô tả cụ thể. Kết quả sẽ được hiển thị trong khu vực này.' },
    queued: { label: 'QUEUED', title: 'Đang chờ xử lý', body: 'Yêu cầu minh họa đã được đưa vào hàng đợi giao diện.' },
    processing: { label: 'PROCESSING', title: 'Đang tạo ảnh...', body: 'Đang mô phỏng trạng thái xử lý. Không có phần trăm giả hoặc yêu cầu thật.' },
    saving: { label: 'SAVING', title: 'Đang lưu ảnh...', body: 'Chưa báo hoàn thành cho đến khi backend xác nhận việc lưu ảnh.' },
    succeeded: { label: 'SUCCEEDED · DEMO', title: 'Bản xem trước đã sẵn sàng', body: 'Ảnh dưới đây là artwork minh họa cục bộ, chưa phải ảnh FLUX đã tạo hoặc đã lưu.' },
    failed: { label: 'FAILED', title: 'Không thể hoàn tất yêu cầu minh họa', body: 'Đây là trạng thái lỗi an toàn của bản xem trước. Bạn có thể dùng lại mô tả để thử lại sau.' },
    needs_review: { label: 'NEEDS REVIEW', title: 'Chưa xác định được kết quả tạo ảnh.', body: 'Hãy kiểm tra lịch sử khi backend được kết nối. Không tự động tạo lại yêu cầu.' },
    status_error: { label: 'STATUS ERROR', title: 'Không tải được trạng thái', body: 'Trạng thái hiện chưa có sẵn. Thử tải lại trạng thái sau khi kết nối backend.' },
  };
  const current = copy[state];
  const isProgress = state === 'queued' || state === 'processing' || state === 'saving';
  return <section className={`create-card create-result create-result--${state}`} aria-labelledby="result-heading" aria-live="polite">
    <div className="create-card__heading"><div><span className="create-card__icon"><StateIcon state={state} /></span><div><span className="create-card__label">KẾT QUẢ</span><h2 id="result-heading">Xem trước kết quả</h2></div></div><span className="create-result__state">{current.label}</span></div>
    {state === 'succeeded' ? <div className="create-result__success">
      <ReferenceArtwork region={demoResultRegion} label="Ảnh minh họa kết quả tạo ảnh" className="create-result__art" />
      <span className="create-demo-label"><Icon name="info" size={14} />Ảnh minh họa · Demo UI · Không phải ảnh tạo thật</span>
      <div className="create-result__copy"><h3>{current.title}</h3><p>{current.body}</p></div>
      <div className="create-result__actions"><button type="button" className="studio-button studio-button--subtle" disabled title="Chỉ hoạt động khi backend lưu ảnh"><Icon name="arrow" size={15} />Tải xuống</button><button type="button" className="studio-button studio-button--subtle" disabled title="Chưa có route chi tiết"><Icon name="image" size={15} />Xem chi tiết</button><button type="button" className="studio-button studio-button--subtle" onClick={onReusePrompt}><Icon name="wand" size={15} />Tạo ảnh mới</button></div>
    </div> : <div className={`create-result__empty ${isProgress ? 'create-result__empty--progress' : ''}`}>
      <span className="create-result__empty-icon">{isProgress ? <span className="create-spinner" aria-hidden="true" /> : <StateIcon state={state} />}</span>
      <h3>{current.title}</h3><p>{current.body}</p>
      {state === 'failed' && <button type="button" className="studio-button studio-button--subtle" onClick={onReusePrompt}><Icon name="wand" size={15} />Dùng lại mô tả</button>}
      {state === 'status_error' && <button type="button" className="studio-button studio-button--subtle" onClick={onRetryStatus}><Icon name="history" size={15} />Tải lại trạng thái</button>}
    </div>}
  </section>;
}

function RecentImages({ artworks }: { artworks: DemoArtwork[] }) {
  return <section className="create-recent" aria-labelledby="recent-title">
    <div className="create-section-heading"><div><span className="section-eyebrow">REFERENCE GALLERY</span><h2 id="recent-title">Ảnh gần đây</h2></div><span className="create-section-heading__note">Ảnh minh họa</span></div>
    {artworks.length ? <div className="create-recent__grid">{artworks.slice(0, 4).map((artwork) => <article className="create-recent__item" key={artwork.id}><ReferenceArtwork region={artwork.region} label={`Ảnh minh họa: ${artwork.title}`} className="create-recent__art" /><div className="create-recent__meta"><strong>{artwork.title}</strong><span>Ảnh minh họa · Không phải dữ liệu tài khoản</span></div></article>)}</div> : <div className="create-recent__empty"><Icon name="image" size={20} /><p>Không có ảnh minh họa phù hợp với tìm kiếm.</p></div>}
  </section>;
}

export default function CreateImagePage() {
  const [prompt, setPrompt] = useState(() => new URLSearchParams(window.location.search).get('prompt') ?? '');
  const [search, setSearch] = useState('');
  const [state, setState] = useState<GenerationState>('idle');
  const [promptError, setPromptError] = useState('');
  const [examplesOpen, setExamplesOpen] = useState(false);
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const examplesDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = examplesDialog.current;
    if (!dialog) return;
    if (examplesOpen && !dialog.open) dialog.showModal();
    if (!examplesOpen && dialog.open) dialog.close();
  }, [examplesOpen]);

  useEffect(() => {
    if (state === 'idle' || state === 'succeeded' || state === 'failed' || state === 'needs_review' || state === 'status_error') return;
    const next: Partial<Record<GenerationState, GenerationState>> = { queued: 'processing', processing: 'saving', saving: 'succeeded' };
    const timer = window.setTimeout(() => setState(next[state] ?? 'idle'), state === 'queued' ? 700 : 950);
    return () => window.clearTimeout(timer);
  }, [state]);

  const chooseExample = (value: string) => {
    if (prompt.trim() && !window.confirm('Thay mô tả đang soạn bằng ví dụ này?')) return;
    setPrompt(value);
    setPromptError('');
    setExamplesOpen(false);
    requestAnimationFrame(() => promptInput.current?.focus());
  };

  const generate = () => {
    if (!prompt.trim()) {
      setPromptError('Hãy viết mô tả trước khi tạo ảnh.');
      promptInput.current?.focus();
      return;
    }
    setPromptError('');
    setState('queued');
  };

  const reusePrompt = () => {
    setState('idle');
    requestAnimationFrame(() => promptInput.current?.focus());
  };

  const visibleArtworks = demoArtworks.filter((artwork) => normalize(`${artwork.title} ${artwork.category}`).includes(normalize(search.trim())));
  const busy = state === 'queued' || state === 'processing' || state === 'saving';

  return <DashboardLayout search={search} onSearch={setSearch} favoritesOnly={false} onFavorites={() => undefined} onCompose={() => promptInput.current?.focus()} activeItem="create">
    <div className="create-page">
      <div className="create-page__header"><div><span className="section-eyebrow">WORKSPACE / CREATE</span><p>Tạo ảnh AI</p></div><span className="create-page__status"><span className="status-dot" />Bản xem trước frontend</span></div>
      <CreateHero />
      <div className="create-workspace">
        <PromptEditor prompt={prompt} onPrompt={(value) => { setPrompt(value); setPromptError(''); }} inputRef={promptInput} onExamples={() => setExamplesOpen(true)} error={promptError} />
        <GenerationPanel state={state} onGenerate={generate} disabled={busy} />
      </div>
      <ResultPreview state={state} onReusePrompt={reusePrompt} onRetryStatus={() => setState('idle')} />
      <RecentImages artworks={visibleArtworks} />
    </div>
    <dialog className="create-examples-dialog" ref={examplesDialog} aria-labelledby="examples-title" onCancel={() => setExamplesOpen(false)} onClose={() => setExamplesOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setExamplesOpen(false); }}>
      <div className="create-examples-dialog__header"><div><span className="section-eyebrow">PROMPT LIBRARY</span><h2 id="examples-title">Chọn một ví dụ</h2></div><button type="button" className="studio-icon-button" aria-label="Đóng danh sách ví dụ" onClick={() => setExamplesOpen(false)}><Icon name="close" /></button></div>
      <p className="create-examples-dialog__intro">Ví dụ chỉ điền vào ô mô tả. Bạn vẫn cần tự nhấn “Tạo ảnh”.</p>
      <div className="create-examples-dialog__list">{promptExamples.map((example, index) => <button type="button" key={example} className="create-example-card" onClick={() => chooseExample(example)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{example}</strong><Icon name="arrow" size={16} /></button>)}</div>
    </dialog>
    {import.meta.env.DEV && <details className="create-dev-states"><summary>DEV · Xem trạng thái minh họa</summary><div>{(['idle', 'queued', 'processing', 'saving', 'succeeded', 'failed', 'needs_review', 'status_error'] as GenerationState[]).map((option) => <button type="button" key={option} onClick={() => setState(option)}>{option}</button>)}</div></details>}
  </DashboardLayout>;
}
