import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  useResource,
  type GenerationRecord,
  type Page,
} from "../../services/resources";
import "./HistoryPage.css";
const labels = {
  queued: "Đang chờ",
  processing: "Đang tạo",
  saving: "Đang lưu",
  succeeded: "Thành công",
  failed: "Thất bại",
  needs_review: "Cần kiểm tra",
};
export default function HistoryPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [cursor, setCursor] = useState(""),
    [previous, setPrevious] = useState<string[]>([]);
  const { data, loading, error, reload } = useResource<Page<GenerationRecord>>(
    "/generations?limit=20" +
      (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
  );
  const hasActive = data?.items.some((job) =>
    ["queued", "processing", "saving"].includes(job.status),
  );
  useEffect(() => {
    if (!hasActive) return;
    const timer = setTimeout(reload, 5000);
    return () => clearTimeout(timer);
  }, [data, hasActive]);
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
                          onClick={() => setSelected(job.id)}
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
                          onClick={() => setSelected(job.id)}
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
                        href={"/app/images/" + job.imageId + "?from=history"}
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
          {previous.length > 0 && (
            <button
              className="studio-button studio-button--subtle"
              onClick={() => {
                setCursor(previous[previous.length - 1]);
                setPrevious((value) => value.slice(0, -1));
              }}
            >
              Trang trước
            </button>
          )}
          {data?.nextCursor && (
            <button
              className="studio-button studio-button--subtle"
              onClick={() => {
                setPrevious((value) => [...value, cursor]);
                setCursor(data.nextCursor!);
              }}
            >
              Trang sau
            </button>
          )}
        </nav>
      </div>
      {selected && (
        <HistoryDetail id={selected} onClose={() => setSelected(null)} />
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
  } = useResource<GenerationRecord>("/generations/" + id);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      trigger.current?.focus();
    };
  }, []);
  useEffect(() => {
    if (!job || !["queued", "processing", "saving"].includes(job.status))
      return;
    const timer = setTimeout(reload, 5000);
    return () => clearTimeout(timer);
  }, [job]);
  return (
    <dialog
      className="history-drawer"
      ref={dialog}
      aria-labelledby="history-detail-title"
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
        <p role="alert">{error}</p>
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
                  href={"/app/images/" + job.imageId + "?from=history"}
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
