import { useState, type MouseEventHandler } from "react";
import "./PrivateImage.css";

// Shared by library cards, detail/lightbox and delete confirmation.
export default function PrivateImage({ src, title, className = "", href, onFollow }: {
  src: string;
  title: string;
  className?: string;
  href?: string;
  onFollow?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const picture = <img key={src + attempt} className={className} src={src} alt={title}
    loading="lazy" onError={() => setFailed(true)} />;
  return failed ? (
    <div className={"private-image-fallback " + className}>
      <p role="status">Không tải được ảnh. Thông tin ảnh vẫn được giữ.</p>
      <button type="button" className="studio-button studio-button--subtle"
        onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>
        Tải lại ảnh
      </button>
    </div>
  ) : href ? <a href={href} onClick={onFollow}>{picture}</a> : picture;
}
