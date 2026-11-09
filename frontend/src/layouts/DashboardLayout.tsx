import { useEffect, useRef, type ReactNode } from "react";
import { useState } from "react";
import { api, type UserProfile } from "../services/api";
import { UI_PREVIEW } from "../services/uiPreview";
import Brand from "../components/dashboard/Brand";
import Icon from "../components/ui/Icon";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import ThemeToggle from "../components/ui/ThemeToggle";
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
  profileRefreshKey?: number;
};
type SidebarProps = Pick<
  Props,
  "favoritesOnly" | "onFavorites" | "onCompose" | "activeItem"
> & { onNavigate?: () => void };

function SidebarContent({
  favoritesOnly,
  onFavorites,
  onCompose,
  activeItem = "home",
  onNavigate,
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
  profileRefreshKey = 0,
}: Props) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accountError, setAccountError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ user: UserProfile }>("/auth/me", { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setUser(result.user); })
      .catch(() => { if (!controller.signal.aborted) setAccountError("Không tải được hồ sơ."); });
    return () => controller.abort();
  }, [profileRefreshKey]);
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
            <ThemeToggle />
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
                <ProfileAvatar className="account-avatar" displayName={user?.displayName ?? null} avatarUrl={user?.avatarUrl} />
                <span className="account-menu__name">
                  <strong title={user?.displayName}>{user?.displayName ?? "Tài khoản"}</strong>
                  <small>Không gian cá nhân</small>
                </span>
                <Icon name="chevron" size={16} />
              </summary>
              <div className="account-menu__panel">
                <div className="account-menu__identity">
                  <ProfileAvatar className="account-avatar account-menu__avatar" displayName={user?.displayName ?? null} avatarUrl={user?.avatarUrl} />
                  <div className="account-menu__identity-text">
                    <strong title={user?.displayName}>{user?.displayName ?? "Tài khoản"}</strong>
                    <p title={user?.email}>{user?.email}</p>
                  </div>
                </div>
                <div className="account-menu__actions">
                <a className="account-menu__action" href="/app/settings"><Icon name="settings" size={18} /> Cài đặt tài khoản</a>
                <button
                  className="account-menu__action account-menu__logout"
                  disabled={loggingOut}
                  onClick={logout}
                >
                  <Icon name="arrow" size={18} />
                  {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
                </button>
                </div>
                {accountError && <p className="account-menu__error" role="alert">{accountError}</p>}
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
