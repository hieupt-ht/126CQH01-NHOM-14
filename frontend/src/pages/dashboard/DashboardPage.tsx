import { useEffect, useRef, useState } from "react";
import { type AspectRatio, type ImageStyle } from "../../domain/generationOptions";
import DashboardLayout from "../../layouts/DashboardLayout";
import DashboardHero from "../../components/dashboard/DashboardHero";
import AnimatedWelcomeArtwork from "../../components/dashboard/AnimatedWelcomeArtwork";
import PromptComposer from "../../components/dashboard/PromptComposer";
import GenerationPanel from "../../components/dashboard/GenerationPanel";
import CreationGallery from "../../components/dashboard/CreationGallery";
import ReferenceArtwork from "../../components/dashboard/ReferenceArtwork";
import Icon from "../../components/ui/Icon";
import { demoArtworks, type DemoArtwork } from "./dashboardData";
import { UI_PREVIEW } from "../../services/uiPreview";
import { restorePending, type PendingGeneration } from "../../services/pendingGeneration";
import type { UserProfile } from "../../services/api";
import { MAX_REFERENCE_IMAGES, referenceImageSha256, submitGeneration, validateReferenceImage } from "../../services/generationSubmission";
import { validatePrompt } from "../../domain/prompt";
import "./DashboardPage.css";
import {
  useResource,
  type ImageRecord,
  type Page,
  type StatsRecord,
} from "../../services/resources";

