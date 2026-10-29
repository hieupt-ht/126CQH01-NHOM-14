import { useEffect, useRef, useState, type FormEvent } from 'react';
import Brand from '../../components/dashboard/Brand';
import Icon from '../../components/ui/Icon';
import loginArtwork from '../../assets/auth/login-aurora.png';
import './LoginPage.css';

type LoginValues = { email: string; password: string };
type LoginErrors = Partial<Record<keyof LoginValues, string>>;

function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  if (!values.email.trim()) errors.email = 'Vui lòng nhập địa chỉ email của bạn.';
  else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = 'Địa chỉ email chưa đúng định dạng.';
  if (!values.password) errors.password = 'Vui lòng nhập mật khẩu.';
  return errors;
}

export default function LoginPage() {
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState('');
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Đăng nhập — FLUX STUDIO';
    return () => { document.title = previousTitle; };
  }, []);

  const updateField = (field: keyof LoginValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFeedback('');
  };

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    setFeedback('');
    if (nextErrors.email) { emailInput.current?.focus(); return; }
    if (nextErrors.password) { passwordInput.current?.focus(); return; }

    // No authentication API exists yet: never simulate an authenticated session,
    // send credentials to /api/health, or redirect as though login succeeded.
    setFeedback('Đây là bản xem trước. Đăng nhập sẽ sẵn sàng khi dịch vụ tài khoản được kết nối. Bạn có thể khám phá giao diện qua “Xem studio”.');
  };

  return (
    <main className="login-page">
      <a className="login-skip-link" href="#login-form">Chuyển đến form đăng nhập</a>

      <section className="login-showcase" aria-labelledby="login-showcase-title">
        <img className="login-showcase__art" src={loginArtwork} alt="" fetchPriority="high" />
        <div className="login-showcase__scrim" aria-hidden="true" />

        <div className="login-showcase__brand"><Brand href="/" /></div>
        <span className="login-showcase__edition">THE MIDNIGHT COLLECTION</span>

        <div className="login-showcase__story">
          <div className="login-showcase__eyebrow"><span />NƠI Ý TƯỞNG BẮT ĐẦU</div>
          <h1 id="login-showcase-title">Biến ý tưởng<br />thành <span>hiện thực.</span></h1>
          <p>Từ một dòng mô tả, mở ra cả một thế giới.<br />Không gian sáng tạo tiếp theo bắt đầu từ bạn.</p>
          <div className="login-showcase__features">
            <span><Icon name="sparkles" size={16} />Tự do sáng tạo</span>
            <span><Icon name="image" size={16} />Lưu giữ cảm hứng</span>
          </div>
        </div>

        <div className="login-showcase__footer">
          <span><Icon name="sparkles" size={13} />ARTWORK MINH HỌA</span>
          <span>Một ý tưởng. Vô vàn khả năng.</span>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel__topbar">
          <span className="login-preview"><span />Bản xem trước</span>
          <a className="login-studio-link" href="/">Xem studio<Icon name="arrow" size={16} /></a>
        </div>

        <div className="login-card">
          <div className="login-card__emblem" aria-hidden="true"><Icon name="sparkles" size={26} /></div>
          <header className="login-heading">
            <span className="login-heading__eyebrow">KHÔNG GIAN SÁNG TẠO CỦA BẠN</span>
            <h2 id="login-title">Chào mừng<br /> trở lại<span>.</span></h2>
            <p>Đăng nhập để tiếp tục những ý tưởng còn dang dở.</p>
          </header>

          <form className="login-form" id="login-form" onSubmit={submitLogin} noValidate>
            <div className="login-field">
              <label htmlFor="login-email">Địa chỉ email</label>
              <div className={`login-field__control ${errors.email ? 'login-field__control--invalid' : ''}`}>
                <span className="login-field__icon"><Icon name="mail" size={18} /></span>
                <input ref={emailInput} id="login-email" name="email" type="email"
                  autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}
                  placeholder="ban@example.com" value={values.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} />
              </div>
              {errors.email && <p className="login-field__error" id="login-email-error" role="alert"><Icon name="info" size={13} />{errors.email}</p>}
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Mật khẩu</label>
              <div className={`login-field__control ${errors.password ? 'login-field__control--invalid' : ''}`}>
                <span className="login-field__icon"><Icon name="lock" size={18} /></span>
                <input ref={passwordInput} id="login-password" name="password"
                  type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="Nhập mật khẩu của bạn" value={values.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} />
                <button className="login-password-toggle" type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
              {errors.password && <p className="login-field__error" id="login-password-error" role="alert"><Icon name="info" size={13} />{errors.password}</p>}
            </div>

            <button className="login-submit" type="submit">Đăng nhập<Icon name="arrow" size={19} /></button>
            {feedback && <div className="login-feedback" role="status"><Icon name="info" size={17} /><p>{feedback}</p></div>}
          </form>

          <div className="login-register">
            <span>Chưa có tài khoản?</span>
            <a className="login-register__upcoming" href="/register">Đăng ký</a>
          </div>

          <div className="login-card__closing"><span /><Icon name="sparkles" size={14} /><span /></div>
          <p className="login-card__note">Những điều tuyệt vời bắt đầu từ trí tưởng tượng.</p>
        </div>

        <footer className="login-panel__footer"><span>FLUX STUDIO</span><span>Được tạo nên cho những ý tưởng mới.</span></footer>
      </section>
    </main>
  );
}
