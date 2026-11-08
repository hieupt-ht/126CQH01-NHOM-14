import { styleOptions, type ImageStyle } from "../../domain/generationOptions";
import Icon from "../ui/Icon";
import watercolor from "../../assets/styles/watercolor-reference.png";
import cinematic from "../../assets/styles/cinematic-reference.png";
import photographic from "../../assets/styles/photographic-reference.png";
import illustration from "../../assets/styles/illustration-reference.png";
import anime from "../../assets/styles/anime-reference.png";
import oil from "../../assets/styles/oil-painting-reference.png";
import threeD from "../../assets/styles/3d-reference.png";
import comic from "../../assets/styles/comic-reference.png";
import "./StylePicker.css";

const images: Record<Exclude<ImageStyle, "none">, string> = {
  watercolor, cinematic, photographic, illustration, anime, "oil-painting": oil, "3d": threeD, comic,
};

export function StyleArtwork({ style }: { style: Exclude<ImageStyle, "none"> }) {
  return <span className="style-card__media" aria-hidden="true">
    <span className="style-card__motion">
      <img className={`style-card__art style-card__art--${style}`} src={images[style]} alt="" loading="lazy" />
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
