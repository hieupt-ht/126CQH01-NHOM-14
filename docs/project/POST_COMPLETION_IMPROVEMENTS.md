# Cải tiến sau khi hoàn thành đề tài

Ngày chốt: 01/11/2026. Trạng thái: **DEFERRED — CHƯA ĐƯỢC TRIỂN KHAI**.

Giữ nguyên đề tài: **Xây dựng hệ thống generate image with prompt với Node.js, MongoDB, FLUX API**.
Tài liệu này chỉ ghi nhớ ý tưởng nếu nhóm còn thời gian sau khi hoàn tất đề tài gốc.
Không phải yêu cầu mở rộng MVP, không phải backlog đang được phép viết code.

## Điều kiện bắt buộc trước khi mở cải tiến

Chỉ xem xét triển khai sau khi TẤT CẢ mục sau được kiểm chứng và chủ dự án xác nhận:

- [ ] Merge với develop đã được xử lý, build/test đạt, PR nền tảng được nhóm review.
- [ ] Đăng ký/đăng nhập/đăng xuất thật; hash mật khẩu, session, CSRF và ownership hoạt động.
- [ ] MongoDB replica set và transaction hoạt động trong môi trường demo của nhóm.
- [ ] Một prompt tạo một ảnh FLUX thật, lưu Cloudinary riêng tư và metadata MongoDB.
- [ ] Tải lại trang/đăng nhập lại vẫn xem và tải được ảnh của mình; tài khoản khác bị từ chối.
- [ ] Thư viện, chi tiết, đổi tên, xóa và lịch sử hoạt động; lịch sử giữ yêu cầu lỗi và ảnh đã xóa.
- [ ] Quota, gửi trùng, lỗi mạng, checkpoint và cleanup được kiểm thử; không gọi AI lại mù.
- [ ] UI được kiểm tra desktop/mobile, các trạng thái và điều hướng; preview không thay nghiệm thu API thật.
- [ ] Minh chứng học phần theo PRD đã đủ: schema, CRUD, index, truy vấn/aggregation, explain và tài liệu/demo.
- [ ] Cấu hình chạy, giới hạn Free, secret và giới hạn triển khai được ghi rõ; không phát sinh dịch vụ trả phí ngoài quyết định nhóm.
- [ ] Chủ dự án xác nhận đề tài gốc hoàn thành và cho phép chọn một cải tiến cụ thể.

Không coi build đạt, UI đẹp, hoặc có code scaffold là hoàn thành các điều kiện này.
Import/export hoặc aggregation nếu đã thuộc PRD gốc vẫn phải làm trong phạm vi gốc;
chỉ các tính năng mở rộng thêm mới bị hoãn theo tài liệu này.

## Ý tưởng, theo thứ tự ưu tiên dự kiến

| Ưu tiên | Cải tiến | Phạm vi dự kiến | Kiến thức MongoDB |
|---|---|---|---|
| 1 | Bộ sưu tập, tag, yêu thích ảnh thật | Tổ chức thư viện cá nhân; không nhúng mảng ảnh tăng vô hạn | Embedding/referencing, quyền sở hữu, CRUD |
| 2 | Tìm kiếm/lọc nâng cao | Tên, prompt, tag, thời gian, trạng thái; đánh giá giới hạn tiếng Việt | Compound/text index nếu phù hợp, cursor, explain |
| 3 | Thống kê nâng cao | Tỷ lệ thành công, dung lượng, tag phổ biến theo khoảng thời gian | $match, $group, $unwind, $facet |
| 4 | Các lần thử prompt | Liên kết lần tạo mới với lần trước; mỗi lượt vẫn một ảnh | Tham chiếu, $lookup; $graphLookup chỉ nếu cần |
| 5 | Import/export mở rộng | Metadata có schemaVersion, chống trùng, preview nhập | Validation, mapping ID, bulk operations |
| 6 | Công cụ vận hành nâng cao | Giao diện đối soát needs_review, file mồ côi, cleanup lỗi | Truy vấn trạng thái, audit, phân quyền |

Import/export không xuất passwordHash, session/token, credential hoặc signed URL tạm.
JSON metadata không thay thế backup file cloud. Không sửa prompt gốc của lịch sử.
Các bảo vệ lỗi cốt lõi/cleanup bắt buộc vẫn phải làm trước; chỉ giao diện vận hành nâng cao là cải tiến.

## Quy trình khi được mở lại

1. Chủ dự án chọn cải tiến và xác nhận thời gian/phạm vi.
2. Tạo issue/PRD bổ sung: mục tiêu, schema/index/API/UI, tiêu chí nghiệm thu và ảnh hưởng hạn mức.
3. Giữ nguyên tên đề tài, stack và storage adapter; không tự thêm model AI, billing hoặc community.
4. Triển khai từng phần trên nhánh từ develop, kiểm thử và review rồi mới làm phần kế tiếp.

Chưa tạo collection/API/UI/dependency cho các ý tưởng này trong task chuyển storage Cloudinary.
