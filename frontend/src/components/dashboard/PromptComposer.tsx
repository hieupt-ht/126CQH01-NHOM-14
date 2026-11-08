import { useEffect, useRef, useState, type ClipboardEvent, type RefObject } from "react";
import { aspectOptions, styleOptions, type AspectRatio, type ImageStyle } from "../../domain/generationOptions";
import { MAX_PROMPT_LENGTH } from "../../domain/prompt";
import { REFERENCE_IMAGE_TYPES } from "../../services/generationSubmission";
import StylePicker, { StyleArtwork } from "../create/StylePicker";
import Icon from "../ui/Icon";

export default function PromptComposer({
  prompt,
  onPrompt,
  inputRef,
  formId,
  notice,
  noticeIsError,
  onSubmit,
  aspectRatio,
  onAspectRatio,
  style,
  onStyle,
  referenceImage,
  onAttachImage,
  onRemoveImage,
  canAttachImage,
  locked,
  submitting,
  disabled,
  referenceRecovery,
}: {
  prompt: string;
  onPrompt: (value: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  formId: string;
  notice: string;
  noticeIsError: boolean;
  onSubmit: () => void;
  aspectRatio: AspectRatio;
  onAspectRatio: (value: AspectRatio) => void;
  style: ImageStyle;
  onStyle: (value: ImageStyle) => void;
  referenceImage: File | null;
  onAttachImage: (file: File) => void;
  onRemoveImage: () => void;
  canAttachImage: boolean;
  locked: boolean;
  submitting: boolean;
  disabled: boolean;
  referenceRecovery: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [picker, setPicker] = useState<"style" | "ratio" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const styleTrigger = useRef<HTMLButtonElement>(null);
  const ratioTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!referenceImage) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(referenceImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceImage]);

  const capturePastedImage = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const image = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && REFERENCE_IMAGE_TYPES.includes(item.type))
      ?.getAsFile();
    if (!image) return;
    event.preventDefault();
    onAttachImage(image);
  };

  const closePicker = () => {
    const trigger = picker === "style" ? styleTrigger : ratioTrigger;
    setPicker(null);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!picker || locked) {
      setPicker(null);
      return;
    }
    const popover = panel.current;
    if (!popover) return;
    popover.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      const target = event.target;
      const composer = target instanceof Element ? target.closest(".prompt-composer") : target instanceof Node ? target.parentElement?.closest(".prompt-composer") : null;
      if (!composer) setPicker(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePicker();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [picker, locked]);

  return (
    <form
      id={formId}
      className="prompt-composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="prompt-composer__heading">
        <label htmlFor="image-prompt"><Icon name="wand" size={17} />Bạn muốn tạo hình ảnh gì?</label>
        <span className="prompt-composer__count">{prompt.length}/{MAX_PROMPT_LENGTH} ký tự</span>
      </div>
      {picker && (
        <div ref={panel} id={picker === "style" ? "dashboard-style-popover" : "dashboard-ratio-popover"} className={`create-picker-popover create-picker-popover--${picker}`} role="region" aria-label={picker === "style" ? "Chọn phong cách" : "Chọn khung hình"}>
          <div className="create-picker-popover__header"><strong>{picker === "style" ? "Chọn phong cách" : "Tỷ lệ khung hình"}</strong><button type="button" className="studio-icon-button" aria-label="Đóng bảng chọn" onClick={closePicker}><Icon name="close" size={16} /></button></div>
          {picker === "style" ? <StylePicker value={style} onChange={onStyle} disabled={locked} onCommit={closePicker} /> :
            <fieldset className="create-ratio-menu" disabled={locked}><legend className="sr-only">Khung hình</legend>
              {aspectOptions.map((option) => <label key={option.value}>
                <input type="radio" name="dashboardAspectRatio" value={option.value} checked={aspectRatio === option.value} onChange={(event) => { onAspectRatio(option.value); if ((event.nativeEvent as MouseEvent).detail > 0) closePicker(); }} onClick={(event) => { if (event.detail > 0 && aspectRatio === option.value) closePicker(); }} />
                <span className="create-ratio-menu__preview" aria-hidden="true"><span className="create-ratio__shape" style={{ aspectRatio: option.ratio, width: option.value === "9:16" ? 26 : option.value === "3:4" ? 34 : 44 }} /></span>
                <span>{option.value === "auto" ? "Ảnh gốc" : option.value}<small>{option.label}</small></span>
                {aspectRatio === option.value && <Icon name="check" size={15} />}
              </label>)}
              <p>Giữ toàn bộ ảnh, thêm viền trắng để vừa tỷ lệ đã chọn.</p>
            </fieldset>}
        </div>
      )}
      {style !== "none" && <div className="create-style-chip" aria-label={`Phong cách đã chọn: ${styleOptions.find((option) => option.value === style)?.label}`}>
        <StyleArtwork style={style} />
        <strong>{styleOptions.find((option) => option.value === style)?.label}</strong>
        <button type="button" aria-label="Bỏ phong cách đã chọn" disabled={locked} onClick={() => onStyle("none")}><Icon name="close" size={14} /></button>
      </div>}
      <textarea
        id="image-prompt"
        ref={inputRef}
        value={prompt}
        readOnly={locked}
        onChange={(event) => onPrompt(event.target.value)}
        onPaste={capturePastedImage}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            onSubmit();
          }
        }}
        rows={3}
        placeholder="Ví dụ: Một thành phố tương lai trong đêm mưa, ánh đèn neon xanh tím phản chiếu trên mặt đường..."
        aria-describedby="prompt-hint prompt-notice"
      />

      {referenceImage && (
        <div className="prompt-composer__image" aria-label="Ảnh tham chiếu đã chọn">
          <img src={previewUrl} alt="Xem trước ảnh đính kèm" />
          <span><strong>{referenceImage.name || "Ảnh đã dán"}</strong><small>{(referenceImage.size / 1024 / 1024).toFixed(2)} MiB</small></span>
          <button type="button" className="studio-icon-button" aria-label="Bỏ ảnh đính kèm" disabled={!canAttachImage} onClick={onRemoveImage}><Icon name="close" size={16} /></button>
        </div>
      )}
      {referenceRecovery && !referenceImage && (
        <p className="prompt-composer__recovery" role="status">Yêu cầu trước có ảnh đính kèm. Hãy chọn hoặc dán lại đúng ảnh để thử khôi phục yêu cầu.</p>
      )}

      <div className="prompt-composer__footer">
        <div className="prompt-composer__tools">
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Chọn ảnh đính kèm"
            disabled={!canAttachImage}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) onAttachImage(file);
            }}
          />
          <button type="button" className="studio-button studio-button--subtle" disabled={!canAttachImage} onClick={() => fileInput.current?.click()}><Icon name="image" size={15} />Đính kèm</button>
          <button ref={styleTrigger} type="button" className="studio-button studio-button--subtle" disabled={locked} aria-expanded={picker === "style"} aria-controls="dashboard-style-popover" onClick={() => setPicker(picker === "style" ? null : "style")}><Icon name="image" size={15} />Phong cách<Icon name="chevron" size={13} /></button>
          <button ref={ratioTrigger} type="button" className="studio-button studio-button--subtle" disabled={locked} aria-expanded={picker === "ratio"} aria-controls="dashboard-ratio-popover" onClick={() => setPicker(picker === "ratio" ? null : "ratio")}><Icon name="grid" size={15} />Khung hình <span>{aspectRatio === "auto" ? "Gốc" : aspectRatio}</span><Icon name="chevron" size={13} /></button>
        </div>
        <button type="submit" className="studio-button studio-button--primary prompt-composer__submit" disabled={disabled} aria-busy={submitting}>
          {submitting ? <span className="create-spinner" aria-hidden="true" /> : <Icon name="sparkles" size={17} />}
          {submitting ? "Đang gửi…" : "Tạo ảnh"}
        </button>
      </div>

      <p className="prompt-composer__hint" id="prompt-hint">{referenceRecovery
        ? "Shift + Enter để xuống dòng. Enter để gửi lại yêu cầu."
        : "Shift + Enter để xuống dòng. Enter để tạo ảnh. Mô tả và ảnh đính kèm sẽ được gửi đến Cloudflare khi bạn gửi yêu cầu."}</p>
      <div id="prompt-notice" className={notice ? `prompt-composer__notice${noticeIsError ? " prompt-composer__notice--error" : ""}` : "sr-only"} role={noticeIsError ? "alert" : "status"} aria-live={noticeIsError ? "assertive" : "polite"}>{notice}</div>
    </form>
  );
}
