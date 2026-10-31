import { useEffect, useRef, useState, type RefObject } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import Icon from "../../components/ui/Icon";
import ReferenceArtwork from "../../components/dashboard/ReferenceArtwork";
import { MAX_PROMPT_LENGTH, validatePrompt } from "../../domain/prompt";
import "./CreateImagePage.css";
import {
  restorePending,
  persistPending,
  clearPending,
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

function CreateHero() {
  return (
    <section className="create-hero" aria-labelledby="create-page-title">
      <div className="create-hero__copy">
        <span className="section-eyebrow">AI IMAGE STUDIO</span>
        <h1 id="create-page-title">
          Biến ý tưởng của bạn
          <br />
          <span>thành hình ảnh.</span>
        </h1>
        <p>
          Mô tả điều bạn đang hình dung. FLUX STUDIO sẽ giúp bạn bắt đầu từ một
          khung hình đầy cảm hứng.
        </p>
      </div>
      <ReferenceArtwork
        region={{ x: 788, y: 72, width: 391, height: 283 }}
        label="Ảnh minh họa không gian sáng tạo AI"
        className="create-hero__art"
        loading="eager"
      />
      <span
        className="create-hero__orb create-hero__orb--one"
        aria-hidden="true"
      />
      <span
        className="create-hero__orb create-hero__orb--two"
        aria-hidden="true"
      />
    </section>
  );
}

function PromptEditor({
  prompt,
  onPrompt,
  inputRef,
  onExamples,
  error,
  locked,
}: {
  prompt: string;
  onPrompt: (value: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onExamples: () => void;
  error: string;
  locked: boolean;
}) {
  return (
    <section
      className="create-card create-prompt"
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
        <span className="create-card__label">PROMPT</span>
      </div>
      <label className="sr-only" htmlFor="create-prompt">
        Mô tả hình ảnh muốn tạo
      </label>
      <textarea
        ref={inputRef}
        id="create-prompt"
        value={prompt}
        readOnly={locked}
        onChange={(event) => onPrompt(event.target.value)}
        placeholder="Ví dụ: Một căn phòng tối giản với cửa sổ lớn nhìn ra cực quang, ánh sáng xanh tím dịu..."
        aria-describedby={error ? "create-prompt-error" : "create-prompt-note"}
        aria-invalid={Boolean(error)}
        rows={6}
      />
      <div className="create-prompt__footer">
        <button
          type="button"
          className="studio-button studio-button--subtle create-example-button"
          onClick={onExamples}
          disabled={locked}
        >
          <Icon name="book" size={15} />
          Ví dụ
        </button>
        <span className="create-prompt__count">
          {prompt.length}/{MAX_PROMPT_LENGTH} ký tự
        </span>
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
            : "Mô tả được gửi đến Cloudflare khi bạn nhấn Tạo ảnh."}
        </p>
      )}
    </section>
  );
}

function GenerationPanel({
  state,
  onGenerate,
  disabled,
  usage,
}: {
  state: GenerationState;
  onGenerate: () => void;
  disabled: boolean;
  usage: UsageRecord | null;
}) {
  const busy =
    state === "queued" || state === "processing" || state === "saving";
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
          <h2 id="generation-title">Thiết lập tạo ảnh</h2>
        </div>
        <span className="create-card__label">1 ẢNH / LƯỢT</span>
      </div>
      <p className="create-generation__intro">
        Cấu hình và quyền tạo ảnh được backend kiểm soát.
      </p>
      <div className="create-generation__field">
        <span>Model</span>
        <div className="create-readonly">
          <Icon name="bolt" size={16} />
          <strong>FLUX.1 Schnell</strong>
          <span className="create-readonly__dot" />
        </div>
      </div>
      <div className="create-generation__facts">
        <div>
          <span>Số lượng</span>
          <strong>1 ảnh / lượt</strong>
        </div>
        <div>
          <span>Lượt còn</span>
          <strong className="create-generation__muted">
            {usage?.remainingToday ?? "Đang tải…"}
          </strong>
        </div>
      </div>
      <div className="create-generation__note">
        <Icon name="shield" size={17} />
        <p>
          Backend kiểm tra hạn mức và cấu hình dịch vụ trước khi nhận yêu cầu.
        </p>
      </div>
      <button
        type="button"
        className="studio-button studio-button--primary create-generation__submit"
        onClick={onGenerate}
        disabled={disabled}
        aria-busy={busy}
      >
        {busy ? (
          <span className="create-spinner" aria-hidden="true" />
        ) : (
          <Icon name="sparkles" size={17} />
        )}
        {busy ? "Đang xử lý..." : "Tạo ảnh"}
        {!busy && <Icon name="arrow" size={17} />}
      </button>
      <p className="create-generation__footnote">
        Mỗi lần tạo chỉ tạo một ảnh.
      </p>
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
  const [job, setJob] = useState<GenerationRecord | null>(null);
  const [jobId, setJobId] = useState(
    () => new URLSearchParams(window.location.search).get("job") ?? "",
  );
  const [promptError, setPromptError] = useState("");
  const [posting, setPosting] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);
  const promptInput = useRef<HTMLTextAreaElement>(null),
    examplesDialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<{ key: string; prompt: string } | null>(null);
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
        setPromptError(
          "Có yêu cầu chưa xác định sau lần gửi trước. Nhấn Tạo ảnh để kiểm tra cùng mã; không tạo mã mới.",
        );
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
        setState(result.status);
        setPromptError("");
        if (["succeeded", "failed", "needs_review"].includes(result.status))
          usage.reload();
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
    if (!pending.current)
      pending.current = { key: crypto.randomUUID(), prompt };
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
      const result = await api<GenerationRecord>("/generations", {
        method: "POST",
        headers: { "Idempotency-Key": pending.current.key },
        body: JSON.stringify({ prompt: pending.current.prompt }),
      });
      setJob(result);
      setJobId(result.id);
      setState(result.status);
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
    >
      <div className="create-page">
        <CreateHero />
        <div className="create-workspace">
          <PromptEditor
            prompt={prompt}
            onPrompt={(value) => {
              setPrompt(value);
              setPromptError("");
            }}
            inputRef={promptInput}
            onExamples={() => setExamplesOpen(true)}
            error={promptError}
            locked={posting || active || Boolean(pending.current)}
          />
          <GenerationPanel
            state={state}
            onGenerate={() => {
              void generate();
            }}
            disabled={posting || active || state === "not_found" || !profile.data}
            usage={usage.data}
          />
        </div>
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
