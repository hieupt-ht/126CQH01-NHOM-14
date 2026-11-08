import { useEffect, useRef, useState, type ClipboardEvent, type RefObject } from "react";
import { aspectOptions, styleOptions, type AspectRatio, type ImageStyle } from "../../domain/generationOptions";
import StylePicker, { StyleArtwork } from "../../components/create/StylePicker";
import DashboardLayout from "../../layouts/DashboardLayout";
import Icon from "../../components/ui/Icon";
import StudioHero from "../../components/dashboard/StudioHero";
import { MAX_PROMPT_LENGTH, validatePrompt } from "../../domain/prompt";
import "./CreateImagePage.css";
import {
  restorePending,
  persistPending,
  clearPending,
  type PendingGeneration,
} from "../../services/pendingGeneration";
import { api, ApiError, type UserProfile } from "../../services/api";
import { UI_PREVIEW } from "../../services/uiPreview";
import { useResource } from "../../services/resources";
import type { UsageRecord } from "../../services/resources";
import type { GenerationRecord } from "../../services/resources";

type GenerationState =
  | "idle"
  | "queued"
  | "processing"
  | "saving"
  | "succeeded"
  | "failed"
  | "needs_review"
  | "preview"
  | "not_found"
  | "status_error";

const promptExamples = [
  "Một con mèo cam ngồi cạnh cửa sổ, nắng buổi sáng, phong cách màu nước.",
  "Thành phố tương lai trong đêm mưa, ánh đèn neon xanh tím phản chiếu trên mặt đường, điện ảnh.",
  "Một căn nhà gỗ nhỏ giữa rừng thông phủ sương, ánh sáng xanh dịu, phong cách minh họa sách.",
  "Nhân vật phi hành gia đứng trên hành tinh xa lạ, bầu trời đầy tinh vân tím, chi tiết điện ảnh.",
];
const REFERENCE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
async function referenceImageSha256(file: File) {
  const bytes = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, "0")).join("");
}

function CreateHero() {
  return (
    <StudioHero id="create-page-title" eyebrow="AI IMAGE STUDIO" title={<>
          Biến ý tưởng của bạn
          <br />
          <span>thành hình ảnh.</span>
        </>} description={<>
          Mô tả điều bạn đang hình dung. FLUX STUDIO sẽ giúp bạn bắt đầu từ một
          khung hình đầy cảm hứng.
        </>} />
  );
}