function RecentImage({ image }: { image: ImageRecord }) {
  const [broken, setBroken] = useState(false);
  const metadata = useResource<ImageRecord>("/images/" + encodeURIComponent(image.id));
  const model = image.model || metadata.data?.model;
  const date = new Date(image.createdAt);
  let a = image.width, b = image.height;
  while (b) { const remainder = a % b; a = b; b = remainder; }
  const ratio = a > 0 ? `${image.width / a}:${image.height / a}` : "";
  return <article className="creation-card">
    <a href={"/app/images/" + image.id} aria-label={`Xem ảnh: ${image.title}`}>
      {broken ? <div className="dashboard-thumb-error"><Icon name="image" size={26} /><span>Không tải được ảnh</span><small>Mở chi tiết để thử lại</small></div> :
        <img className="dashboard-live-thumb" src={image.contentUrl} alt={image.title} loading="lazy" onError={() => setBroken(true)} />}
    </a>
    <a className="creation-card__title" href={"/app/images/" + image.id}>{image.title}</a>
    <div className="creation-card__meta">
      {Number.isFinite(date.getTime()) ? <time dateTime={date.toISOString()}>{date.toLocaleString("vi-VN", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</time> : <span>Chưa có thời gian</span>}
      <span className="creation-card__tag">{model?.replace("@cf/black-forest-labs/", "") || (metadata.loading ? "Đang tải model…" : "Chưa tải được model")}</span>
    </div>
    <p className="dashboard-image-size">{image.width} × {image.height} px{ratio && ` · ${ratio}`}</p>
  </article>;
}

export default function DashboardPage() {
  const recent = useResource<Page<ImageRecord>>("/images?limit=4");
  const stats = useResource<StatsRecord>("/stats/me");
  const profile = useResource<{ user: UserProfile }>("/auth/me");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("auto");
  const [style, setStyle] = useState<ImageStyle>("none");
  const [referenceImage, setReferenceImage] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<PendingGeneration | null>(null);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [selected, setSelected] = useState<DemoArtwork | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const pendingRef = useRef<PendingGeneration | null>(null);
  const restoredPendingUser = useRef("");
  const artworkDialog = useRef<HTMLDialogElement>(null);
  const welcomeDialog = useRef<HTMLDialogElement>(null);
  const welcomeAutoHandled = useRef(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const referenceRecovery = Boolean(pendingRequest?.referenceImageSha256?.length && !referenceImage.length);
  const canAttachImage = !posting && (!pendingRequest || referenceRecovery);
  const locked = posting || Boolean(pendingRequest);

  useEffect(() => {
    const userId = profile.data?.user.id;
    if (!userId || UI_PREVIEW || restoredPendingUser.current === userId) return;
    restoredPendingUser.current = userId;
    try {
      const saved = restorePending(userId);
      if (!saved) return;
      pendingRef.current = saved;
      setPendingRequest(saved);
      setPrompt(saved.prompt);
      setAspectRatio(saved.aspectRatio ?? "auto");
      setStyle(saved.style ?? "none");
      setNotice(saved.referenceImageSha256?.length
        ? "Có yêu cầu ảnh đính kèm chưa xác định. Hãy nhấn Enter để kiểm tra cùng mã; nếu ảnh chưa được nhận, hãy đính kèm lại đúng ảnh."
        : "Có yêu cầu chưa xác định sau lần gửi trước. Nhấn Enter để kiểm tra cùng mã, không tạo mã mới.");
    } catch {
      setNotice("Trình duyệt không cho lưu trạng thái gửi. Hãy cho phép session storage trước khi tạo ảnh.");
      setNoticeIsError(true);
    }
  }, [profile.data]);
  useEffect(() => {
    if (selected) artworkDialog.current?.showModal();
    else artworkDialog.current?.close();
  }, [selected]);
  useEffect(() => {
    if (welcomeAutoHandled.current) return;
    const forced = new URLSearchParams(window.location.search).get("welcome") === "1";
    if (!forced && (recent.loading || recent.error || !recent.data)) return;
    welcomeAutoHandled.current = true;
    let dismissed = false;
    try { dismissed = window.localStorage.getItem("flux_welcome_dismissed") === "1"; } catch { /* Storage may be blocked. */ }
    if (forced || (!dismissed && recent.data?.items.length === 0)) setWelcomeOpen(true);
  }, [recent.loading, recent.error, recent.data]);
  useEffect(() => {
    const dialog = welcomeDialog.current;
    if (!dialog) return;
    if (welcomeOpen && !dialog.open) dialog.showModal();
    if (!welcomeOpen && dialog.open) dialog.close();
  }, [welcomeOpen]);
  const closeWelcome = () => {
    setWelcomeOpen(false);
    try { window.localStorage.setItem("flux_welcome_dismissed", "1"); } catch { /* Storage may be blocked. */ }
  };

  const compose = () => {
    promptInput.current?.scrollIntoView({ block: "center" });
    promptInput.current?.focus({ preventScroll: true });
  };

  const normalize = (text: string) =>
    text
      .toLocaleLowerCase("vi")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

  const visibleArtworks = demoArtworks.filter(
    (artwork) =>
      normalize(`${artwork.title} ${artwork.category}`).includes(
        normalize(search.trim()),
      ) &&
      (!favoritesOnly || favorites.includes(artwork.id)),
  );

  const setPending = (value: PendingGeneration | null) => {
    pendingRef.current = value;
    setPendingRequest(value);
  };

  const attachImage = async (files: File[]) => {
    const combined = [...referenceImage];
    for (const file of files) {
      const validationError = validateReferenceImage(file);
      if (validationError) { setNotice(validationError); setNoticeIsError(true); return; }
      if (!combined.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) combined.push(file);
    }
    if (combined.length > MAX_REFERENCE_IMAGES) { setNotice(`Chỉ có thể đính kèm tối đa ${MAX_REFERENCE_IMAGES} ảnh.`); setNoticeIsError(true); return; }
    try {
      if (pendingRef.current?.referenceImageSha256?.length) {
        const hashes = await Promise.all(combined.map(referenceImageSha256));
        if (JSON.stringify(hashes) !== JSON.stringify(pendingRef.current.referenceImageSha256)) {
          setNotice("Bộ ảnh này khác yêu cầu đang khôi phục. Hãy chọn đúng các ảnh đã gửi, theo cùng thứ tự.");
          setNoticeIsError(true);
          return;
        }
      }
      setReferenceImage(combined);
      setNotice("");
      setNoticeIsError(false);
    } catch {
      setNotice("Không thể đọc ảnh đính kèm trong trình duyệt.");
      setNoticeIsError(true);
    }
  };

  const submit = async () => {
    if (posting || !profile.data) return;
    const error = validatePrompt(prompt);
    if (error && !pendingRef.current) {
      setNotice(error);
      setNoticeIsError(true);
      compose();
      return;
    }
    if (UI_PREVIEW) {
      setNotice("Tạo ảnh trực tiếp từ Tổng quan cần kết nối backend.");
      return;
    }
    setPosting(true);
    setNotice("");
    setNoticeIsError(false);
    try {
      const job = await submitGeneration({
        userId: profile.data.user.id,
        prompt,
        aspectRatio,
        style,
        referenceImage,
        pending: pendingRef.current,
        onPendingChange: setPending,
      });
      setReferenceImage([]);
      window.location.assign(`/app/create?job=${encodeURIComponent(job.id)}`);
    } catch (reason) {
      setNotice((reason instanceof Error ? reason.message : "Không gửi được yêu cầu.") +
        (pendingRef.current ? " Nhấn Enter để kiểm tra lại cùng yêu cầu." : ""));
      setNoticeIsError(true);
    } finally {
      setPosting(false);
    }
  };

  const toggleFavorite = (id: string) =>
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );

  const usePrompt = () => {
    if (!selected) return;
    if (
      prompt.trim() &&
      !window.confirm("Thay mô tả đang soạn bằng mô tả của ảnh mẫu?")
    )
      return;
    setPrompt(selected.prompt);
    setNotice(
      "Đã điền mô tả từ ảnh mẫu. Bạn có thể chỉnh sửa theo ý tưởng của mình.",
    );
    setNoticeIsError(false);
    artworkDialog.current?.close();
    setSelected(null);
    requestAnimationFrame(compose);
  };

  const copyPrompt = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.prompt);
      setCopyNotice("Đã sao chép mô tả.");
    } catch {
      setCopyNotice(
        "Chưa thể sao chép. Bạn có thể chọn và sao chép văn bản phía trên.",
      );
    }
  };

  return (
    <DashboardLayout
      search={search}
      onSearch={setSearch}
      favoritesOnly={favoritesOnly}
      onFavorites={setFavoritesOnly}
      onCompose={compose}
    >
      <div className="dashboard-workbench">
        <div className="dashboard-workbench__main">
          <DashboardHero onWelcome={() => setWelcomeOpen(true)} />
          <PromptComposer
            prompt={prompt}
            onPrompt={(value) => {
              setPrompt(value);
              setNotice("");
              setNoticeIsError(false);
            }}
            inputRef={promptInput}
            formId="dashboard-prompt"
            notice={notice}
            noticeIsError={noticeIsError}
            onSubmit={() => { void submit(); }}
            aspectRatio={aspectRatio}
            onAspectRatio={setAspectRatio}
            style={style}
            onStyle={setStyle}
            referenceImage={referenceImage}
            onAttachImage={(file) => { void attachImage(file); }}
            onRemoveImage={(index) => setReferenceImage(current => current.filter((_, itemIndex) => itemIndex !== index))}
            canAttachImage={canAttachImage}
            locked={locked}
            submitting={posting}
            disabled={posting || !profile.data}
            referenceRecovery={referenceRecovery}
          />
        </div>
        <GenerationPanel />
      </div>

      {recent.data && recent.data.items.length > 0 && <section className="creation-gallery" aria-labelledby="recent-live-title">
        <header className="creation-gallery__header">
          <h2 id="recent-live-title">Ảnh đã lưu gần đây</h2>
          <a href="/app/library">Xem thư viện</a>
        </header>
        {stats.data && !UI_PREVIEW && (
          <p className="creation-gallery__description">
            {stats.data.totals.savedImages} ảnh đã lưu ·{" "}
            {(stats.data.totals.bytes / 1024 / 1024).toFixed(1)} MB
            {stats.data.averageDurationMs !== null
              ? " · Trung bình " +
                (stats.data.averageDurationMs / 1000).toFixed(1) +
                " giây/lần thành công"
              : ""}
          </p>
        )}
        {stats.error && <p role="alert">{stats.error}</p>}
        <div className="creation-grid">
          {recent.data.items.map((image) => <RecentImage key={image.id} image={image} />)}
        </div>
      </section>}
      <CreationGallery
        artworks={visibleArtworks}
        favorites={favorites}
        favoritesOnly={favoritesOnly}
        onToggleFavorite={toggleFavorite}
        onFilter={setFavoritesOnly}
        onSelect={(artwork) => {
          setSelected(artwork);
          setCopyNotice("");
        }}
        onReset={() => {
          setSearch("");
          setFavoritesOnly(false);
        }}
      />

      <dialog
        className="artwork-dialog"
        ref={artworkDialog}
        aria-labelledby="artwork-dialog-title"
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}
      >
        {selected && (
          <>
            <div className="artwork-dialog__header">
              <span className="demo-badge">
                Ảnh tham chiếu · Không phải kết quả tạo thật
              </span>
              <button
                className="studio-icon-button"
                onClick={() => setSelected(null)}
                aria-label="Đóng chi tiết ảnh"
              >
                <Icon name="close" />
              </button>
            </div>
            <ReferenceArtwork region={selected.region} label={selected.title} />
            <div className="artwork-dialog__body">
              <span className="section-eyebrow">{selected.category}</span>
              <h2 id="artwork-dialog-title">{selected.title}</h2>
              <p>{selected.prompt}</p>
              <div className="artwork-dialog__actions">
                <button
                  className="studio-button studio-button--primary"
                  onClick={usePrompt}
                >
                  <Icon name="wand" size={16} />
                  Dùng mô tả này
                  <Icon name="arrow" size={16} />
                </button>
                <button
                  className="studio-button studio-button--subtle"
                  onClick={copyPrompt}
                >
                  <Icon name="copy" size={16} />
                  Sao chép
                </button>
              </div>
              <span className="artwork-dialog__status" role="status">
                {copyNotice}
              </span>
            </div>
          </>
        )}
      </dialog>
      <dialog className="welcome-dialog" ref={welcomeDialog} aria-label="Giới thiệu FLUX Studio"
        onCancel={(event) => { event.preventDefault(); closeWelcome(); }}
        onClick={(event) => { if (event.target === event.currentTarget) closeWelcome(); }}>
        <button type="button" className="welcome-dialog__close studio-icon-button" aria-label="Đóng" onClick={closeWelcome}><Icon name="close" size={18} /></button>
        <AnimatedWelcomeArtwork />
        <div className="welcome-dialog__footer"><span>Minh họa quy trình, không tạo ảnh thật.</span><a className="studio-button studio-button--primary" href="/app/create" onClick={closeWelcome}>Bắt đầu tạo ảnh <Icon name="arrow" size={16} /></a></div>
      </dialog>
    </DashboardLayout>
  );
}
