import { useState, type FormEvent } from 'react';

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'eye':
      return (
        <svg {...commonProps}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case 'eye-off':
      return (
        <svg {...commonProps}>
          <path d="m3 3 18 18" />
          <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17.3 17.3 0 0 1-3.1 3.7" />
          <path d="M6.1 6.9C3.9 8.5 2.5 12 2.5 12S6 18 12 18c1 0 1.9-.2 2.7-.5" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...commonProps}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...commonProps}>
          <path d="m12 3-1.3 4.7L6 9l4.7 1.3L12 15l1.3-4.7L18 9l-4.7-1.3L12 3Z" />
          <path d="m19 14-.7 2.3L16 17l2.3.7L19 20l.7-2.3L22 17l-2.3-.7L19 14Z" />
          <path d="m5 15-.5 1.5L3 17l1.5.5L5 19l.5-1.5L7 17l-1.5-.5L5 15Z" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...commonProps}>
          <path d="M12 3 5 6v5c0 4.7 2.9 8.1 7 10 4.1-1.9 7-5.3 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    default:
      return null;
  }
}

function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = 'Vui lòng nhập email.';
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Email chưa đúng định dạng.';
  }

  if (!values.password) {
    errors.password = 'Vui lòng nhập mật khẩu.';
  }

  return errors;
}

function LoginPage() {
  const [values, setValues] = useState<LoginFormValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (field: keyof LoginFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateLoginForm(values);
    setErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    // The backend currently exposes only /api/health. Keep this boundary ready
    // for the confirmed auth contract without faking a successful login.
    await Promise.resolve();
    setIsSubmitting(false);
    setSubmitError('Đăng nhập hiện chưa được kết nối với máy chủ. Vui lòng thử lại sau.');
  };

  return (
    <main className="login-page">
      <section className="login-visual" aria-labelledby="visual-title">
        <div className="aurora-orbit aurora-orbit-one" />
        <div className="aurora-orbit aurora-orbit-two" />
        <div className="aurora-glow aurora-glow-one" />
        <div className="aurora-glow aurora-glow-two" />

        <div className="visual-content">
          <a className="brand-mark" href="/login" aria-label="FLUX STUDIO - Trang đăng nhập">
            <span className="brand-symbol" aria-hidden="true">
              <Icon name="sparkles" size={24} />
            </span>
            <span>
              <strong>FLUX</strong> STUDIO
              <small>AI IMAGE GENERATOR</small>
            </span>
          </a>

          <div className="visual-copy">
            <span className="eyebrow">MIDNIGHT AURORA</span>
            <h1 id="visual-title">
              Biến ý tưởng
              <span> thành hình ảnh.</span>
            </h1>
            <p>
              Bước vào không gian sáng tạo nơi những mô tả của bạn được chuẩn bị để trở thành
              những tác phẩm giàu cảm hứng.
            </p>
          </div>

          <div className="visual-art" aria-label="Minh họa trừu tượng Midnight Aurora" role="img">
            <div className="art-sun" />
            <div className="art-ribbon art-ribbon-one" />
            <div className="art-ribbon art-ribbon-two" />
            <div className="art-star art-star-one" />
            <div className="art-star art-star-two" />
            <div className="art-caption">
              <span className="caption-dot" />
              <span>Không gian sáng tạo của bạn</span>
            </div>
          </div>

          <div className="visual-footer">
            <span><Icon name="shield" size={16} /> Không gian riêng tư</span>
            <span><Icon name="sparkles" size={16} /> Sẵn sàng khám phá</span>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel-inner">
          <div className="mobile-brand brand-mark" aria-label="FLUX STUDIO">
            <span className="brand-symbol" aria-hidden="true">
              <Icon name="sparkles" size={22} />
            </span>
            <span><strong>FLUX</strong> STUDIO<small>AI IMAGE GENERATOR</small></span>
          </div>

          <div className="login-header">
            <span className="eyebrow">CHÀO MỪNG TRỞ LẠI</span>
            <h2 id="login-title">Đăng nhập</h2>
            <p>Đăng nhập để tiếp tục hành trình sáng tạo cùng FLUX STUDIO.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={(event) => handleChange('email', event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={errors.email ? 'has-error' : ''}
              />
              {errors.email && <span className="field-error" id="email-error">{errors.email}</span>}
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <label htmlFor="password">Mật khẩu</label>
              </div>
              <div className="password-input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={values.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={errors.password ? 'has-error' : ''}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={19} />
                </button>
              </div>
              {errors.password && <span className="field-error" id="password-error">{errors.password}</span>}
            </div>

            {submitError && (
              <div className="form-alert" role="alert">
                <span className="alert-icon"><Icon name="shield" size={17} /></span>
                <span>{submitError}</span>
              </div>
            )}

            <button className="login-submit" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? (
                <><span className="button-spinner" aria-hidden="true" /> Đang xử lý...</>
              ) : (
                <>Đăng nhập <Icon name="arrow-right" size={18} /></>
              )}
            </button>
          </form>

          <p className="register-prompt">
            Chưa có tài khoản? <a href="/register">Tạo tài khoản</a>
          </p>

          <p className="login-note">
            <Icon name="shield" size={15} /> Thông tin của bạn được bảo vệ trong suốt quá trình sử dụng.
          </p>
        </div>
      </section>
    </main>
  );
}

function App() {
  return <LoginPage />;
}

export default App;
