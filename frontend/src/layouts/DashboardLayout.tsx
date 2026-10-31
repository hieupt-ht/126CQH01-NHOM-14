import { useEffect, useRef, type ReactNode } from "react";
import { useState } from "react";
import { api, type UserProfile } from "../services/api";
import { UI_PREVIEW } from "../services/uiPreview";
import { useResource, type UsageRecord } from "../services/resources";
import Brand from "../components/dashboard/Brand";
import Icon from "../components/ui/Icon";
import "./DashboardLayout.css";

type Props = {
  children: ReactNode;
  search: string;
  onSearch: (value: string) => void;
  favoritesOnly: boolean;
  onFavorites: (value: boolean) => void;
  onCompose: () => void;
  activeItem?: "home" | "create" | "library" | "history" | "settings";
  showSearch?: boolean;
};
type SidebarProps = Pick<
  Props,
  "favoritesOnly" | "onFavorites" | "onCompose" | "activeItem"
> & { onNavigate?: () => void; usage: UsageRecord | null; usageError: string };

function SidebarContent({
  favoritesOnly,
  onFavorites,
  onCompose,
  activeItem = "home",
  onNavigate,
  usage,
  usageError,
}: SidebarProps) {
  return (
    <>
      <div className="studio-sidebar__brand">
        <Brand />
      </div>
      <div className="studio-sidebar__label">KHÔNG GIAN CỦA BẠN</div>
      <nav className="studio-nav" aria-label="Điều hướng chính">
        <a
          href="/app"
          className={`studio-nav__item ${activeItem === "home" ? "studio-nav__item--active" : ""}`}
          aria-current={activeItem === "home" ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon name="home" />
          Tổng quan
        </a>
        <a
          href="/app/create"
          className={`studio-nav__item ${activeItem === "create" ? "studio-nav__item--active" : ""}`}
          aria-current={activeItem === "create" ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon name="sparkles" />
          Tạo ảnh
        </a>
        <a
          href="/app/library"
          className={`studio-nav__item ${activeItem === "library" ? "studio-nav__item--active" : ""}`}
          aria-current={activeItem === "library" ? "page" : undefined}
          onClick={() => {
            onFavorites(false);
            onNavigate?.();
          }}
        >
          <Icon name="image" />
          Thư viện ảnh
        </a>
        <a
          href="/app/history"
          className={`studio-nav__item ${activeItem === "history" ? "studio-nav__item--active" : ""}`}
          aria-current={activeItem === "history" ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon name="history" />
          Lịch sử
        </a>
        {activeItem === "home" && (
          <a
            href="#creations"
            className={`studio-nav__item ${favoritesOnly ? "studio-nav__item--selected" : ""}`}
            onClick={() => {
              onFavorites(true);
              onNavigate?.();
            }}
          >
            <Icon name="heart" />
            Yêu thích
          </a>
        )}
        <a
          href="/app/settings"
          className={`studio-nav__item ${activeItem === "settings" ? "studio-nav__item--active" : ""}`}
          aria-current={activeItem === "settings" ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon name="settings" />
          Cài đặt
        </a>
      </nav>
      <div className="studio-sidebar__bottom">
        <div className="inspiration-card">
          <span className="inspiration-card__icon">
            <Icon name="sparkles" size={23} />
          </span>
          <span className="inspiration-card__decoration" aria-hidden="true">
            <Icon name="sparkles" size={52} />
          </span>
          <h2>
            Một ý tưởng.
            <br />
            Vô vàn khả năng.
          </h2>
          <p>
            Viết điều bạn tưởng tượng.
            <br />
            Để cảm hứng bắt đầu.
          </p>
          <button
            className="studio-button studio-button--primary"
            onClick={() => {
              onNavigate?.();
              if (activeItem === "home" || activeItem === "create")
                requestAnimationFrame(onCompose);
              else window.location.assign("/app/create");
            }}
          >
            Bắt đầu sáng tạo
            <Icon name="arrow" size={17} />
          </button>
        </div>
        <div className="usage-card">
          <div className="usage-card__heading">
            <span>Lượt sử dụng</span>
            <span>Hôm nay</span>
          </div>
          <div className="usage-card__status">
            <span className="status-dot" />
            Lượt còn: {usage?.remainingToday ?? "Đang tải…"}
          </div>
          <p>
            {usageError ||
              (usage?.configured
                ? "Đặt lại lúc 07:00 sáng giờ Việt Nam."
                : "Chưa bật dịch vụ tạo ảnh.")}
          </p>
        </div>
        <div className="studio-sidebar__footer">
          <span className="status-dot" />
          FLUX STUDIO<span>v0.1</span>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
  search,
  onSearch,
  favoritesOnly,
  onFavorites,
  onCompose,
  activeItem = "home",
  showSearch = true,
}: Props) {
  const usage = useResource<UsageRecord>("/usage/me");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accountError, setAccountError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    void api<{ user: UserProfile }>("/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setAccountError("Không tải được hồ sơ."));
  }, []);
  const logout = async () => {
    setLoggingOut(true);
    setAccountError("");
    try {
      await api("/auth/logout", { method: "POST" });
      window.location.replace("/login");
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : "Chưa đăng xuất được.",
      );
      setLoggingOut(false);
    }
  };
  const drawer = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const account = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        showSearch &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === "Escape" && account.current)
        account.current.open = false;
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showSearch]);
  const sidebarProps = {
    favoritesOnly,
    onFavorites,
    onCompose,
    activeItem,
    usage: usage.data,
    usageError: usage.error,
  };
  return (
    <div className="studio-shell" id="home">
      <a className="skip-link" href="#main-content">
        Chuyển đến nội dung
      </a>
      <aside className="studio-sidebar">
        <SidebarContent {...sidebarProps} />
      </aside>
      <dialog
        className="studio-drawer"
        ref={drawer}
        aria-label="Menu điều hướng"
        onClick={(event) => {
          if (event.target === event.currentTarget) drawer.current?.close();
        }}
      >
        <button
          className="studio-icon-button studio-drawer__close"
          aria-label="Đóng menu"
          onClick={() => drawer.current?.close()}
        >
          <Icon name="close" />
        </button>
        <SidebarContent
          {...sidebarProps}
          onNavigate={() => drawer.current?.close()}
        />
      </dialog>
      <div className="studio-workspace">
        <header className="studio-topbar">
          <button
            className="studio-icon-button studio-menu-toggle"
            aria-label="Mở menu điều hướng"
            onClick={() => drawer.current?.showModal()}
          >
            <Icon name="menu" />
          </button>
          {showSearch && (
            <div className="studio-search">
              <Icon name="search" size={18} />
              <input
                ref={searchInput}
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                aria-label="Tìm ảnh minh họa theo tên"
                placeholder="Tìm cảm hứng trong bộ ảnh mẫu..."
              />
              {search ? (
                <button
                  className="studio-icon-button"
                  onClick={() => onSearch("")}
                  aria-label="Xóa tìm kiếm"
                >
                  <Icon name="close" size={15} />
                </button>
              ) : (
                <kbd>Ctrl K</kbd>
              )}
            </div>
          )}
          <div className="studio-topbar__right">
            <span className="preview-badge">
              <span className="status-dot" />
              {UI_PREVIEW ? "XEM THỬ UI" : "FLUX STUDIO"}
            </span>
            <span className="studio-topbar__divider" />
            <details className="account-menu" ref={account}>
              <summary
                className="account-menu__trigger"
                aria-label="Thông tin không gian cá nhân"
              >
                <span className="account-avatar">
                  {user?.displayName.slice(0, 2).toLocaleUpperCase("vi-VN") ??
                    "…"}
                </span>
                <span className="account-menu__name">
                  <strong>{user?.displayName ?? "Tài khoản"}</strong>
                  <small>Không gian cá nhân</small>
                </span>
                <Icon name="chevron" size={16} />
              </summary>
              <div className="account-menu__panel">
                <strong>Chào mừng đến FLUX STUDIO</strong>
                <p>{user?.email}</p>
                <a href="/app/settings">Cài đặt tài khoản</a>
                <button
                  className="studio-button studio-button--subtle"
                  disabled={loggingOut}
                  onClick={logout}
                >
                  {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
                </button>
                {accountError && <p role="alert">{accountError}</p>}
              </div>
            </details>
          </div>
        </header>
        <main className="studio-main" id="main-content">
          {children}
        </main>
        <footer className="studio-footer">
          <span>
            FLUX STUDIO<span className="studio-footer__dot">·</span>Không gian
            cho những ý tưởng mới.
          </span>
          <span>Thiết kế với Midnight Aurora</span>
        </footer>
      </div>
    </div>
  );
}
