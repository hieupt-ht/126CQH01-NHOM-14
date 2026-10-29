import { useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import ReferenceArtwork from '../dashboard/ReferenceArtwork';
import type { LibraryImage } from '../../pages/library/libraryDemoData';

export type ImageCardAction = 'view' | 'download' | 'rename' | 'delete';

type Props = {
  image: LibraryImage;
  imageUnavailable?: boolean;
  onAction: (action: ImageCardAction, image: LibraryImage, trigger: HTMLButtonElement) => void;
};

export default function ImageCard({ image, imageUnavailable = false, onAction }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && event.target !== triggerRef.current) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  const selectAction = (action: ImageCardAction) => {
    setMenuOpen(false);
    onAction(action, image, triggerRef.current as HTMLButtonElement);
  };

  const showFallback = imageUnavailable || imageLoadFailed;
  return <article className="library-image-card">
    <div className="library-image-card__visual">
      {showFallback ? <div className="library-image-card__fallback" role="img" aria-label={`Không tải được ảnh minh họa: ${image.title}`}><Icon name="image" size={27} /><strong>Không tải được ảnh minh họa</strong><span>Giữ nguyên khung ảnh</span></div> : <ReferenceArtwork region={image.region} label={`Ảnh minh họa: ${image.title}`} className="library-image-card__art" onError={() => setImageLoadFailed(true)} />}
      <span className="library-image-card__demo">Ảnh minh họa</span>
      <button ref={triggerRef} type="button" className="library-image-card__menu-trigger" aria-label={`Mở thao tác cho ${image.title}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={(event) => { event.stopPropagation(); setMenuOpen((open) => !open); }}><Icon name="more" size={18} /></button>
      {menuOpen && <div className="library-image-card__menu" ref={menuRef} role="menu" aria-label={`Thao tác cho ${image.title}`}>
        <button type="button" role="menuitem" onClick={() => selectAction('view')}><Icon name="image" size={15} />Xem chi tiết</button>
        <button type="button" role="menuitem" onClick={() => selectAction('download')}><Icon name="arrow" size={15} />Tải ảnh minh họa</button>
        <button type="button" role="menuitem" onClick={() => selectAction('rename')}><Icon name="wand" size={15} />Đổi tên</button>
        <button type="button" role="menuitem" className="library-menu__danger" onClick={() => selectAction('delete')}><Icon name="close" size={15} />Xóa khỏi bản minh họa</button>
      </div>}
    </div>
    <div className="library-image-card__body">
      <h2 title={image.title}>{image.title}</h2>
      <p>{image.category}</p>
      <dl><div><dt>Thời điểm</dt><dd>{image.createdAtLabel}</dd></div><div><dt>Model</dt><dd>{image.modelLabel}</dd></div></dl>
    </div>
  </article>;
}
