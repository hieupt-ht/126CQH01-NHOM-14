import { useEffect, useRef, useState, type FormEvent } from "react";
import Brand from "../../components/dashboard/Brand";
import Icon from "../../components/ui/Icon";
import loginArtwork from "../../assets/auth/login-aurora.png";
import "./LoginPage.css";
import "./RegisterPage.css";
import { api } from "../../services/api";
import { UI_PREVIEW } from "../../services/uiPreview";

type RegisterField = "fullName" | "email" | "password" | "confirmPassword";
type RegisterValues = Record<RegisterField, string>;
type RegisterErrors = Partial<Record<RegisterField, string>>;

const initialValues: RegisterValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  const fullName = values.fullName.trim();

  if (!fullName) errors.fullName = "Vui lòng nhập họ và tên.";
  else if (fullName.length > 80)
    errors.fullName = "Tên hiển thị tối đa 80 ký tự.";

  if (!values.email.trim())
    errors.email = "Vui lòng nhập địa chỉ email của bạn.";
  else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) {
    errors.email = "Địa chỉ email chưa đúng định dạng.";
  }

  if (!values.password) errors.password = "Vui lòng tạo mật khẩu.";
  else if (values.password.length > 128)
    errors.password = "Mật khẩu tối đa 128 ký tự.";
  else if (values.password.length < 8)
    errors.password = "Mật khẩu cần có ít nhất 8 ký tự.";

  if (!values.confirmPassword)
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Mật khẩu xác nhận chưa khớp.";
  }

  return errors;
}

function firstInvalidField(errors: RegisterErrors): RegisterField | undefined {
  return (
    ["fullName", "email", "password", "confirmPassword"] as RegisterField[]
  ).find((field) => Boolean(errors[field]));
}

export default function RegisterPage() {
  const [values, setValues] = useState<RegisterValues>(initialValues);
  const [touched, setTouched] = useState<
    Partial<Record<RegisterField, boolean>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const fieldRefs = useRef<
    Partial<Record<RegisterField, HTMLInputElement | null>>
  >({});

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Đăng ký — FLUX STUDIO";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const errors = validateRegister(values);
  const isVisibleError = (field: RegisterField) =>
    Boolean(errors[field] && (submitted || touched[field]));

  const updateField = (field: RegisterField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setTouched((current) => ({ ...current, [field]: true }));
    setFeedback("");
  };

  const markTouched = (field: RegisterField) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const submitRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setFeedback("");

    const nextErrors = validateRegister(values);
    const invalidField = firstInvalidField(nextErrors);
    if (invalidField) {
      fieldRefs.current[invalidField]?.focus();
      return;
    }

    if (isSubmitting) return;
    if (UI_PREVIEW) {
      setFeedback("Xem thử giao diện: chưa tạo hoặc lưu tài khoản. Bạn có thể sang Đăng nhập để vào Dashboard; không cần tài khoản thật.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          displayName: values.fullName.trim(),
          email: values.email,
          password: values.password,
        }),
      });
      setValues(initialValues);
      setTouched({});
      setSubmitted(false);
      setFeedback("Đã tạo tài khoản. Bạn có thể đăng nhập để tiếp tục.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Không thể đăng ký.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page register-page">
      <a className="login-skip-link" href="#register-form">
        Chuyển đến form đăng ký
      </a>

      <section
        className="login-showcase register-showcase"
        aria-labelledby="register-showcase-title"
      >
        <img
          className="login-showcase__art"
          src={loginArtwork}
          alt=""
          fetchPriority="high"
        />
        <div className="login-showcase__scrim" aria-hidden="true" />

        <div className="login-showcase__brand">
          <Brand href="/" />
        </div>
        <span className="login-showcase__edition">THE MIDNIGHT COLLECTION</span>

        <div className="login-showcase__story">
          <div className="login-showcase__eyebrow">
            <span />
            KHÔNG GIAN SÁNG TẠO
          </div>
          <h1 id="register-showcase-title">
            Bắt đầu từ
            <br />
            <span>ý tưởng</span> của bạn.
          </h1>
          <p>
            Một tài khoản nhỏ. Một thế giới rộng lớn.
            <br />
            Nơi cảm hứng bắt đầu thành hình.
          </p>
          <div className="login-showcase__features">
            <span>
              <Icon name="sparkles" size={16} />
              Tự do sáng tạo
            </span>
            <span>
              <Icon name="image" size={16} />
              Lưu giữ cảm hứng
            </span>
          </div>
        </div>

        <div className="login-showcase__footer">
          <span>
            <Icon name="sparkles" size={13} />
            ARTWORK MINH HỌA
          </span>
          <span>Một ý tưởng. Vô vàn khả năng.</span>
        </div>
      </section>

      <section
        className="login-panel register-panel"
        aria-labelledby="register-title"
      >
        <div className="login-panel__topbar">
          <span className="login-preview">
            <span />
            FLUX STUDIO
          </span>
          <a className="login-studio-link" href="/">
            Xem studio
            <Icon name="arrow" size={16} />
          </a>
        </div>

        <div className="register-card">
          <div className="login-card__emblem" aria-hidden="true">
            <Icon name="sparkles" size={26} />
          </div>
          <header className="login-heading register-heading">
            <span className="login-heading__eyebrow">
              KHÔNG GIAN SÁNG TẠO CỦA BẠN
            </span>
            <h2 id="register-title">
              Tạo
              <br />
              tài khoản<span>.</span>
            </h2>
            <p>
              Tham gia FLUX STUDIO và bắt đầu biến những ý tưởng thành hình ảnh.
            </p>
          </header>

          <form
            className="register-form"
            id="register-form"
            onSubmit={submitRegister}
            noValidate
          >
            <RegisterField
              field="fullName"
              label="Họ và tên"
              placeholder="Nhập họ và tên của bạn"
              type="text"
              icon="sparkles"
              value={values.fullName}
              error={isVisibleError("fullName") ? errors.fullName : undefined}
              inputRef={(element) => {
                fieldRefs.current.fullName = element;
              }}
              onChange={updateField}
              onBlur={markTouched}
            />
            <RegisterField
              field="email"
              label="Địa chỉ email"
              placeholder="ban@example.com"
              type="email"
              icon="mail"
              value={values.email}
              error={isVisibleError("email") ? errors.email : undefined}
              inputMode="email"
              inputRef={(element) => {
                fieldRefs.current.email = element;
              }}
              onChange={updateField}
              onBlur={markTouched}
            />
            <PasswordField
              field="password"
              label="Mật khẩu"
              placeholder="Tạo mật khẩu của bạn"
              value={values.password}
              error={isVisibleError("password") ? errors.password : undefined}
              visible={showPassword}
              inputRef={(element) => {
                fieldRefs.current.password = element;
              }}
              onToggle={() => setShowPassword((current) => !current)}
              onChange={updateField}
              onBlur={markTouched}
            />
            <PasswordField
              field="confirmPassword"
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu của bạn"
              value={values.confirmPassword}
              error={
                isVisibleError("confirmPassword")
                  ? errors.confirmPassword
                  : undefined
              }
              visible={showConfirmPassword}
              inputRef={(element) => {
                fieldRefs.current.confirmPassword = element;
              }}
              onToggle={() => setShowConfirmPassword((current) => !current)}
              onChange={updateField}
              onBlur={markTouched}
            />

            <button
              className="login-submit register-submit"
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Đang chuẩn bị..." : "Tạo tài khoản"}
              <Icon name="arrow" size={19} />
            </button>
            {feedback && (
              <div className="login-feedback" role="status" aria-live="polite">
                <Icon name="info" size={17} />
                <p>{feedback}</p>
              </div>
            )}
          </form>

          <div className="login-register">
            <span>Đã có tài khoản?</span>
            <a
              className="login-register__upcoming register-login-link"
              href="/login"
            >
              Đăng nhập
            </a>
          </div>

          <div className="login-card__closing">
            <span />
            <Icon name="sparkles" size={14} />
            <span />
          </div>
          <p className="login-card__note">
            Những điều tuyệt vời bắt đầu từ trí tưởng tượng.
          </p>
        </div>

        <footer className="login-panel__footer">
          <span>FLUX STUDIO</span>
          <span>Được tạo nên cho những ý tưởng mới.</span>
        </footer>
      </section>
    </main>
  );
}

