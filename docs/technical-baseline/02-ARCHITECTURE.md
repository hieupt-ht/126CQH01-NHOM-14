# 02 — Kiến trúc và quy tắc nghiệp vụ

## Phân lớp
Browser React → Express /api/v1 → MongoDB local replica set.
Worker đọc generations → Cloudflare FLUX → checkpoint local tạm → cloud storage → images metadata.
File cuối ở cloud; local chỉ checkpoint/recovery có retention, không commit.
Provider/storage adapter phía backend; frontend không giữ key hoặc gọi provider trực tiếp.
Modular monolith, chưa tách microservice.

## Trách nhiệm code
- routes: mapping endpoint/middleware.
- controller: HTTP input/output, không thực thi transaction/provider.
- service: ownership, idempotency, quota và orchestration.
- models: schema/index; không coi schema validation là HTTP authorization.
- providers/cloudflare: map request/response/error; không trả raw payload về browser.
- storage: upload/delete/delivery theo đúng một provider được chốt.
- worker: claim lease, checkpoint, state transition, recovery.
Đây là layout đích đề xuất; thêm folder khi có code thật, không tạo hàng loạt layer rỗng.

## Nhận yêu cầu
1. Xác thực session; validate prompt và Idempotency-Key.
2. Tìm requestKey trong phạm vi user; cùng fingerprint trả job cũ, khác fingerprint trả 409.
3. Transaction ngắn: reserve quota user/app theo UTC, claim activeGenerationId, insert job.
4. Cạnh tranh unique index: đọc lại job đã tồn tại; không tăng quota/call AI lần hai.
5. Trả 202 với job ID, không chờ provider.
6. Worker claim bằng conditional update + lease; ghi checkpoint trước dispatch.
7. Gọi FLUX đúng một lần; kiểm tra output bytes/MIME/dimensions, checkpoint.
8. Upload cloud với key xác định từ generationId; lưu key/url/version và metadata thực.
9. Transaction finalization: upsert image bằng generationId, link job, succeeded, release active job.
Không gọi provider hoặc cloud trong transaction. Cần test failure tại từng ranh giới.

## State machine
queued → processing → saving → succeeded.
Lỗi chắc chắn có thể failed; outcome provider không xác định → needs_review.
Không chuyển needs_review về queued để gọi AI tự động.
Lease hết hạn không chứng minh provider chưa nhận request.
Recovery queued có thể claim lại; processing đã dispatch cần đối soát; saving dùng checkpoint/upload cũ.
Không giữ active lock vô hạn: xử lý terminal/reconciliation phải idempotent và test race.

## Quota
Một user tối đa một job active; request được nhận reserve một lượt.
Hoàn lượt đúng một lần chỉ khi chắc chắn chưa dispatch provider.
Sau dispatch, lỗi/timeout vẫn tính lượt; lỗi lưu không gọi AI lại.
Idempotency replay được giải quyết trước quota mới.
Giá trị số xem 05; app request counter không phải số neurons đo từ Cloudflare.

## Library và history
Library: images chưa soft-delete và file đã persist.
History: mọi job, kể cả failed/needs_review và job có ảnh bị xóa.
Xóa ảnh: ownership → soft-delete + pending cleanup → cloud delete có retry → đánh dấu deleted.
Không xóa generation khi xóa image. Không hứa revoke ngay mọi cache/link public đã chia sẻ.

## Failure matrix
| Tình huống | Hành vi |
|---|---|
| Quota hết trước nhận | 429, không job/provider |
| Provider timeout sau dispatch | needs_review, không fallback/retry inference |
| Đã có bytes, cloud lỗi | recovery từ checkpoint; không tạo lại |
| Cloud đã lưu, DB lỗi | reconcile theo generation key; không succeeded sớm |
| Cloud delete lỗi | Library ẩn; cleanup pending/failed có retry |
| Restart | phục hồi theo persisted checkpoint, không chỉ timer RAM |
| User khác biết ID | cùng 404 như không tồn tại |

## Ngoài scope
Không thêm community, batch/multi-image, editing, chọn provider/model UI hoặc tính năng import dữ liệu người dùng khi chưa duyệt.

