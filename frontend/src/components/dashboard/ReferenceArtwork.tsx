import reference from '../../assets/reference/dashboard-reference.jpg';
export type ArtworkRegion = { x: number; y: number; width: number; height: number };

// CSS shows only artwork regions from the supplied reference. Replace with
// individual URLs when backend images are available; these are not user records.
export default function ReferenceArtwork({ region, label, className = '' }: { region: ArtworkRegion; label: string; className?: string }) {
  return <div className={`reference-art ${className}`} style={{ aspectRatio: `${region.width} / ${region.height}` }} role="img" aria-label={label}>
    <img src={reference} alt="" draggable={false} decoding="async" style={{ width: `${1536 / region.width * 100}%`, maxWidth: 'none', left: `${-region.x / region.width * 100}%`, top: `${-region.y / region.height * 100}%` }} />
  </div>;
}
