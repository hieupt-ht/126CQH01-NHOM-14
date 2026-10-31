import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DashboardHero from "../../components/dashboard/DashboardHero";
import PromptComposer from "../../components/dashboard/PromptComposer";
import GenerationPanel from "../../components/dashboard/GenerationPanel";
import CreationGallery from "../../components/dashboard/CreationGallery";
import ReferenceArtwork from "../../components/dashboard/ReferenceArtwork";
import Icon from "../../components/ui/Icon";
import { demoArtworks, type DemoArtwork } from "./dashboardData";
import { validatePrompt } from "../../domain/prompt";
import "./DashboardPage.css";
import {
  useResource,
  type ImageRecord,
  type Page,
  type StatsRecord,
} from "../../services/resources";

export default function DashboardPage() {
  const recent = useResource<Page<ImageRecord>>("/images?limit=4");
  const stats = useResource<StatsRecord>("/stats/me");
  const [prompt, setPrompt] = useState("");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<DemoArtwork | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const artworkDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected) artworkDialog.current?.showModal();
    else artworkDialog.current?.close();
  }, [selected]);

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

  const submit = () => {
    const error = validatePrompt(prompt);
    if (error) {
      setNotice(error);
      compose();
      return;
    }
    window.location.assign(`/app/create?prompt=${encodeURIComponent(prompt)}`);
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
          <DashboardHero />
          <PromptComposer
            prompt={prompt}
            onPrompt={(value) => {
              setPrompt(value);
              setNotice("");
            }}
            inputRef={promptInput}
            formId="dashboard-prompt"
            notice={notice}
            onSubmit={submit}
          />
        </div>
        <GenerationPanel formId="dashboard-prompt" />
      </div>

      <section className="creation-gallery" aria-labelledby="recent-live-title">
        <header className="creation-gallery__header">
          <h2 id="recent-live-title">Ảnh đã lưu gần đây</h2>
          <a href="/app/library">Xem thư viện</a>
        </header>
        {stats.data && (
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
        {recent.loading ? (
          <p role="status">Đang tải ảnh gần đây…</p>
        ) : recent.error ? (
          <p role="alert">{recent.error}</p>
        ) : !recent.data?.items.length ? (
          <p>Chưa có ảnh đã lưu. Bắt đầu từ một mô tả của bạn.</p>
        ) : (
          <div className="creation-grid">
            {recent.data.items.map((image) => (
              <article className="creation-card" key={image.id}>
                <a href={"/app/images/" + image.id}>
                  <img
                    className="dashboard-live-thumb"
                    src={image.contentUrl}
                    alt={image.title}
                    loading="lazy"
                  />
                </a>
                <a
                  className="creation-card__title"
                  href={"/app/images/" + image.id}
                >
                  {image.title}
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
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
    </DashboardLayout>
  );
}
