import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  useResource,
  type ImageRecord,
  type Page,
} from "../../services/resources";
import "./LibraryPage.css";
export default function LibraryPage() {
  const [cursor, setCursor] = useState(""),
    [previous, setPrevious] = useState<string[]>([]);
  const { data, error, loading, reload } = useResource<Page<ImageRecord>>(
    "/images?limit=20" +
      (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
  );
  const move = (next: string, back = false) => {
    setPrevious((current) =>
      back ? current.slice(0, -1) : [...current, cursor],
    );
    setCursor(next);
  };
  return (
    <DashboardLayout
      search=""
      onSearch={() => undefined}
      favoritesOnly={false}
      onFavorites={() => undefined}
      onCompose={() => undefined}
      activeItem="library"
      showSearch={false}
    >
      <div className="library-page">
        <header className="library-header">
          <div>
            <span className="section-eyebrow">MY IMAGE LIBRARY</span>
            <h1>Thư viện của tôi</h1>
            <p>Ảnh đã lưu của tài khoản hiện tại.</p>
          </div>
          <a
            className="studio-button studio-button--primary"
            href="/app/create"
          >
            Tạo ảnh mới
          </a>
        </header>
        {loading ? (
          <p role="status">Đang tải thư viện…</p>
        ) : error ? (
          <section className="library-state" role="alert">
            <p>{error}</p>
            <button
              className="studio-button studio-button--subtle"
              onClick={reload}
            >
              Thử lại
            </button>
          </section>
        ) : !data?.items.length ? (
          <section className="library-state">
            <h2>Bạn chưa có hình ảnh nào</h2>
            <a
              className="studio-button studio-button--primary"
              href="/app/create"
            >
              Tạo ảnh đầu tiên
            </a>
          </section>
        ) : (
          <div className="library-grid">
            {data.items.map((image) => (
              <article className="library-image-card" key={image.id}>
                <a href={"/app/images/" + image.id + "?from=library"}>
                  <img
                    className="library-image-card__art"
                    src={image.contentUrl}
                    alt={image.title}
                    loading="lazy"
                  />
                </a>
                <div className="library-image-card__body">
                  <h2>{image.title}</h2>
                  <p>
                    {image.width} × {image.height} · {image.format}
                  </p>
                  <a
                    className="studio-button studio-button--subtle"
                    href={"/app/images/" + image.id + "?from=library"}
                  >
                    Xem và quản lý
                  </a>
                  <a
                    className="studio-button studio-button--subtle"
                    href={image.downloadUrl}
                  >
                    Tải ảnh
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
        <nav className="library-pagination" aria-label="Phân trang thư viện">
          {previous.length > 0 && (
            <button
              className="studio-button studio-button--subtle"
              disabled={loading}
              onClick={() => move(previous[previous.length - 1], true)}
            >
              Trang trước
            </button>
          )}
          {data?.nextCursor && (
            <button
              className="studio-button studio-button--subtle"
              disabled={loading}
              onClick={() => move(data.nextCursor!)}
            >
              Trang sau
            </button>
          )}
        </nav>
      </div>
    </DashboardLayout>
  );
}