function PromptEditor({
  prompt,
  onPrompt,
  inputRef,
  onExamples,
  error,
  locked,
  style, onStyle,
  aspectRatio, onAspectRatio, state, onGenerate, disabled,
  referenceImage, onAttachImage, onRemoveImage, canAttachImage, referenceRecovery,
}: {
  prompt: string;
  onPrompt: (value: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onExamples: () => void;
  error: string;
  locked: boolean;
  style: ImageStyle;
  onStyle: (value: ImageStyle) => void;
  aspectRatio: AspectRatio;
  onAspectRatio: (value: AspectRatio) => void;
  state: GenerationState;
  onGenerate: () => void;
  disabled: boolean;
  referenceImage: File | null;
  onAttachImage: (file: File) => void;
  onRemoveImage: () => void;
  canAttachImage: boolean;
  referenceRecovery: boolean;
}) {
  const [picker, setPicker] = useState<"style" | "ratio" | null>(null);
  const composer = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const styleTrigger = useRef<HTMLButtonElement>(null);
  const ratioTrigger = useRef<HTMLButtonElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    if (!referenceImage) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(referenceImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceImage]);
  const capturePastedImage = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const image = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && REFERENCE_IMAGE_TYPES.includes(item.type))
      ?.getAsFile();
    if (!image) return;
    event.preventDefault();
    onAttachImage(image);
  };
  const busy = ["queued", "processing", "saving"].includes(state);
  const closePicker = () => {
    setPicker(null);
    (picker === "style" ? styleTrigger : ratioTrigger).current?.focus();
  };
  useEffect(() => {
    if (!picker || locked) { setPicker(null); return; }
    const host = composer.current;
    const pickerPanel = panel.current;
    if (!host || !pickerPanel) return;
    const viewport = window.visualViewport;
    const viewportEdges = () => ({
      top: Math.max(viewport?.offsetTop ?? 0, document.querySelector(".studio-topbar")?.getBoundingClientRect().bottom ?? 0) + 12,
      bottom: (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 12,
    });
    const fitPanel = () => {
      const edges = viewportEdges();
      const otherHeight = host.getBoundingClientRect().height - pickerPanel.getBoundingClientRect().height;
      // Reserve space for the prompt and toolbar; scroll only the choices when needed.
      const height = Math.min(pickerPanel.scrollHeight + 2, Math.max(160, edges.bottom - edges.top - otherHeight));
      const maxHeight = `${Math.floor(height)}px`;
      if (pickerPanel.style.maxHeight !== maxHeight) pickerPanel.style.maxHeight = maxHeight;
    };
    const revealComposer = () => {
      fitPanel();
      const box = host.getBoundingClientRect();
      const edges = viewportEdges();
      if (box.top < edges.top || box.bottom > edges.bottom) {
        window.scrollBy({ top: box.top - edges.top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    };
    pickerPanel.querySelector<HTMLInputElement>('input:checked')?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(revealComposer);
    const observer = new ResizeObserver(fitPanel);
    observer.observe(host);
    window.addEventListener("resize", revealComposer);
    viewport?.addEventListener("resize", revealComposer);
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !composer.current?.contains(event.target)) setPicker(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPicker(null);
        (picker === "style" ? styleTrigger : ratioTrigger).current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", revealComposer);
      viewport?.removeEventListener("resize", revealComposer);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [picker, locked]);
  return (
    <section
      className="create-card create-prompt"
      ref={composer}
      aria-labelledby="prompt-title"
    >
      <div className="create-card__heading">
        <div>
          <span className="create-card__icon">
            <Icon name="wand" size={17} />
          </span>
          <div>
            <h2 id="prompt-title">Bạn muốn tạo hình ảnh gì?</h2>
            <p>
              Hãy mô tả rõ chủ thể, bối cảnh, ánh sáng hoặc phong cách bạn muốn
              thử.
            </p>
          </div>
        </div>
        <span className="create-prompt__count">{prompt.length}/{MAX_PROMPT_LENGTH} ký tự</span>
      </div>
        {picker && <div ref={panel} id={picker === "style" ? "create-style-popover" : "create-ratio-popover"} className={`create-picker-popover create-picker-popover--${picker}`} role="region" aria-label={picker === "style" ? "Chọn phong cách" : "Chọn khung hình"}
          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); closePicker(); } }}>
          <div className="create-picker-popover__header"><strong>{picker === "style" ? "Chọn phong cách" : "Tỷ lệ khung hình"}</strong><button type="button" className="studio-icon-button" aria-label="Đóng bảng chọn" onClick={closePicker}><Icon name="close" size={16} /></button></div>
          {picker === "style" ? <StylePicker value={style} onChange={onStyle} disabled={locked} onCommit={closePicker} /> :
            <fieldset className="create-ratio-menu" disabled={locked}><legend className="sr-only">Khung hình</legend>
              {aspectOptions.map(option => <label key={option.value}>
                <input type="radio" name="aspectRatio" value={option.value} checked={aspectRatio === option.value} onChange={event => { onAspectRatio(option.value); if ((event.nativeEvent as MouseEvent).detail > 0) closePicker(); }} onClick={event => { if (event.detail > 0 && aspectRatio === option.value) closePicker(); }} />
                <span className="create-ratio-menu__preview" aria-hidden="true"><span className="create-ratio__shape" style={{ aspectRatio: option.ratio, width: option.value === "9:16" ? 26 : option.value === "3:4" ? 34 : 44 }} /></span>
                <span>{option.value === "auto" ? "Ảnh gốc" : option.value} <small>{option.value === "auto" ? "Tự động" : option.label}</small></span>
                {aspectRatio === option.value && <Icon name="check" size={15} />}
              </label>)}
              <p>Giữ toàn bộ ảnh, thêm viền trắng để vừa tỷ lệ đã chọn.</p>
            </fieldset>}
        </div>}
      <label className="sr-only" htmlFor="create-prompt">
        Mô tả hình ảnh muốn tạo
      </label>
      <div className="create-prompt__input">
      {style !== "none" && <div className="create-style-chip" aria-label={`Phong cách đã chọn: ${styleOptions.find(option => option.value === style)?.label}`}>
        <StyleArtwork style={style} />
        <strong>{styleOptions.find(option => option.value === style)?.label}</strong>
        <button type="button" aria-label="Bỏ phong cách đã chọn" disabled={locked} onClick={() => onStyle("none")}><Icon name="close" size={14} /></button>
      </div>}
      <textarea
        ref={inputRef}
        id="create-prompt"
        value={prompt}
        readOnly={locked}
        onChange={(event) => onPrompt(event.target.value)}
        onPaste={capturePastedImage}
        placeholder="Ví dụ: Một căn phòng tối giản với cửa sổ lớn nhìn ra cực quang, ánh sáng xanh tím dịu..."
        aria-describedby={error ? "create-prompt-error" : "create-prompt-note"}
        aria-invalid={Boolean(error)}
        rows={2}
      />
      {referenceImage && (
        <div className="create-reference-image" aria-label="Ảnh tham chiếu đã chọn">
          <img src={previewUrl} alt="Xem trước ảnh tham chiếu" />
          <div><strong>{referenceImage.name || "Ảnh đã dán"}</strong><span>{(referenceImage.size / 1024 / 1024).toFixed(2)} MiB</span></div>
          <button type="button" className="studio-icon-button" aria-label="Bỏ ảnh tham chiếu" disabled={!canAttachImage} onClick={onRemoveImage}><Icon name="close" size={16} /></button>
        </div>
      )}
      {referenceRecovery && !referenceImage && (
        <p className="create-reference-image__recovery" role="status">Yêu cầu trước có ảnh tham chiếu. Hãy chọn hoặc dán lại đúng ảnh để khôi phục nếu yêu cầu chưa được nhận.</p>
      )}
      </div>
      <div className="create-prompt__footer">
        <div className="create-prompt__tools">
        <input ref={imageInput} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Chọn ảnh tham chiếu" disabled={!canAttachImage} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) onAttachImage(file); }} />
        <button type="button" className="studio-button studio-button--subtle create-example-button" disabled={!canAttachImage} onClick={() => imageInput.current?.click()}><Icon name="image" size={15} />Thêm ảnh</button>
        <button
          type="button"
          className="studio-button studio-button--subtle create-example-button"
          onClick={() => { setPicker(null); onExamples(); }}
          disabled={locked}
        >
          <Icon name="book" size={15} />
          Ví dụ
        </button>
        <button ref={styleTrigger} type="button" className="studio-button studio-button--subtle create-example-button" disabled={locked}
          aria-expanded={picker === "style"} aria-controls="create-style-popover" onClick={() => setPicker(picker === "style" ? null : "style")}>
          <Icon name="image" size={15} />Phong cách<Icon name="chevron" size={13} />
        </button>
        <button ref={ratioTrigger} type="button" className="studio-button studio-button--subtle create-example-button" disabled={locked}
          aria-expanded={picker === "ratio"} aria-controls="create-ratio-popover" onClick={() => setPicker(picker === "ratio" ? null : "ratio")}>
          <Icon name="grid" size={15} />Khung hình <span>{aspectRatio === "auto" ? "Gốc" : aspectRatio}</span><Icon name="chevron" size={13} />
        </button>
        </div>
        <button type="button" className="studio-button studio-button--primary create-compose-submit" onClick={onGenerate} disabled={disabled} aria-busy={busy}>
          {busy ? <span className="create-spinner" aria-hidden="true" /> : <Icon name="sparkles" size={17} />}
          {busy ? "Đang xử lý…" : "Tạo ảnh"}
        </button>

      </div>
      {error ? (
        <p
          className="create-message create-message--error"
          id="create-prompt-error"
          role="alert"
        >
          <Icon name="info" size={15} />
          {error}
        </p>
      ) : (
        <p className="create-prompt__note" id="create-prompt-note">
          <Icon name="info" size={14} />
          {UI_PREVIEW
            ? "Viết mô tả để xem thử thao tác trên giao diện."
            : "Mô tả và ảnh đính kèm (nếu có) được gửi đến Cloudflare khi bạn nhấn Tạo ảnh. Ảnh tham chiếu được giữ tạm trên máy chủ trong lúc gửi xử lý."}
        </p>
      )}
    </section>
  );
}

