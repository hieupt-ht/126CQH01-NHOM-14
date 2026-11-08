import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  useResource,
  type GenerationRecord,
  type Page,
} from "../../services/resources";
import "./HistoryPage.css";
import "../library/LibraryPage.css";
import { imageDetailHref, useListNavigation, useRestoreListScroll } from "../../services/listNavigation";
import { trapDialogFocus } from "../../components/ui/dialogFocus";
const labels = {
  queued: "Đang chờ",
  processing: "Đang tạo",
  saving: "Đang lưu",
  succeeded: "Thành công",
  failed: "Thất bại",
  needs_review: "Cần kiểm tra",
};
export default function HistoryPage() {
  const [selected, setSelected] = useState<string | null>(new URLSearchParams(window.location.search).get("job"));
  const { cursor, previous, move } = useListNavigation();
  const selectJob = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("job", id);
    window.history.replaceState(null, "", url.pathname + url.search);
    setSelected(id);
  };
  const { data, loading, error, reload } = useResource<Page<GenerationRecord>>(
    "/generations?limit=20" +
      (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
  );
  useRestoreListScroll(loading);
  const hasActive = data?.items.some((job) =>
    ["queued", "processing", "saving"].includes(job.status),
  );
  useEffect(() => {
    if (!hasActive || loading || error) return;
    const timer = setTimeout(reload, 5000);
    return () => clearTimeout(timer);
  }, [data, hasActive, loading, error, reload]);
  return (
    <DashboardLayout
      search=""
      onSearch={() => undefined}
      favoritesOnly={false}
      onFavorites={() => undefined}
      onCompose={() => undefined}
      activeItem="history"
      showSearch={false}
    >
      <div className="history-page">
        <header className="history-header">
          <div>
            <h1>Lịch sử tạo ảnh</h1>
            <p>Các yêu cầu của bạn, bao gồm cả lần tạo không thành công.</p>
          </div>
          <a
            className="studio-button studio-button--primary"
            href="/app/create"
          >
            Tạo ảnh mới
          </a>
        </header>
        {new URLSearchParams(window.location.search).get("notice") === "deleted" && <p role="status">Đã xóa khỏi thư viện. Lịch sử tạo vẫn được giữ.</p>}
        {loading && !data ? (
          <p role="status">Đang tải lịch sử…</p>
        ) : error ? (
          <section role="alert">
            <p>{error}</p>
            <button
              className="studio-button studio-button--subtle"
              onClick={reload}
            >
              Thử lại
            </button>
          </section>
        ) : !data?.items.length ? (
          <section className="history-state">
            <h2>Chưa có lịch sử tạo ảnh</h2>
          </section>
        ) : (
          <>
            <div className="history-table-wrap">
              <table className="history-table">
                <caption className="sr-only">
                  Lịch sử yêu cầu của tài khoản hiện tại
                </caption>
                <thead>
                  <tr>
                    <th>Mô tả</th>
                    <th>Trạng thái</th>
                    <th>Thời điểm</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <button
                          className="history-prompt-button"
                          onClick={() => selectJob(job.id)}
                        >
                          {job.prompt}
                        </button>
                      </td>
                      <td>
                        <span
                          className={
                            "history-status history-status--" + job.status
                          }
                        >
                          {labels[job.status]}
                        </span>
                      </td>
                      <td>{new Date(job.createdAt).toLocaleString("vi-VN")}</td>
                      <td>
                        <button
                          className="history-row-action"
                          onClick={() => selectJob(job.id)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="history-cards">
              {data.items.map((job) => (
                <article className="history-card" key={job.id}>
                  <button className="history-card__prompt" onClick={() => selectJob(job.id)}>Chi tiết lần tạo</button>
                  <span
                    className={"history-status history-status--" + job.status}
                  >
                    {labels[job.status]}
                  </span>
                  <p>{job.prompt}</p>
                  <small>
                    {new Date(job.createdAt).toLocaleString("vi-VN")}
                  </small>
                  {job.error && <p role="status">{job.error.message}</p>}
                  {job.imageDeleted && (
                    <p>Ảnh đã xóa khỏi thư viện, lịch sử vẫn được giữ.</p>
                  )}
                  <div className="detail-actions">
                    {job.imageId && !job.imageDeleted && (
                      <a
                        className="studio-button studio-button--subtle"
                        href={imageDetailHref(job.imageId)}
                        onClick={(event) => { event.currentTarget.href = imageDetailHref(job.imageId!); }}
                      >
                        Xem ảnh
                      </a>
                    )}
                    {["queued", "processing", "saving"].includes(
                      job.status,
                    ) && (
                      <a
                        className="studio-button studio-button--subtle"
                        href={"/app/create?job=" + job.id}
                      >
                        Theo dõi yêu cầu
                      </a>
                    )}
                    {job.status === "failed" && (
                      <a
                        className="studio-button studio-button--subtle"
                        href={
                          "/app/create?prompt=" + encodeURIComponent(job.prompt)
                        }
                      >
                        Dùng lại mô tả
                      </a>
                    )}
                    {job.status === "needs_review" && (
                      <p>Không tự động tạo lại yêu cầu chưa rõ kết quả.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        <nav className="library-pagination" aria-label="Phân trang lịch sử">
          {(previous.length > 0 || cursor) && (
            <button
              className="studio-button studio-button--subtle"
              disabled={loading}
              onClick={() => move(previous.at(-1) ?? "", true)}
            >
              Trang trước
            </button>
          )}
          {!error && data?.nextCursor && (
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
      {selected && (
        <HistoryDetail key={selected} id={selected} onClose={() => {
          setSelected(null);
          const url = new URL(window.location.href);
          url.searchParams.delete("job");
          window.history.replaceState(null, "", url.pathname + url.search);
        }} />
      )}
    </DashboardLayout>
  );
}

function HistoryDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const {
    data: job,
    loading,
    error,
    reload,
  } = useResource<GenerationRecord>("/generations/" + encodeURIComponent(id));
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      trigger.current?.focus();
    };
  }, []);
  useEffect(() => {
    if (!job || loading || error || !["queued", "processing", "saving"].includes(job.status))
      return;
    const timer = setTimeout(reload, 5000);
    return () => clearTimeout(timer);
  }, [job, loading, error, reload]);
  return (
    <dialog
      className="history-drawer"
      ref={dialog}
      aria-labelledby="history-detail-title"
      tabIndex={-1}
      onKeyDown={trapDialogFocus}
      onCancel={onClose}
      onClose={onClose}
    >
      <header className="history-drawer__header">
        <h2 id="history-detail-title">Chi tiết lần tạo ảnh</h2>
        <button
          className="studio-button studio-button--subtle"
          autoFocus
          onClick={onClose}
        >
          Đóng
        </button>
      </header>
      {loading && !job ? (
        <p role="status">Đang tải…</p>
      ) : error ? (
        <section role="alert"><p>{error}</p><button className="studio-button studio-button--subtle" onClick={reload}>Tải lại trạng thái</button></section>
      ) : (
        job && (
          <>
            <div className="history-drawer__status">
              <span className={"history-status history-status--" + job.status}>
                {labels[job.status]}
              </span>
            </div>
            <section className="history-drawer__prompt">
              <h3>Mô tả gốc</h3>
              <p>{job.prompt}</p>
            </section>
            <dl className="history-drawer__metadata">
              <div>
                <dt>Model</dt>
                <dd>{job.model}</dd>
              </div>
              <div>
                <dt>Ảnh tham chiếu</dt>
                <dd>{job.usedReferenceImage ? "Có" : "Không"}</dd>
              </div>
              <div>
                <dt>Thời điểm</dt>
                <dd>{new Date(job.createdAt).toLocaleString("vi-VN")}</dd>
              </div>
              <div>
                <dt>Thời gian xử lý</dt>
                <dd>
                  {job.durationMs === null
                    ? "—"
                    : (job.durationMs / 1000).toFixed(1) + " giây"}
                </dd>
              </div>
            </dl>
            {job.error && <p role="status">{job.error.message}</p>}
            {job.imageDeleted ? (
              <p>Ảnh đã xóa khỏi thư viện, lịch sử vẫn được giữ.</p>
            ) : (
              job.imageId && (
                <a
                  className="studio-button studio-button--primary"
                  href={imageDetailHref(job.imageId)}
                  onClick={(event) => { event.currentTarget.href = imageDetailHref(job.imageId!); }}
                >
                  Xem ảnh
                </a>
              )
            )}
            {["queued", "processing", "saving"].includes(job.status) && (
              <a
                className="studio-button studio-button--subtle"
                href={"/app/create?job=" + job.id}
              >
                Theo dõi yêu cầu
              </a>
            )}
            {job.status === "failed" && (
              <a
                className="studio-button studio-button--subtle"
                href={"/app/create?prompt=" + encodeURIComponent(job.prompt)}
              >
                Dùng lại mô tả
              </a>
            )}
            {job.status === "needs_review" && (
              <p>Không tự động tạo lại yêu cầu chưa rõ kết quả.</p>
            )}
          </>
        )
      )}
    </dialog>
  );
}
