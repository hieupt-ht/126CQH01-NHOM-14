import { useEffect, useRef, useState, type FormEvent } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import Icon from "../../components/ui/Icon";
import "./AccountSettingsPage.css";
import { api, type UserProfile } from "../../services/api";
import { useResource } from "../../services/resources";
import ProfileAvatar from "../../components/ui/ProfileAvatar";

type AccountProfile = {
  avatarUrl?: string | null;
  displayName: string | null;
  email: string | null;
};

type UsageData = {
  grantedToday: number | null;
  remainingToday: number | null;
  resetAt: string | null;
};

type SaveStatus = "idle" | "saving" | "success" | "error";

const previewProfile: AccountProfile = {
  displayName: null,
  email: null,
};

const unavailableUsage: UsageData = {
  grantedToday: null,
  remainingToday: null,
  resetAt: null,
};

function validateDisplayName(value: string) {
  const normalized = value.trim();
  if (!normalized) return "Vui lòng nhập tên hiển thị.";
  if (normalized.length > 80) return "Tên hiển thị tối đa 80 ký tự.";
  return "";
}

function formatResetTime(resetAt: string | null) {
  if (!resetAt) return "Chưa có dữ liệu";
  const date = new Date(resetAt);
  if (Number.isNaN(date.getTime())) return "Chưa có dữ liệu";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function ProfileSkeleton({
  label = "Đang tải thông tin tài khoản",
}: {
  label?: string;
}) {
  return (
    <div className="settings-skeleton" aria-label={label} role="status">
      <span className="settings-skeleton__line settings-skeleton__line--wide" />
      <span className="settings-skeleton__line" />
      <span className="settings-skeleton__field" />
      <span className="settings-skeleton__field" />
    </div>
  );
}

function UsageLimitsCard({
  usage = unavailableUsage,
  loading = false,
}: {
  usage?: UsageData;
  loading?: boolean;
}) {
  return (
    <section
      className="settings-card usage-limits-card"
      aria-labelledby="usage-limits-title"
    >
      <div className="settings-card__heading">
        <div>
          <span className="section-eyebrow">HẠN MỨC SỬ DỤNG</span>
          <h2 id="usage-limits-title">Hạn mức sử dụng</h2>
        </div>
        <span className="settings-card__icon" aria-hidden="true">
          <Icon name="bolt" size={17} />
        </span>
      </div>
      <p className="settings-card__description">
        Theo dõi số lượt được cấp và thời điểm hạn mức được đặt lại.
      </p>
      {loading ? (
        <ProfileSkeleton label="Đang tải thông tin hạn mức" />
      ) : (
        <dl className="usage-list">
          <div className="usage-list__item">
            <dt>Lượt được cấp hôm nay</dt>
            <dd>{usage.grantedToday ?? "Chưa có dữ liệu"}</dd>
          </div>
          <div className="usage-list__item">
            <dt>Lượt còn lại</dt>
            <dd>{usage.remainingToday ?? "Chưa có dữ liệu"}</dd>
          </div>
          <div className="usage-list__item">
            <dt>Thời điểm đặt lại hạn mức</dt>
            <dd>{formatResetTime(usage.resetAt)}</dd>
          </div>
        </dl>
      )}
      <div className="settings-info-note" role="note">
        <Icon name="info" size={16} />
        <p>
          {loading
            ? "Đang tải thông tin hạn mức."
            : "Hạn mức do backend quản lý; tạo ảnh chỉ khả dụng sau khi cấu hình dịch vụ."}
        </p>
      </div>
    </section>
  );
}

export default function AccountSettingsPage() {
  const [profile, setProfile] = useState<AccountProfile>(previewProfile);
  const [displayName, setDisplayName] = useState(
    previewProfile.displayName ?? "",
  );
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const editButton = useRef<HTMLButtonElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const avatarInFlight = useRef(false);
  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return; }
    const url = URL.createObjectURL(avatarFile); setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);
  const saveAvatar = async () => {
    if (!avatarFile || avatarInFlight.current || saveStatus === "saving") return;
    avatarInFlight.current = true; setAvatarSaving(true); setAvatarMessage(""); setAvatarError(false);
    try {
      const result = await api<{ user: UserProfile }>("/users/me/avatar", { method: "PUT", headers: { "Content-Type": avatarFile.type }, body: avatarFile });
      setProfile(result.user); setProfileRefreshKey(value => value + 1); setAvatarFile(null);
      if (avatarInput.current) avatarInput.current.value = "";
      setAvatarMessage("Đã cập nhật ảnh đại diện.");
    } catch (error) {
      setAvatarError(true); setAvatarMessage(error instanceof Error ? error.message : "Không lưu được ảnh đại diện.");
    } finally { avatarInFlight.current = false; setAvatarSaving(false); }
  };
  const displayNameInput = useRef<HTMLInputElement>(null);
  const account = useResource<{ user: UserProfile }>("/auth/me");
  const usage = useResource<UsageData>("/usage/me");
  useEffect(() => {
    if (account.data) {
      setProfile(account.data.user);
      setDisplayName(account.data.user.displayName);
    }
  }, [account.data]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Cài đặt tài khoản — FLUX STUDIO";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const normalizedDisplayName = displayName.trim();
  const validationError = validateDisplayName(displayName);
  const visibleValidationError =
    validationError && (touched || submitted) ? validationError : "";
  const originalDisplayName = profile.displayName?.trim() ?? "";
  const isDirty = normalizedDisplayName !== originalDisplayName;
  const canSave = Boolean(
    editing &&
    !avatarSaving &&
    profile.displayName &&
    !validationError &&
    isDirty &&
    saveStatus !== "saving",
  );

  const handleDisplayNameChange = (value: string) => {
    if (!editing || saveStatus === "saving") return;
    setDisplayName(value);
    setTouched(true);
    setSaveStatus("idle");
    setSaveMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setSaveMessage("");

    if (!editing || avatarSaving || saveStatus === "saving" || !isDirty) return;
    if (validationError || !profile.displayName) {
      displayNameInput.current?.focus();
      return;
    }

    setSaveStatus("saving");
    try {
      const result = await api<{ user: UserProfile }>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: normalizedDisplayName }),
      });
      setProfile(result.user);
      setDisplayName(result.user.displayName);
      setProfileRefreshKey(value => value + 1);
      setEditing(false);
      setSaveStatus("success");
      setSaveMessage("Đã lưu hồ sơ.");
      requestAnimationFrame(() => editButton.current?.focus());
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(
        error instanceof Error ? error.message : "Không lưu được hồ sơ.",
      );
    }
  };

  return (
    <DashboardLayout
      search=""
      onSearch={() => undefined}
      favoritesOnly={false}
      onFavorites={() => undefined}
      onCompose={() => undefined}
      activeItem="settings"
      showSearch={false}
      profileRefreshKey={profileRefreshKey}
    >
      <div className="settings-page">
        <header className="settings-header">
          <div>
            <span className="section-eyebrow">CÀI ĐẶT TÀI KHOẢN</span>
            <h1>Cài đặt tài khoản</h1>
            <p>Quản lý thông tin hồ sơ và theo dõi hạn mức sử dụng của bạn.</p>
          </div>
        </header>

        {account.error && <div role="alert" className="settings-load-error"><p>{account.error}</p>
          <button type="button" className="studio-button studio-button--subtle" onClick={account.reload}>Tải lại hồ sơ</button>
        </div>}
        {usage.error && <p role="alert">{usage.error}</p>}
        <div className="settings-grid">
          <section
            className="settings-card profile-card"
            aria-labelledby="profile-card-title"
          >
            <div className="settings-card__heading">
              <div>
                <span className="section-eyebrow">HỒ SƠ</span>
                <h2 id="profile-card-title">Thông tin cá nhân</h2>
              </div>
              <span className="settings-card__icon" aria-hidden="true">
                <Icon name="settings" size={17} />
              </span>
            </div>
            <p className="settings-card__description">
              Cập nhật tên hiển thị và xem thông tin tài khoản.
            </p>

            <div className="settings-preview-note" role="note">
              <Icon name="info" size={16} />
              <p>Thông tin được lấy từ tài khoản đang đăng nhập.</p>
            </div>

            {account.loading && !profile.displayName ? <ProfileSkeleton /> : <>
            <div className="profile-identity">
              <ProfileAvatar className="settings-avatar" displayName={profile.displayName} avatarUrl={avatarPreview ?? profile.avatarUrl} />
              <div className="profile-identity__copy">
                <strong>{profile.displayName ?? "Chưa có tên hiển thị"}</strong>
                <span>{avatarFile ? "Ảnh xem trước · Chưa lưu" : "Hồ sơ cá nhân"}</span>
              </div>
              <button ref={editButton} type="button" className="studio-button studio-button--subtle settings-edit"
                disabled={!profile.displayName || editing || avatarSaving || saveStatus === "saving"}
                onClick={() => {
                  setEditing(true); setSaveStatus("idle"); setSaveMessage(""); setTouched(false); setSubmitted(false);
                  requestAnimationFrame(() => displayNameInput.current?.focus());
                }}>
                Chỉnh sửa hồ sơ
              </button>
            </div>

            <div className="settings-avatar-upload">
              <label htmlFor="settings-avatar-file">Thay ảnh avatar</label>
              <input ref={avatarInput} id="settings-avatar-file" type="file" accept="image/png,image/jpeg,image/webp"
                disabled={!profile.displayName || avatarSaving || saveStatus === "saving"}
                aria-describedby="settings-avatar-hint"
                onChange={event => {
                  const file = event.target.files?.[0]; setAvatarMessage(""); setAvatarError(false);
                  if (!file) { setAvatarFile(null); return; }
                  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) {
                    setAvatarFile(null); event.target.value = ""; setAvatarError(true); setAvatarMessage("Chọn ảnh PNG, JPEG hoặc WebP tối đa 2 MB."); return;
                  }
                  setAvatarFile(file);
                }} />
              <p id="settings-avatar-hint">PNG, JPEG hoặc WebP tĩnh, tối đa 2 MB / 4096px. Ảnh hiển thị trong khung tròn.</p>
              {avatarFile && <div className="settings-avatar-actions">
                <button type="button" className="studio-button studio-button--primary" disabled={avatarSaving || saveStatus === "saving"} aria-busy={avatarSaving} onClick={() => void saveAvatar()}>
                  {avatarSaving ? "Đang lưu ảnh…" : "Lưu ảnh đại diện"}
                </button>
                <button type="button" className="studio-button studio-button--subtle" disabled={avatarSaving} onClick={() => { setAvatarFile(null); setAvatarMessage(""); if (avatarInput.current) avatarInput.current.value = ""; }}>Hủy chọn ảnh</button>
              </div>}
              {avatarMessage && <p role={avatarError ? "alert" : "status"} className={avatarError ? "settings-field__error" : "settings-avatar-success"}>{avatarMessage}</p>}
            </div>

            <form className="settings-form" onSubmit={handleSubmit} noValidate>
              <div className="settings-field">
                <label htmlFor="settings-display-name">Tên hiển thị</label>
                <div
                  className={`settings-field__control ${visibleValidationError ? "settings-field__control--invalid" : ""}`}
                >
                  <span className="settings-field__icon" aria-hidden="true">
                    <Icon name="sparkles" size={17} />
                  </span>
                  <input
                    ref={displayNameInput}
                    id="settings-display-name"
                    name="displayName"
                    type="text"
                    autoComplete="name"
                    placeholder="Nhập tên hiển thị của bạn"
                    value={displayName}
                    readOnly={!editing}
                    onChange={(event) =>
                      handleDisplayNameChange(event.target.value)
                    }
                    onBlur={() => setTouched(true)}
                    aria-invalid={Boolean(visibleValidationError)}
                    aria-describedby={
                      visibleValidationError
                        ? "settings-display-name-error"
                        : "settings-display-name-hint"
                    }
                    disabled={!profile.displayName || saveStatus === "saving"}
                  />
                </div>
                {visibleValidationError ? (
                  <p
                    className="settings-field__error"
                    id="settings-display-name-error"
                    role="alert"
                  >
                    <Icon name="info" size={13} />
                    {visibleValidationError}
                  </p>
                ) : (
                  <p
                    className="settings-field__hint"
                    id="settings-display-name-hint"
                  >
                    Tên sẽ được chuẩn hóa khoảng trắng ở đầu và cuối khi lưu.
                  </p>
                )}
              </div>

              <div className="settings-field">
                <label htmlFor="settings-email">Địa chỉ email</label>
                <div className="settings-field__control settings-field__control--readonly">
                  <span className="settings-field__icon" aria-hidden="true">
                    <Icon name="mail" size={17} />
                  </span>
                  <input
                    id="settings-email"
                    name="email"
                    type="email"
                    value={profile.email ?? "Chưa có tài khoản kết nối"}
                    readOnly
                    aria-readonly="true"
                    aria-describedby="settings-email-hint"
                  />
                  <span className="settings-readonly-badge">Chỉ đọc</span>
                </div>
                <p className="settings-field__hint" id="settings-email-hint">
                  Email đăng nhập hiện chỉ đọc. Khi chưa có ảnh avatar, hệ thống dùng chữ cái từ tên hiển thị.
                </p>
              </div>

              <div className="settings-form__footer">
                {editing ? <>
                <button
                  className="studio-button studio-button--primary settings-save"
                  type="submit"
                  disabled={!canSave}
                  aria-busy={saveStatus === "saving"}
                >
                  {saveStatus === "saving" ? (
                    <span className="settings-spinner" aria-hidden="true" />
                  ) : (
                    <Icon name="check" size={16} />
                  )}
                  {saveStatus === "saving" ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
                <button type="button" className="studio-button studio-button--subtle" disabled={saveStatus === "saving"}
                  onClick={() => {
                    setDisplayName(profile.displayName ?? ""); setEditing(false); setTouched(false); setSubmitted(false);
                    setSaveStatus("idle"); setSaveMessage(""); requestAnimationFrame(() => editButton.current?.focus());
                  }}>Hủy chỉnh sửa</button>
                </> : null}
                <span className="settings-save-hint">
                  {editing ? "Chỉ lưu khi tên hợp lệ và đã thay đổi." : "Nhấn Chỉnh sửa hồ sơ để cập nhật tên hiển thị."}
                </span>
              </div>
              {saveMessage && (
                <div
                  className={`settings-feedback settings-feedback--${saveStatus}`}
                  role={saveStatus === "error" ? "alert" : "status"}
                  aria-live="polite"
                >
                  <Icon
                    name={saveStatus === "success" ? "check" : "info"}
                    size={16}
                  />
                  <p>{saveMessage}</p>
                </div>
              )}
            </form>
            </>}
          </section>

          <UsageLimitsCard
            usage={usage.data ?? unavailableUsage}
            loading={usage.loading}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