function GenerationPanel({
  usage,
  model,
}: {
  usage: UsageRecord | null;
  model: string;
}) {
  return (
    <aside
      className="create-card create-generation"
      aria-labelledby="generation-title"
    >
      <div className="create-card__heading create-generation__heading">
        <div>
          <span className="create-card__icon">
            <Icon name="sparkles" size={17} />
          </span>
          <h2 id="generation-title">Thông tin tạo ảnh</h2>
        </div>
        <span className="create-card__label">FLUX</span>
      </div>
      <p className="create-generation__intro">
        Chọn phong cách và khung hình ngay dưới ô mô tả, rồi nhấn Tạo ảnh để bắt đầu.
      </p>
      <div className="create-generation__field">
        <span>Model</span>
        <div className="create-readonly">
          <Icon name="bolt" size={16} />
          <strong>{model}</strong>
          <span className="create-readonly__dot" />
        </div>
      </div>
      <div className="create-generation__note">
        <Icon name="shield" size={17} />
        <p>
          {usage ? `Còn ${usage.remainingToday} lượt tạo hôm nay.` : "Đang tải lượt tạo…"}
        </p>
      </div>
    </aside>
  );
}

function StateIcon({ state }: { state: GenerationState }) {
  if (state === "succeeded") return <Icon name="check" size={18} />;
  if (state === "failed" || state === "status_error" || state === "not_found")
    return <Icon name="info" size={18} />;
  if (state === "needs_review") return <Icon name="history" size={18} />;
  return <Icon name="sparkles" size={18} />;
}

