import { useEffect, useRef, type ReactNode } from 'react';
import Brand from '../components/dashboard/Brand';
import Icon from '../components/ui/Icon';
import './DashboardLayout.css';

type Props = { children: ReactNode; search: string; onSearch: (value: string) => void; favoritesOnly: boolean; onFavorites: (value: boolean) => void; onCompose: () => void };

function SidebarContent({ favoritesOnly, onFavorites, onCompose, onNavigate }: Pick<Props, 'favoritesOnly' | 'onFavorites' | 'onCompose'> & { onNavigate?: () => void }) {
  return <><div className="studio-sidebar__brand"><Brand /></div><div className="studio-sidebar__label">KHÔNG GIAN CỦA BẠN</div>
    <nav className="studio-nav" aria-label="Điều hướng chính">
      <a href="#home" className="studio-nav__item studio-nav__item--active" aria-current="page" onClick={onNavigate}><Icon name="home" />Tổng quan</a>
      <button className="studio-nav__item" onClick={() => { onNavigate?.(); requestAnimationFrame(onCompose); }}><Icon name="sparkles" />Tạo ảnh</button>
      <a href="#creations" className="studio-nav__item" onClick={() => { onFavorites(false); onNavigate?.(); }}><Icon name="image" />Thư viện ảnh</a>
      <button className="studio-nav__item" disabled title="Sẽ có khi kết nối backend"><Icon name="history" />Lịch sử<span className="studio-nav__soon">Sắp có</span></button>
      <a href="#creations" className={`studio-nav__item ${favoritesOnly ? 'studio-nav__item--selected' : ''}`} onClick={() => { onFavorites(true); onNavigate?.(); }}><Icon name="heart" />Yêu thích</a>
      <button className="studio-nav__item" disabled title="Sẽ được triển khai sau"><Icon name="settings" />Cài đặt<span className="studio-nav__soon">Sắp có</span></button>
    </nav>
    <div className="studio-sidebar__bottom"><div className="inspiration-card"><span className="inspiration-card__icon"><Icon name="sparkles" size={23} /></span><span className="inspiration-card__decoration" aria-hidden="true"><Icon name="sparkles" size={52} /></span><h2>Một ý tưởng.<br />Vô vàn khả năng.</h2><p>Viết điều bạn tưởng tượng.<br />Để cảm hứng bắt đầu.</p><button className="studio-button studio-button--primary" onClick={() => { onNavigate?.(); requestAnimationFrame(onCompose); }}>Bắt đầu sáng tạo<Icon name="arrow" size={17} /></button></div>
      <div className="usage-card"><div className="usage-card__heading"><span>Lượt sử dụng</span><span>Hôm nay</span></div><div className="usage-card__status"><span className="status-dot" />Chưa kết nối dịch vụ</div><p>Hạn mức sẽ hiển thị khi tài khoản và API sẵn sàng.</p></div>
      <div className="studio-sidebar__footer"><span className="status-dot" />FLUX STUDIO<span>v0.1</span></div></div></>;
}

export default function DashboardLayout({ children, search, onSearch, favoritesOnly, onFavorites, onCompose }: Props) {
  const drawer = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const account = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.current?.focus(); }
      if (event.key === 'Escape' && account.current) account.current.open = false;
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, []);
  const sidebarProps = { favoritesOnly, onFavorites, onCompose };
  return <div className="studio-shell" id="home"><a className="skip-link" href="#main-content">Chuyển đến nội dung</a>
    <aside className="studio-sidebar"><SidebarContent {...sidebarProps} /></aside>
    <dialog className="studio-drawer" ref={drawer} aria-label="Menu điều hướng" onClick={(event) => { if (event.target === event.currentTarget) drawer.current?.close(); }}><button className="studio-icon-button studio-drawer__close" aria-label="Đóng menu" onClick={() => drawer.current?.close()}><Icon name="close" /></button><SidebarContent {...sidebarProps} onNavigate={() => drawer.current?.close()} /></dialog>
    <div className="studio-workspace"><header className="studio-topbar"><button className="studio-icon-button studio-menu-toggle" aria-label="Mở menu điều hướng" onClick={() => drawer.current?.showModal()}><Icon name="menu" /></button>
      <div className="studio-search"><Icon name="search" size={18} /><input ref={searchInput} value={search} onChange={(event) => onSearch(event.target.value)} aria-label="Tìm ảnh minh họa theo tên" placeholder="Tìm cảm hứng trong bộ ảnh mẫu..." />{search ? <button className="studio-icon-button" onClick={() => onSearch('')} aria-label="Xóa tìm kiếm"><Icon name="close" size={15} /></button> : <kbd>Ctrl K</kbd>}</div>
      <div className="studio-topbar__right"><span className="preview-badge"><span className="status-dot" />Bản xem trước</span><span className="studio-topbar__divider" /><details className="account-menu" ref={account}><summary className="account-menu__trigger" aria-label="Thông tin không gian cá nhân"><span className="account-avatar">PV</span><span className="account-menu__name"><strong>Không gian cá nhân</strong><small>Chế độ giao diện</small></span><Icon name="chevron" size={16} /></summary><div className="account-menu__panel"><strong>Chào mừng đến FLUX STUDIO</strong><p>Đây là bản xem trước dashboard. Đăng nhập và đăng ký sẽ được kết nối sau.</p></div></details></div>
    </header><main className="studio-main" id="main-content">{children}</main><footer className="studio-footer"><span>FLUX STUDIO<span className="studio-footer__dot">·</span>Không gian cho những ý tưởng mới.</span><span>Thiết kế với Midnight Aurora</span></footer></div></div>;
}
