import logo from '../../assets/brand/logo-flux-studio.png';
import './Brand.css';

export default function Brand({ href = '/app', className = '' }: { href?: string; className?: string }) {
  return (
    <a className={`studio-brand ${className}`} href={href} aria-label="FLUX STUDIO — Trang tổng quan">
      <img className="studio-brand__logo" src={logo} alt="" />
    </a>
  );
}