function ResultPreview({
  state,
  onReusePrompt,
  onRetryStatus,
}: {
  state: GenerationState;
  onReusePrompt: () => void;
  onRetryStatus: () => void;
}) {
  const copy: Record<
    GenerationState,
    { label: string; title: string; body: string }
  > = {
    idle: {
      label: "CHƯA TẠO",
      title: "Ảnh của bạn sẽ xuất hiện tại đây",
      body: "Bắt đầu bằng một mô tả cụ thể. Kết quả sẽ được hiển thị trong khu vực này.",
    },
    queued: {
      label: "QUEUED",
      title: "Đang chờ xử lý",
      body: "Yêu cầu đã được lưu, chờ worker xử lý.",
    },
    processing: {
      label: "PROCESSING",
      title: "Đang tạo ảnh...",
      body: "Dịch vụ AI đang xử lý mô tả đã gửi.",
    },
    saving: {
      label: "SAVING",
      title: "Đang lưu ảnh...",
      body: "Chưa báo hoàn thành cho đến khi backend xác nhận việc lưu ảnh.",
    },
    succeeded: {
      label: "SUCCEEDED",
      title: "Yêu cầu đã hoàn tất",
      body: "Mở thư viện để xem ảnh đã lưu.",
    },
    failed: {
      label: "FAILED",
      title: "Không thể hoàn tất yêu cầu",
      body: "Yêu cầu thất bại. Xem thông tin lỗi hoặc dùng lại mô tả.",
    },
    needs_review: {
      label: "NEEDS REVIEW",
      title: "Chưa xác định được kết quả tạo ảnh.",
      body: "Hãy kiểm tra lịch sử. Không tự động tạo lại yêu cầu.",
    },
    status_error: {
      label: "STATUS ERROR",
      title: "Không tải được trạng thái",
      body: "Không đọc được trạng thái. Nhấn tải lại; không tạo job mới.",
    },
    preview: {
      label: "XEM THỬ",
      title: "Chức năng tạo ảnh sẽ được kết nối sau.",
      body: "Bạn có thể tiếp tục chỉnh sửa mô tả hoặc chọn ví dụ.",
    },
    not_found: {
      label: "KHÔNG TÌM THẤY",
      title: "Không tìm thấy yêu cầu tạo ảnh",
      body: "Mã yêu cầu không hợp lệ hoặc yêu cầu không tồn tại trong tài khoản hiện tại.",
    },
  };
  const current = copy[state];
  const isProgress =
    state === "queued" || state === "processing" || state === "saving";
  return (
    <section
      className={`create-card create-result create-result--${state}`}
      aria-labelledby="result-heading"
      aria-live="polite"
    >
      <div className="create-card__heading">
        <div>
          <span className="create-card__icon">
            <StateIcon state={state} />
          </span>
          <div>
            <span className="create-card__label">KẾT QUẢ</span>
            <h2 id="result-heading">Kết quả tạo ảnh</h2>
          </div>
        </div>
        <span className="create-result__state">{current.label}</span>
      </div>
      {
        <div
          className={`create-result__empty ${isProgress ? "create-result__empty--progress" : ""}`}
        >
          <span className="create-result__empty-icon">
            {isProgress ? (
              <span className="create-spinner" aria-hidden="true" />
            ) : (
              <StateIcon state={state} />
            )}
          </span>
          <h3>{current.title}</h3>
          <p>{current.body}</p>
          {state === "failed" && (
            <button
              type="button"
              className="studio-button studio-button--subtle"
              onClick={onReusePrompt}
            >
              <Icon name="wand" size={15} />
              Dùng lại mô tả
            </button>
          )}
          {state === "status_error" && (
            <button
              type="button"
              className="studio-button studio-button--subtle"
              onClick={onRetryStatus}
            >
              <Icon name="history" size={15} />
              Tải lại trạng thái
            </button>
          )}
          {state === "not_found" && (
            <a
              className="studio-button studio-button--subtle"
              href="/app/create"
            >
              Về trang tạo ảnh
            </a>
          )}
        </div>
      }
    </section>
  );
}