function RegisterField({
  field,
  label,
  placeholder,
  type,
  icon,
  value,
  error,
  inputMode,
  inputRef,
  onChange,
  onBlur,
}: {
  field: RegisterField;
  label: string;
  placeholder: string;
  type: string;
  icon: "mail" | "sparkles";
  value: string;
  error?: string;
  inputMode?: "email";
  inputRef: (element: HTMLInputElement | null) => void;
  onChange: (field: RegisterField, value: string) => void;
  onBlur: (field: RegisterField) => void;
}) {
  const errorId = `register-${field}-error`;
  return (
    <div className="login-field">
      <label htmlFor={`register-${field}`}>{label}</label>
      <div
        className={`login-field__control ${error ? "login-field__control--invalid" : ""}`}
      >
        <span className="login-field__icon">
          <Icon name={icon} size={18} />
        </span>
        <input
          ref={inputRef}
          id={`register-${field}`}
          name={field}
          type={type}
          autoComplete={field === "email" ? "email" : "name"}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(field, event.target.value)}
          onBlur={() => onBlur(field)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error && (
        <p className="login-field__error" id={errorId} role="alert">
          <Icon name="info" size={13} />
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  field,
  label,
  placeholder,
  value,
  error,
  visible,
  inputRef,
  onToggle,
  onChange,
  onBlur,
}: {
  field: "password" | "confirmPassword";
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  visible: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
  onToggle: () => void;
  onChange: (field: RegisterField, value: string) => void;
  onBlur: (field: RegisterField) => void;
}) {
  const errorId = `register-${field}-error`;
  return (
    <div className="login-field">
      <label htmlFor={`register-${field}`}>{label}</label>
      <div
        className={`login-field__control ${error ? "login-field__control--invalid" : ""}`}
      >
        <span className="login-field__icon">
          <Icon name="lock" size={18} />
        </span>
        <input
          ref={inputRef}
          id={`register-${field}`}
          name={field}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(field, event.target.value)}
          onBlur={() => onBlur(field)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          className="login-password-toggle"
          type="button"
          onClick={onToggle}
          aria-label={
            visible
              ? `Ẩn ${label.toLocaleLowerCase()}`
              : `Hiện ${label.toLocaleLowerCase()}`
          }
          aria-pressed={visible}
        >
          <Icon name={visible ? "eye-off" : "eye"} size={18} />
        </button>
      </div>
      {error && (
        <p className="login-field__error" id={errorId} role="alert">
          <Icon name="info" size={13} />
          {error}
        </p>
      )}
    </div>
  );
}
