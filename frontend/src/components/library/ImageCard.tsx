import { useRef, type MouseEvent } from "react";
import Icon from "../ui/Icon";
import type { ImageRecord } from "../../services/resources";
import { imageDetailHref } from "../../services/listNavigation";
import PrivateImage from "./PrivateImage";
import type { ImageAction } from "./ImageActionDialog";

export default function ImageCard({ image, onAction }: {
  image: ImageRecord;
  onAction: (action: ImageAction, image: ImageRecord) => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const openDetail = (event: MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.href = imageDetailHref(image.id);
  };
  return <article className="library-image-card">
    <div className="library-image-card__visual">
      <div className="library-image-card__thumbnail">
        <PrivateImage key={image.contentUrl} src={image.contentUrl} title={image.title}
          href={imageDetailHref(image.id)} onFollow={openDetail} />
      </div>
      <details ref={menu} className="library-image-actions" onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}>
        <summary aria-label={"Thao tác cho " + image.title}><Icon name="more" size={18} /></summary>
        <div className="library-image-actions__items">
          <a href={imageDetailHref(image.id)} onClick={openDetail}>Xem chi tiết</a>
          <a href={image.downloadUrl}>Tải ảnh</a>
          {(["rename", "delete"] as const).map((action) => <button key={action} type="button"
            onClick={() => {
              if (menu.current) {
                menu.current.open = false;
                menu.current.querySelector("summary")?.focus();
              }
              onAction(action, image);
            }}>{action === "rename" ? "Đổi tên" : "Xóa ảnh"}</button>)}
        </div>
      </details>
    </div>
    <div className="library-image-card__body">
      <h2 title={image.title}><a href={imageDetailHref(image.id)} onClick={openDetail}>{image.title}</a></h2>
      <p>{image.width} × {image.height} · {image.format}</p>
      <dl>
        <div><dt>Thời điểm</dt><dd>{new Date(image.createdAt).toLocaleString("vi-VN")}</dd></div>
        <div><dt>Model</dt><dd>{image.model || "Không có thông tin"}</dd></div>
      </dl>
    </div>
  </article>;
}
