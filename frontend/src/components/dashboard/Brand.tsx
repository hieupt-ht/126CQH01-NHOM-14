import Icon from '../ui/Icon';
import './Brand.css';

export default function Brand({ href = '/app', className = '' }: { href?: string; className?: string }) {
  return (
    <a className={`studio-brand ${className}`} href={href} aria-label="FLUX STUDIO — Trang tổng quan">
      <span className="studio-brand__symbol"><Icon name="sparkles" size={35} /></span>
      <span className="studio-brand__wordmark">
        <span><strong>FLUX</strong> STUDIO</span>
        <small>AI IMAGE GENERATOR</small>
      </span>
    </a>
  );
}
