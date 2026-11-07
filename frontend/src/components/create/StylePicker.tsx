import { styleOptions, type ImageStyle } from "../../domain/generationOptions";
import ReferenceArtwork from "../dashboard/ReferenceArtwork";
import Icon from "../ui/Icon";
import portrait from "../../assets/images/home/showcase-cinematic-portrait.jpg";
import glass from "../../assets/images/home/hero-3d-glass.jpg";
import watercolor from "../../assets/styles/watercolor.svg";
import oil from "../../assets/styles/oil-painting.svg";
import comic from "../../assets/styles/comic.svg";
import "./StylePicker.css";

const images: Partial<Record<ImageStyle, string>> = {
  watercolor, photographic: portrait, "oil-painting": oil, "3d": glass, comic,
};

export function StyleArtwork({ style }: { style: Exclude<ImageStyle, "none"> }) {
  return <span className="style-card__media" aria-hidden="true">
    <span className="style-card__motion">
    {style === "anime" || style === "illustration" || style === "cinematic" ?
      <ReferenceArtwork className="style-card__art" label="Ảnh minh họa phong cách"
        region={style === "anime" ? { x: 1225, y: 851, width: 291, height: 164 } : style === "cinematic" ? { x: 294, y: 617, width: 292, height: 165 } : { x: 916, y: 851, width: 289, height: 164 }} /> :
      <img className="style-card__art" src={images[style]} alt="" loading="lazy" />}
    </span>
  </span>;
}

export default function StylePicker({ value, onChange, disabled, onCommit }: {
  value: ImageStyle; onChange: (style: ImageStyle) => void; disabled: boolean; onCommit?: () => void;
}) {
  return <fieldset className="style-picker" disabled={disabled} aria-describedby="style-picker-note">
    <legend>Phong cách tạo ảnh</legend>
    <label className="style-picker__free">
      <input type="radio" name="imageStyle" value="none" checked={value === "none"} onChange={event => { onChange("none"); if ((event.nativeEvent as MouseEvent).detail > 0) onCommit?.(); }} onClick={event => { if (event.detail > 0 && value === "none") onCommit?.(); }} />
      <span>Theo mô tả của tôi</span><small>Không thêm phong cách</small>
    </label>
    <div className="style-picker__grid">
      {styleOptions.filter(option => option.value !== "none").map(option =>
        <label key={option.value} className={`style-card ${value === option.value ? "style-card--selected" : ""}`}>
          <input type="radio" name="imageStyle" value={option.value} checked={value === option.value} onChange={event => { onChange(option.value); if ((event.nativeEvent as MouseEvent).detail > 0) onCommit?.(); }} onClick={event => { if (event.detail > 0 && value === option.value) onCommit?.(); }} />
          <StyleArtwork style={option.value} />
          <span className="style-card__name">{option.label}</span>
          <span className="style-card__check" aria-hidden="true"><Icon name="check" size={14} /></span>
        </label>)}
    </div>
    <p id="style-picker-note">Ảnh minh họa phong cách, không phải kết quả của mô tả hiện tại. Chỉ tạo ảnh khi bạn nhấn Tạo ảnh.</p>
  </fieldset>;
}
