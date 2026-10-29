import { useEffect, useRef, useState, type FormEvent } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Icon from '../../components/ui/Icon';
import './AccountSettingsPage.css';

type AccountProfile = {
  displayName: string | null;
  email: string | null;
};

type UsageData = {
  grantedToday: number | null;
  remainingToday: number | null;
  resetAt: string | null;
};

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

const previewProfile: AccountProfile = {
  displayName: 'Người dùng bản xem trước',
  email: null,
};

const unavailableUsage: UsageData = {
  grantedToday: null,
  remainingToday: null,
  resetAt: null,
};

function getInitials(displayName: string | null) {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!words.length) return '';
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toLocaleUpperCase('vi-VN');
  const first = Array.from(words[0])[0] ?? '';
  const last = Array.from(words[words.length - 1])[0] ?? '';
  return `${first}${last}`.toLocaleUpperCase('vi-VN');
}

function validateDisplayName(value: string) {
  const normalized = value.trim();
  if (!normalized) return 'Vui lòng nhập tên hiển thị.';
  if (Array.from(normalized).length < 2) return 'Tên hiển thị cần có ít nhất 2 ký tự.';
  return '';
}

function formatResetTime(resetAt: string | null) {
  if (!resetAt) return 'Chưa có dữ liệu';
  const date = new Date(resetAt);
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

function InitialsAvatar({ displayName }: { displayName: string | null }) {
  const initials = getInitials(displayName);
  return (
    <div className="settings-avatar" role="img" aria-label={initials ? `Ảnh đại diện chữ cái ${initials}` : 'Ảnh đại diện mặc định'}>
      {initials || <Icon name="settings" size={25} />}
    </div>
  );
}

function ProfileSkeleton({ label = 'Đang tải thông tin tài khoản' }: { label?: string }) {
  return (
    <div className="settings-skeleton" aria-label={label} role="status">
      <span className="settings-skeleton__line settings-skeleton__line--wide" />
      <span className="settings-skeleton__line" />
      <span className="settings-skeleton__field" />
      <span className="settings-skeleton__field" />
    </div>
  );
}

function UsageLimitsCard({ usage = unavailableUsage, loading = false }: { usage?: UsageData; loading?: boolean }) {
  return (
    <section className="settings-card usage-limits-card" aria-labelledby="usage-limits-title">
      <div className="settings-card__heading">
        <div>
          <span className="section-eyebrow">HẠN MỨC SỬ DỤNG</span>
          <h2 id="usage-limits-title">Hạn mức sử dụng</h2>
        </div>
        <span className="settings-card__icon" aria-hidden="true"><Icon name="bolt" size={17} /></span>
      </div>
      <p className="settings-card__description">Theo dõi số lượt được cấp và thời điểm hạn mức được đặt lại.</p>
      {loading ? <ProfileSkeleton label="Đang tải thông tin hạn mức" /> : (
        <dl className="usage-list">
          <div className="usage-list__item">
            <dt>Lượt được cấp hôm nay</dt>
            <dd>{usage.grantedToday ?? 'Chưa có dữ liệu'}</dd>
          </div>
          <div className="usage-list__item">
            <dt>Lượt còn lại</dt>
            <dd>{usage.remainingToday ?? 'Chưa có dữ liệu'}</dd>
          </div>
          <div className="usage-list__item">
            <dt>Thời điểm đặt lại hạn mức</dt>
            <dd>{formatResetTime(usage.resetAt)}</dd>
          </div>
        </dl>
      )}
      <div className="settings-info-note" role="note">
        <Icon name="info" size={16} />
        <p>{loading ? 'Đang tải thông tin hạn mức.' : 'Chưa kết nối hệ thống hạn mức. Dữ liệu thật sẽ được lấy từ API khi backend sẵn sàng.'}</p>
      </div>
    </section>
  );
}

export default function AccountSettingsPage() {
  const [profile, setProfile] = useState<AccountProfile>(previewProfile);
  const [displayName, setDisplayName] = useState(previewProfile.displayName ?? '');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const displayNameInput = useRef<HTMLInputElement>(null);
  const demoTimer = useRef<number | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Cài đặt tài khoản — FLUX STUDIO';
    return () => {
      document.title = previousTitle;
      if (demoTimer.current !== null) window.clearTimeout(demoTimer.current);
    };
  }, []);

  const normalizedDisplayName = displayName.trim();
  const validationError = validateDisplayName(displayName);
  const visibleValidationError = validationError && (touched || submitted) ? validationError : '';
  const originalDisplayName = profile.displayName?.trim() ?? '';
  const isDirty = normalizedDisplayName !== originalDisplayName;
  const canSave = Boolean(profile.displayName && !validationError && isDirty && saveStatus !== 'saving');

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setTouched(true);
    setSaveStatus('idle');
    setSaveMessage('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setSaveMessage('');

    if (validationError || !profile.displayName) {
      displayNameInput.current?.focus();
      return;
    }

    setSaveStatus('saving');
    setSaveMessage('Đang lưu thay đổi trong bản xem trước…');
    demoTimer.current = window.setTimeout(() => {
      setProfile((current) => ({ ...current, displayName: normalizedDisplayName }));
      setDisplayName(normalizedDisplayName);
      setSaveStatus('success');
      setSaveMessage('Đã cập nhật thông tin trong bản xem trước. Thay đổi chưa được lưu lên máy chủ.');
    }, 450);
  };

  return (
    <DashboardLayout search="" onSearch={() => undefined} favoritesOnly={false} onFavorites={() => undefined} onCompose={() => undefined} activeItem="settings" showSearch={false}>
      <div className="settings-page">
        <header className="settings-header">
          <div>
            <span className="section-eyebrow">CÀI ĐẶT TÀI KHOẢN</span>
            <h1>Cài đặt tài khoản</h1>
            <p>Quản lý thông tin hồ sơ và theo dõi hạn mức sử dụng của bạn.</p>
          </div>
        </header>

        <div className="settings-grid">
          <section className="settings-card profile-card" aria-labelledby="profile-card-title">
            <div className="settings-card__heading">
              <div>
                <span className="section-eyebrow">HỒ SƠ</span>
                <h2 id="profile-card-title">Thông tin cá nhân</h2>
              </div>
              <span className="settings-card__icon" aria-hidden="true"><Icon name="settings" size={17} /></span>
            </div>
            <p className="settings-card__description">Cập nhật tên hiển thị và xem thông tin tài khoản.</p>

            <div className="settings-preview-note" role="note">
              <Icon name="info" size={16} />
              <p>Đang hiển thị hồ sơ minh họa cục bộ. Chưa có tài khoản xác thực được kết nối.</p>
            </div>

            <div className="profile-identity">
              <InitialsAvatar displayName={profile.displayName} />
              <div>
                <strong>{profile.displayName ?? 'Chưa có tên hiển thị'}</strong>
                <span>Avatar chữ cái · Không hỗ trợ tải ảnh lên</span>
              </div>
            </div>

            <form className="settings-form" onSubmit={handleSubmit} noValidate>
              <div className="settings-field">
                <label htmlFor="settings-display-name">Tên hiển thị</label>
                <div className={`settings-field__control ${visibleValidationError ? 'settings-field__control--invalid' : ''}`}>
                  <span className="settings-field__icon" aria-hidden="true"><Icon name="sparkles" size={17} /></span>
                  <input
                    ref={displayNameInput}
                    id="settings-display-name"
                    name="displayName"
                    type="text"
                    autoComplete="name"
                    placeholder="Nhập tên hiển thị của bạn"
                    value={displayName}
                    onChange={(event) => handleDisplayNameChange(event.target.value)}
                    onBlur={() => setTouched(true)}
                    aria-invalid={Boolean(visibleValidationError)}
                    aria-describedby={visibleValidationError ? 'settings-display-name-error' : 'settings-display-name-hint'}
                    disabled={!profile.displayName}
                  />
                </div>
                {visibleValidationError ? <p className="settings-field__error" id="settings-display-name-error" role="alert"><Icon name="info" size={13} />{visibleValidationError}</p> : <p className="settings-field__hint" id="settings-display-name-hint">Tên sẽ được chuẩn hóa khoảng trắng ở đầu và cuối khi lưu.</p>}
              </div>

              <div className="settings-field">
                <label htmlFor="settings-email">Địa chỉ email</label>
                <div className="settings-field__control settings-field__control--readonly">
                  <span className="settings-field__icon" aria-hidden="true"><Icon name="mail" size={17} /></span>
                  <input id="settings-email" name="email" type="email" value={profile.email ?? 'Chưa có tài khoản kết nối'} readOnly aria-readonly="true" aria-describedby="settings-email-hint" />
                  <span className="settings-readonly-badge">Chỉ đọc</span>
                </div>
                <p className="settings-field__hint" id="settings-email-hint">Email chỉ hiển thị khi hệ thống xác thực được kết nối.</p>
              </div>

              <div className="settings-form__footer">
                <button className="studio-button studio-button--primary settings-save" type="submit" disabled={!canSave} aria-busy={saveStatus === 'saving'}>
                  {saveStatus === 'saving' ? <span className="settings-spinner" aria-hidden="true" /> : <Icon name="check" size={16} />}
                  {saveStatus === 'saving' ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
                <span className="settings-save-hint">Chỉ bật khi tên hợp lệ và đã thay đổi.</span>
              </div>
              {saveMessage && <div className={`settings-feedback settings-feedback--${saveStatus}`} role={saveStatus === 'error' ? 'alert' : 'status'} aria-live="polite"><Icon name={saveStatus === 'success' ? 'check' : 'info'} size={16} /><p>{saveMessage}</p></div>}
            </form>
          </section>

          <UsageLimitsCard usage={unavailableUsage} />
        </div>
      </div>
    </DashboardLayout>
  );
}
