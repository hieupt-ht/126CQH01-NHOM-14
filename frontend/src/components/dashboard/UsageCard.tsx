import type { StatsRecord, UsageRecord } from "../../services/resources";
import { UI_PREVIEW } from "../../services/uiPreview";

type Props = {
  usage: UsageRecord | null; usageError: string; usageLoading: boolean;
  stats: StatsRecord | null; statsError: string; statsLoading: boolean;
};
export default function UsageCard({ usage, usageError, usageLoading, stats, statsError, statsLoading }: Props) {
  const available = !UI_PREVIEW && !usageLoading && !usageError && usage !== null;
  const stored = !UI_PREVIEW && !statsLoading && !statsError && stats !== null;
  const reset = available && Number.isFinite(Date.parse(usage.resetAt))
    ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(usage.resetAt))
    : null;
  const percent = available && usage.grantedToday > 0
    ? Math.min(100, Math.max(0, usage.acceptedToday / usage.grantedToday * 100)) : null;
  const unavailable = UI_PREVIEW ? "Chưa kết nối" : usageLoading ? "Đang tải…" : "Không khả dụng";
  const bytes = stored ? stats.totals.bytes : 0;
  const storageText = bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return <section className="usage-card" aria-label="Lượt tạo và lưu trữ cá nhân">
    <div className="usage-card__heading"><span>Lượt tạo của bạn</span><span>Hôm nay</span></div>
    <dl className="usage-card__metrics">
      <div><dt>Đã nhận / hạn mức</dt><dd>{available ? `${usage.acceptedToday} / ${usage.grantedToday}` : unavailable}</dd></div>
    </dl>
    {percent !== null ? <progress className="usage-card__progress" max={100} value={percent} aria-label="Tỷ lệ lượt đã nhận trong hạn mức cá nhân" /> : <div className="usage-card__progress-placeholder" aria-hidden="true" />}
    <dl className="usage-card__metrics">
      <div><dt>Lượt còn có thể dùng</dt><dd>{available ? usage.remainingToday : "—"}</dd></div>
    </dl>
    <p>{reset ? `Đặt lại ${reset} (giờ Việt Nam).` : UI_PREVIEW ? "Hạn mức sẽ hiển thị khi kết nối tài khoản." : "Chưa có thời điểm đặt lại."}</p>
    {usageError && !UI_PREVIEW && <p role="alert">{usageError}</p>}
    {available && !usage.configured && <p>Dịch vụ tạo ảnh chưa được bật.</p>}
    {available && usage.remainingToday === 0 && <p role="status">Hiện không còn lượt khả dụng.</p>}
    <div className="usage-card__storage">
      <div className="usage-card__heading"><span>Ảnh đang lưu</span><span>Thư viện</span></div>
      <dl className="usage-card__metrics">
        <div><dt>Số ảnh</dt><dd>{stored ? stats.totals.savedImages : "—"}</dd></div>
        <div><dt>Dung lượng</dt><dd>{stored ? storageText : UI_PREVIEW ? "Chưa kết nối" : statsLoading ? "Đang tải…" : "Không khả dụng"}</dd></div>
      </dl>
      {statsError && !UI_PREVIEW && <p role="alert">{statsError}</p>}
    </div>
    <p>Lượt đã nhận khác số ảnh thành công. Lượt khả dụng còn phụ thuộc hạn mức chung.</p>
    <p>Dung lượng ảnh trong thư viện, không phải credit dịch vụ hay quota lưu trữ được cấp.</p>
  </section>;
}
