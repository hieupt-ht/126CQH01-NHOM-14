import "./ImageSizeInfo.css";
export default function ImageSizeInfo() {
  return <section className="image-size-info" aria-label="Kích thước và tỷ lệ ảnh">
    <div className="image-size-info__heading"><span className="image-size-info__frame" aria-hidden="true" /><strong>Kích thước & tỷ lệ</strong><span>Tự động</span></div>
    <p>Do dịch vụ tạo ảnh quyết định.</p>
    <small>Kích thước pixel và tỷ lệ thực tế hiển thị sau khi ảnh được lưu.</small>
  </section>;
}
