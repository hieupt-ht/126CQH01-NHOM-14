> **Hiện hành01/11:** đọc [quyết định09](09-CLOUDINARY-DECISION.md) trước. Cloudinary thay Azure ở MVP; migration thực tế chưa có. [Cải tiến](../project/POST_COMPLETION_IMPROVEMENTS.md) bị hoãn đến khi nghiệm thu đề tài gốc.

# FLUX STUDIO — Bộ tài liệu kỹ thuật thống nhất
Cập nhật: 31/10/2026. Baseline v1.2. Phân biệt thiết kế, code đã có và kiểm chứng live.

## Cách đọc
1. [Quyết định stack](01-STACK-DECISIONS.md).
2. [Kiến trúc và nghiệp vụ](02-ARCHITECTURE.md).
3. [MongoDB và thực nghiệm học phần](03-MONGODB.md).
4. [API và frontend](04-API-FRONTEND.md).
5. [AI, cloud và ngân sách](05-AI-STORAGE-BUDGET.md).
6. [Môi trường, triển khai và nghiệm thu](06-DELIVERY.md).
7. [Storage adapter và chuyển cloud an toàn](07-STORAGE-PORTABILITY.md).

8. [Contract triển khai và bằng chứng kiểm thử](08-IMPLEMENTATION-STATUS.md).
9. [Cloudinary hiện hành và tích hợp develop](09-CLOUDINARY-DECISION.md).

## Trạng thái quyết định
- CONFIRMED: chủ dự án đã chọn, nhóm triển khai theo.
- PROPOSAL: baseline kỹ thuật đề xuất cụ thể, cần duyệt trước khi cài package/thay schema hoặc mở tính năng phụ thuộc.
- OPEN QUESTION: chưa đủ thông tin; chỉ dừng phần phụ thuộc, không tự chọn hộ.

## Thứ tự áp dụng
Yêu cầu mới nhất của chủ dự án > các quyết định CONFIRMED tại bộ này > tài liệu chi tiết tương thích trong repo.
Issue #1 và PRD giữ phạm vi sản phẩm; writing-block.md giữ nguyên toàn bộ quy định UI.
Bộ này thay quyết định Gemini/local-storage cũ bằng hướng FLUX/cloud theo trao đổi mới; không mở thêm tính năng sản phẩm.
Nếu khác biệt mới xuất hiện: ghi decision ID, lý do, tác động API/DB/UI/chi phí; xin quyết định trước phần phụ thuộc.

## Hiện trạng mã nguồn
Nguồn chính cho contract, code và bằng chứng kiểm thử hiện tại là [08](08-IMPLEMENTATION-STATUS.md).
Hướng dẫn chạy duy nhất cho máy nhóm là [LOCAL_RUN](../development/LOCAL_RUN.md).

- Development mặc định xem UI: không cần backend/DB/cloud, login mô phỏng và danh sách rỗng.
- API thật: đặt frontend/.env.local `VITE_UI_PREVIEW=false`, restart Vite và chạy backend/MongoDB.
- Backend có auth, generation worker, CRUD ảnh/history/stats, Cloudflare provider và Cloudinary adapter.
- Unit/integration dùng MongoDB tạm và provider/storage stub đã chạy; chưa kiểm chứng cloud live.
- Production build luôn dùng xác thực/API thật; không có chế độ bỏ xác thực production.
- Các mục PROPOSAL trong01–07 là thiết kế ban đầu nếu08 đã ghi quyết định triển khai mới hơn.
- Tài liệu cũ có banner lịch sử; không dùng Gemini/local-final-storage làm quyết định hiện hành.

## Giới hạn bộ tài liệu
CONFIRMED01/11: Cloudinary Free authenticated là storage MVP; credit Azure không còn là cấu hình bắt buộc.
CONFIRMED: giữ adapter/registry để có thể đổi provider sau này. Chỉ Cloudinary hoạt động ở MVP; không chuyển file hoặc đổi descriptor cũ tự động.
Delivery qua backend stream và Cloudinary SDK đã có code; cloud live chưa kiểm chứng.
Import/export được mô tả cho công cụ nhóm; chưa duyệt nút import/export cho người dùng.

## Quản lý thay đổi
Mỗi PR ghi: decision ID liên quan, scope, contract/schema đổi gì, kiểm thử thật, giới hạn.
Nhánh feature/fix từ develop, PR base develop; main dành bản phát hành đã nghiệm thu.
Không nâng dependency/model, thay provider/storage/quota hay thêm JWT/Redis/microservice âm thầm.

