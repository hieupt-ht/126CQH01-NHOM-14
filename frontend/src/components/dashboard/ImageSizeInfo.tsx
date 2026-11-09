import "./ImageSizeInfo.css";
export default function ImageSizeInfo() {
  return <section className="image-size-info" aria-label="Kích thước và tỷ lệ ảnh">
    <div className="image-size-info__heading"><span className="image-size-info__frame" aria-hidden="true" /><strong>Kích thước & tỷ lệ</strong><span>Tự động</span></div>
    <p>Hệ thống tự chọn tỷ lệ phù hợp với yêu cầu của bạn.</p>
    <small>Kích thước pixel và tỷ lệ thực tế sẽ hiện sau khi ảnh được tạo.</small>
  </section>;
}
