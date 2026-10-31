# 03 — MongoDB, dữ liệu và bằng chứng học phần

## Baseline
Giữ 5 collection và tên field hiện có. Đọc schema thực tại backend/src/models/.
Không đồng nhất Mongoose schema với MongoDB collection validator: nếu báo cáo yêu cầu cả hai, tạo script $jsonSchema riêng và kiểm thử bằng raw insert.
MongoDB local phải là replica set đã initiate; test transaction thật trước làm quota.

| Collection | Nhúng | Tham chiếu / lý do |
|---|---|---|
| users | hồ sơ cơ bản | activeGenerationId; không nhúng lịch sử tăng vô hạn |
| sessions | thời gian, tokenHash | userId; lifecycle riêng, TTL |
| generations | settings, lease, checkpoint, error, quotaReservation | userId, imageId; lịch sử có phân trang |
| images | storage, kích thước/format/bytes | userId, generationId; quản lý file độc lập |
| dailyUsage | scopeType/scopeId/dateKey/counter | scopeId user hoặc application |

## Index phải kiểm chứng tồn tại
- users: unique email canonical.
- sessions: unique tokenHash; userId+expiresAt; TTL expiresAt.
- generations: unique userId+requestKey; history userId+createdAt desc+_id desc; worker status+createdAt.
- images: unique generationId; library userId+deletedAt+createdAt desc+_id desc.
- dailyUsage: unique scopeType+scopeId+dateKey.
Không syncIndexes/drop index tự động. Script db:indexes hiện tạo declared indexes; unique index có thể fail nếu dữ liệu cũ trùng.

## Validation và quyền
ObjectId/Date lưu đúng BSON type; API trả string ID/ISO time.
Whitelist input; không spread body/query thành filter/update, không nhận Mongo operators từ client.
Query cá nhân luôn scope session userId; userId không lấy từ body.
Status enum không tự đảm bảo transition: service dùng conditional update từ trạng thái dự kiến.
References không tự là foreign key: service/transaction kiểm tra owner và tồn tại.

## Storage schema đích
Hiện storage có provider/key/version?/deliveryMode; URL chưa có trong model.
CONFIRMED Azure private và khả năng chuyển Cloudinary; không thêm public storage.url cho luồng hiện tại.
PROPOSAL thêm accountAlias/container/storageRevision/integrity.sha256 theo [contract storage](07-STORAGE-PORTABILITY.md); key/blobName/publicId là định danh bền vững. Chưa sửa schema.
Default provider chỉ chọn nơi ghi mới; đọc/xóa theo provider/accountAlias trên từng record.
Private delivery không persist SAS/signed URL hết hạn như địa chỉ vĩnh viễn; tạo URL ngắn hạn sau ownership.
Không lưu API key, signed credentials, base64 ảnh vào documents/export.
Chưa sửa model hoặc migrate trong task tài liệu.

## JSON import/export
CONFIRMED khả năng cần cho dữ liệu nhóm; PROPOSAL công cụ CLI/script vận hành, chưa thêm nút UI.
mongoexport/mongoimport dùng Extended JSON để giữ ObjectId/Date; export mỗi collection.
Không import sessions/passwordHash/quota/lease active vào môi trường demo của thành viên khác.
Script demo tạo user mới và map old→new IDs của generations/images; trạng thái import không được chạy worker/gọi FLUX.
Import qua raw tool có thể bỏ qua Mongoose validation: phải validate trước và dùng collection validator nếu cần.
Kiểm tra version, số records/file size, field whitelist, duplicate policy, reference map; không import URL/path tùy ý để backend fetch.
Ảnh cloud không được sao chép bởi JSON; kiểm tra còn truy cập và quyền trên tài khoản đích.
Hai DB dùng chung cloud key: demo import phải vô hiệu xóa file dùng chung hoặc copy file/key sang namespace riêng trước destructive demo.
mongoexport không backup toàn bộ indexes/options. Backup DB dùng mongodump/mongorestore; backup cloud riêng.
Script export/import thật và format version là task sau, không có sẵn từ bộ docs.

## Bộ thực nghiệm bắt buộc
1. CRUD và ownership: user B không đọc/sửa/xóa/download của A.
2. Unique email, duplicate request key và daily scope/date: thử inserts cạnh tranh.
3. Transaction: còn một lượt, hai job key khác nhau đồng thời → đúng một job mới.
4. Hai request cùng key/body → một job, một reservation, một dispatch.
5. Aggregation user-scoped: count theo ngày/status, avg duration succeeded, tổng bytes ảnh chưa xóa; Asia/Ho_Chi_Minh khi hiển thị.
6. $lookup ảnh+generation trong phạm vi user.
7. 10.000 metadata test tách DB riêng; explain executionStats trước/sau index.
Báo cáo winningPlan, totalDocsExamined, totalKeysExamined, nReturned và latency nhiều lần; không chỉ một milliseconds.
Dữ liệu synthetic không trộn thống kê chất lượng ảnh thật, không gọi 10.000 lượt AI.

## Deliverables
Sơ đồ quan hệ, lý do embedding/reference, script indexes/validator/seed/aggregation/explain, kết quả JSON và báo cáo môi trường.
Không coi model đã tồn tại là bằng chứng các bài test trên đã pass.

