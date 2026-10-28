import Icon from '../ui/Icon';
export default function Brand() {
  return <a className="studio-brand" href="#home" aria-label="FLUX STUDIO — Trang tổng quan"><span className="studio-brand__symbol"><Icon name="sparkles" size={35} /></span><span className="studio-brand__wordmark"><span><strong>FLUX</strong> STUDIO</span><small>AI IMAGE GENERATOR</small></span></a>;
}
