import type { ReactNode } from 'react';
import ReferenceArtwork from './ReferenceArtwork';
import ArtworkMotion from '../ui/ArtworkMotion';
import './StudioHero.css';

/** Shared crop, blend and motion geometry for Dashboard and Create. */
export default function StudioHero({ id, eyebrow, title, description, children }: {
  id: string; eyebrow: string; title: ReactNode; description: ReactNode; children?: ReactNode;
}) {
  return <section className="studio-hero" aria-labelledby={id}>
    <ReferenceArtwork region={{ x: 788, y: 72, width: 391, height: 250 }}
      label="Artwork tham chiếu: cô gái và sứa phát quang" className="studio-hero__art" loading="eager" />
    <ArtworkMotion variant="dashboard" />
    <div className="studio-hero__blend" aria-hidden="true" />
    <div className="studio-hero__content">
      <span className="studio-hero__eyebrow"><span />{eyebrow}</span>
      <h1 id={id}>{title}</h1><p>{description}</p>{children}
    </div>
    <span className="studio-hero__caption">ARTWORK THAM CHIẾU</span>
  </section>;
}