export default function CreateImagePage() {
  const profile = useResource<{ user: UserProfile }>("/auth/me");
  const usage = useResource<UsageRecord>("/usage/me");
  const [prompt, setPrompt] = useState(
    () => new URLSearchParams(window.location.search).get("prompt") ?? "",
  );
  const [state, setState] = useState<GenerationState>("idle");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("auto");
  const [style, setStyle] = useState<ImageStyle>("none");
  const [job, setJob] = useState<GenerationRecord | null>(null);
  const [jobId, setJobId] = useState(
    () => new URLSearchParams(window.location.search).get("job") ?? "",
  );
  const [promptError, setPromptError] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [usageRefreshKey, setUsageRefreshKey] = useState(0);
  const promptInput = useRef<HTMLTextAreaElement>(null),
    examplesDialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<PendingGeneration | null>(null);
  useEffect(() => {
    if (UI_PREVIEW) {
      // Discard only the old preview draft, never a real user's unresolved request.
      pending.current = null;
      try {
        clearPending("ui-preview");
      } catch {
        // Preview works even when sessionStorage is blocked.
      }
      return;
    }
    if (!profile.data || jobId) return;
    try {
      const saved = restorePending(profile.data.user.id);
      if (saved) {
        pending.current = saved;
        setPrompt(saved.prompt);
        setAspectRatio(saved.aspectRatio ?? "auto");
        setStyle(saved.style ?? "none");
        setPromptError(saved.referenceImageSha256
          ? "Có yêu cầu ảnh tham chiếu chưa xác định. Nhấn Tạo ảnh để kiểm tra cùng mã; nếu chưa được nhận, hãy đính kèm lại đúng ảnh."
          : "Có yêu cầu chưa xác định sau lần gửi trước. Nhấn Tạo ảnh để kiểm tra cùng mã; không tạo mã mới.");
      }
    } catch {
      setPromptError(
        "Trình duyệt không cho lưu trạng thái gửi. Hãy cho phép session storage trước khi tạo ảnh.",
      );
    }
  }, [profile.data, jobId]);
  const active = Boolean(
    jobId &&
      state !== "not_found" &&
      (!job || ["queued", "processing", "saving"].includes(job.status)),
  );
  const referenceRecovery = Boolean(pending.current?.referenceImageSha256 && !referenceImage);
  const canAttachImage = !posting && !active && (!pending.current || referenceRecovery);
  const attachImage = async (file: File) => {
    if (!REFERENCE_IMAGE_TYPES.includes(file.type)) {
      setPromptError("Chọn ảnh PNG, JPEG hoặc WebP.");
      return;
    }
    if (file.size === 0 || file.size > MAX_REFERENCE_IMAGE_BYTES) {
      setPromptError("Ảnh tham chiếu phải tối đa 10 MiB.");
      return;
    }
    try {
      if (pending.current?.referenceImageSha256) {
        const hash = await referenceImageSha256(file);
        if (hash !== pending.current.referenceImageSha256) {
          setPromptError("Ảnh này khác ảnh của yêu cầu đang khôi phục. Hãy chọn đúng ảnh đã gửi.");
          return;
        }
      }
      setReferenceImage(file);
      setPromptError("");
    } catch {
      setPromptError("Không thể đọc ảnh tham chiếu trong trình duyệt.");
    }
  };
  useEffect(() => {
    if (examplesOpen) examplesDialog.current?.showModal();
    else examplesDialog.current?.close();
  }, [examplesOpen]);
  useEffect(() => {
    if (!jobId) return;
    if (UI_PREVIEW || !/^[a-f0-9]{24}$/i.test(jobId)) {
      setJob(null);
      setState("not_found");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await api<GenerationRecord>(
          "/generations/" + encodeURIComponent(jobId),
        );
        if (cancelled) return;
        setJob(result);
        setAspectRatio(result.aspectRatio ?? "auto");
        setStyle(result.style ?? "none");
        setState(result.status);
        setPromptError("");
        if (["succeeded", "failed", "needs_review"].includes(result.status)) {
          usage.reload();
          setUsageRefreshKey((value) => value + 1);
        }
        if (["queued", "processing", "saving"].includes(result.status))
          timer = setTimeout(poll, 3000);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setJob(null);
          setState("not_found");
          setPromptError("");
          return;
        }
        setState("status_error");
        setPromptError(
          error instanceof Error ? error.message : "Không đọc được trạng thái.",
        );
        // Retry only status reads. Never create another inference from a polling error.
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, pollAttempt]);
  const generate = async () => {
    if (posting || active || state === "not_found" || !profile.data) return;
    const error = validatePrompt(prompt);
    if (error && !pending.current) {
      setPromptError(error);
      promptInput.current?.focus();
      return;
    }
    if (UI_PREVIEW) {
      // No idempotency key, browser pending request, or API call in UI preview.
      setPromptError("");
      setState("preview");
      return;
    }
    let referenceHash = pending.current?.referenceImageSha256;
    if (referenceImage) {
      try {
        referenceHash = await referenceImageSha256(referenceImage);
      } catch {
        setPromptError("Không thể kiểm tra ảnh tham chiếu trong trình duyệt.");
        return;
      }
      if (pending.current?.referenceImageSha256 && pending.current.referenceImageSha256 !== referenceHash) {
        setPromptError("Ảnh tham chiếu không khớp yêu cầu đang khôi phục.");
        return;
      }
    }
    if (!pending.current)
      pending.current = { key: crypto.randomUUID(), prompt, aspectRatio, style, ...(referenceHash ? { referenceImageSha256: referenceHash } : {}) };
    try {
      persistPending(profile.data.user.id, pending.current);
    } catch {
      setPromptError(
        "Chưa lưu được mã yêu cầu trên trình duyệt. Chưa gửi đến backend.",
      );
      return;
    }
    setPosting(true);
    setPromptError("");
    try {
      let requestBody: BodyInit;
      if (referenceImage && referenceHash) {
        const form = new FormData();
        form.set("prompt", pending.current.prompt);
        form.set("aspectRatio", pending.current.aspectRatio ?? "auto");
        form.set("style", pending.current.style ?? "none");
        form.set("referenceImageSha256", referenceHash);
        form.set("referenceImage", referenceImage, referenceImage.name || "reference-image");
        requestBody = form;
      } else {
        requestBody = JSON.stringify({ prompt: pending.current.prompt, aspectRatio: pending.current.aspectRatio ?? "auto", style: pending.current.style ?? "none", ...(referenceHash ? { referenceImageSha256: referenceHash } : {}) });
      }
      const result = await api<GenerationRecord>("/generations", {
        method: "POST",
        headers: { "Idempotency-Key": pending.current.key },
        body: requestBody,
      });
      setJob(result);
      setReferenceImage(null);
      setJobId(result.id);
      setState(result.status);
      setUsageRefreshKey((value) => value + 1);
      pending.current = null;
      clearPending(profile.data.user.id);
      const url = new URL(window.location.href);
      url.searchParams.delete("prompt");
      url.searchParams.set("job", result.id);
      window.history.replaceState(null, "", url);
    } catch (reason) {
      // On network/5xx keep key+payload for an explicit retry, preventing duplicate jobs.
      if (
        reason instanceof ApiError &&
        reason.code !== "REFERENCE_IMAGE_REQUIRED" &&
        ((reason.status >= 400 && reason.status < 500) ||
          reason.code === "GENERATION_NOT_CONFIGURED")
      ) {
        pending.current = null;
        clearPending(profile.data.user.id);
      }
      setPromptError(
        (reason instanceof Error ? reason.message : "Không gửi được yêu cầu.") +
          (pending.current
            ? " Nhấn lại để kiểm tra cùng yêu cầu, không tạo mã mới."
            : ""),
      );
    } finally {
      setPosting(false);
    }
  };
  const reset = () => {
    if (active) return;
    setJob(null);
    setReferenceImage(null);
    setJobId("");
    setState("idle");
    pending.current = null;
    if (profile.data) clearPending(profile.data.user.id);
    window.history.replaceState(null, "", "/app/create");
    requestAnimationFrame(() => promptInput.current?.focus());
  };
  return (
    <DashboardLayout
      search=""
      onSearch={() => undefined}
      favoritesOnly={false}
      onFavorites={() => undefined}
      onCompose={() => promptInput.current?.focus()}
      activeItem="create"
      showSearch={false}
      usageRefreshKey={usageRefreshKey}
    >
      <div className="create-page">
        <CreateHero />
        <div className="create-workspace">
          <PromptEditor
            aspectRatio={aspectRatio} onAspectRatio={setAspectRatio}
            state={state} onGenerate={() => { void generate(); }}
            disabled={posting || active || state === "not_found" || !profile.data}
            style={style} onStyle={setStyle}
            prompt={prompt}
            onPrompt={(value) => {
              setPrompt(value);
              setPromptError("");
            }}
            inputRef={promptInput}
            onExamples={() => setExamplesOpen(true)}
            error={promptError}
            locked={posting || active || Boolean(pending.current)}
            referenceImage={referenceImage}
            onAttachImage={(file) => { void attachImage(file); }}
            onRemoveImage={() => setReferenceImage(null)}
            canAttachImage={canAttachImage}
            referenceRecovery={referenceRecovery}
          />
          <GenerationPanel
            usage={usage.data}
            model={job?.model.includes("flux-2-klein-4b") || referenceImage || pending.current?.referenceImageSha256 ? "FLUX.2 Klein 4B" : "FLUX.1 Schnell"}
          />
        {job?.status === "succeeded" && job.imageId ? (
          <section className="create-card create-result">
            <h2>Ảnh đã được lưu</h2>
            <img
              className="detail-live-art"
              src={"/api/v1/images/" + job.imageId + "/content"}
              alt={job.prompt}
            />
            <p>{job.prompt}</p>
            <div className="create-result__actions">
              <a
                className="studio-button studio-button--primary"
                href={"/app/images/" + job.imageId}
              >
                Xem chi tiết
              </a>
              <a
                className="studio-button studio-button--subtle"
                href={"/api/v1/images/" + job.imageId + "/download"}
              >
                Tải ảnh
              </a>
              <button
                className="studio-button studio-button--subtle"
                onClick={reset}
              >
                Tạo ảnh mới
              </button>
            </div>
          </section>
        ) : (
          <ResultPreview
            state={state}
            onReusePrompt={reset}
            onRetryStatus={() => setPollAttempt((value) => value + 1)}
          />
        )}
        {job?.error && <p role="status">{job.error.message}</p>}
        {active && (
          <p role="status">
            Đang theo dõi yêu cầu: {job?.prompt ?? "Chưa đọc được mô tả"}. Bạn có
            thể chuyển trang và theo dõi trong lịch sử.
          </p>
        )}
        </div>
      </div>
      <dialog
        className="create-examples-dialog"
        ref={examplesDialog}
        onCancel={() => setExamplesOpen(false)}
        onClose={() => setExamplesOpen(false)}
      >
        <h2>Ví dụ mô tả</h2>
        {promptExamples.map((example) => (
          <button
            className="create-example-card"
            key={example}
            onClick={() => {
              if (!prompt.trim() || window.confirm("Thay mô tả đang soạn?")) {
                setPrompt(example);
                setExamplesOpen(false);
              }
            }}
          >
            {example}
          </button>
        ))}
        <button
          className="studio-button studio-button--subtle"
          onClick={() => setExamplesOpen(false)}
        >
          Đóng
        </button>
      </dialog>
    </DashboardLayout>
  );
}
