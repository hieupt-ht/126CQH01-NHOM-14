# Kiểm tra sau merge — phần Định, 04/11/2026

**CONFIRMED về phạm vi:** theo [bàn giao mới nhất của Issue #17](https://github.com/hieupt-ht/126CQH01-NHOM-14/issues/17#issuecomment-6610535099),
Định kiểm tra cùng Vũ các thao tác ảnh/history sau PR21, ownership/cursor/fallback,
bàn giao MongoDB và trao đổi phạm vi JSON metadata. Việc phối hợp/review của thành viên
khác chưa được coi là hoàn thành chỉ vì script local đạt.

## Nền và nguồn

- Working tree sạch trước task; `git fetch` và `git pull --ff-only origin develop`
  xác nhận local khớp `ecbbd0a`, đã gồm PR21/23/24.
- Nhánh thực hiện: `codex/postmerge-acceptance`.
- Đã đọc toàn bộ Issue17/bình luận mới, Issue25, PR24 và code/test hiện hành;
  đối chiếu AGENTS, BACKEND_RULES, QUALITY_CHECKLIST, FRONTEND_BACKEND_CONTRACT,
  baseline09 và các model/scripts/service liên quan.
- Dùng workflow backend-testing: DB tạm riêng, provider/storage stub có nhãn,
  không dùng `.env`, DB demo hoặc cloud thật trong test.
- Issue25 là đề xuất; chưa mở đánh giá chất lượng live hoặc bật prototype dịch prompt.
  Các test dịch sẵn có chỉ dùng mock, không chứng minh chất lượng ảnh.

## Ma trận bàn giao mới

| Mục của Định | Bằng chứng tự động mới | Giới hạn cần giữ |
|---|---|---|
| Đổi tên, tải, xóa và history sau merge | Browser: đổi tên từ Chi tiết và Thư viện, refresh; download so khớp bytes; xóa từ cả hai nơi, history giữ `imageDeleted` | Ảnh synthetic qua storage stub; chưa phải buổi nghiệm thu cùng Vũ/cloud live |
| Ownership | Hai browser session A/B; B không GET ảnh/content/download/job hoặc PATCH/DELETE ảnh A; UI không hiện title/link ảnh A | Session/API/DB thật trong môi trường test riêng |
| Cursor/vị trí/fallback | Cursor qua refresh và trở về giữ vị trí; cả library/detail báo file lỗi, nút retry chỉ đọc lại file | Kiểm thử Edge local tại360/768/1280/1536, không suy rộng mọi browser |
| MongoDB | Declaration inventory5 collections/10 indexes; report10k metadata, aggregation/$lookup/validator/transaction | Inventory là schema code; thực nghiệm trên `course_*` riêng, không introspect DB live |
| Trao đổi JSON metadata | Chuẩn bị phương án và câu hỏi review ở dưới; người dùng xác nhận nhóm chưa chốt phạm vi | Chưa có exporter/importer hoặc round-trip; cần Vũ/Hiếu thống nhất |

## Kiểm thử đã chạy

| Lệnh, chạy từ package tương ứng | Kết quả |
|---|---|
| `frontend: npm run build` | Đạt |
| `backend: npm run build` | Đạt |
| `backend: npm test` | 37 đạt, 1 skip vì không cấu hình MONGODB_TEST_URI |
| `backend: npm run test:integration` | 15 đạt,0 skip; gồm7 ca recovery/race mới |
| Browser script bên dưới | Đạt,0 JavaScript error,0 inference provider; library/detail/history0 POST generation |
| `backend: npm run course:report` | Đạt explain/aggregation/$lookup/validator/transaction assertions |

Browser còn kiểm tra register bằng UI, logout revoke cookie cũ ngay (401),
protected-route redirect và login lại vẫn đọc tên/file đã lưu.
Ca sidebar refresh chủ động gửi đúng1 POST generation vào API/DB test;
terminal result được đặt bằng fixture synthetic, worker không chạy, không gọi AI/storage cloud.

```powershell
cd backend
$env:PLAYWRIGHT_MODULE = '<đường dẫn package playwright có sẵn>'
$env:PLAYWRIGHT_CHANNEL = 'msedge'
node --import tsx tests/browser/library-history.ts
```

Script dùng API/Vite loopback5187 và MongoDB replica set tạm, dọn sau khi kết thúc.
Artifacts download/screenshot/report ở `backend/data/library-history-browser/` (gitignored).
Snapshot kiểm tra: [browser report](../backend/evidence/postmerge-browser-2026-11-04.json).
Ảnh fixture1 màu có nhãn kiểm thử, không phải kết quả FLUX.

## Đối chiếu phần F — kiểm thử khó

| Yêu cầu | File bằng chứng | Trạng thái kỹ thuật |
|---|---|---|
| Unit/provider/storage và Mongo integration | [provider](../../backend/tests/provider.test.ts), [storage](../../backend/tests/storage.test.ts), integration auth/product/library/recovery | Đã chạy, skip được công bố; không phải cloud live |
| Same key/body, khác body, quota user, cooldown | [product.test.ts](../../backend/tests/integration/product.test.ts) | Có replay/race/quota assertions và số inference |
| Hai user tranh lượt app cuối, active lock với quota còn nhiều | [postmerge-recovery.test.ts](../../backend/tests/integration/postmerge-recovery.test.ts) | Hai race độc lập, assertion counter/job/lock và rollback loser |
| AI timeout, DB lỗi sau upload, saving sau restart | [product.test.ts](../../backend/tests/integration/product.test.ts) | Có assertions inference/DB/storage |
| processing lease hết hạn, queued sau restart | [postmerge-recovery.test.ts](../../backend/tests/integration/postmerge-recovery.test.ts) | needs_review không gọi lại; queued chỉ1 inference giả lập |
| Saving lỗi đủ3 lần và upload mất phản hồi | Cùng file recovery; storage adapter tests kiểm tra bytes khi outcome không rõ | Giữ checkpoint, cùng key/bytes, không thêm ảnh/inference |
| Cleanup lỗi/backoff/cap5 | Cùng file recovery | Chưa tới hạn không retry; đủ5 lỗi dừng; giữ file/history/quota |
| JWT tamper/expiry/logout, CSRF và IDOR | [auth-jwt](../../backend/tests/auth-jwt.test.ts), [auth integration](../../backend/tests/integration/auth.test.ts), library/history browser | Local isolated; không thay cho mọi deployment origin/cookie topology |
| Một ảnh FLUX thật + authenticated delivery/unsigned denial + usage trước/sau | Cần phối hợp Hiếu/Vũ trên môi trường nhóm | **OPEN QUESTION / chưa thực hiện trong task này** |

Không sửa worker/provider/auth runtime hoặc quota policy. Những thay đổi source runtime
thuộc owner Hiếu/Vũ vẫn cần phối hợp nếu sau này có lỗi được tái hiện.

## Bàn giao minh chứng MongoDB

- [Schema/index inventory](../backend/evidence/postmerge-schema-indexes-2026-11-04.json):
  lấy từ Mongoose declarations, chỉ có tên field/type/required/index, không có record người dùng.
- [Thực nghiệm ngày04/11](../backend/evidence/postmerge-course-2026-11-04.json):
  10.000 metadata synthetic, MongoDB8.2.6 một node replica set, Node24.21.0, Windows x64.
  Trước index quét10.000 documents/0key, sau index quét20documents/20keys cho20kết quả;
  plan COLLSCAN/SORT→IXSCAN/FETCH/LIMIT. Lần đo28ms/6ms chỉ phản ánh môi trường này.
- Aggregation owner:143 failed/857 succeeded; `$lookup`20 record cùng owner/reference.
  Đây là status synthetic, không phải tỷ lệ chất lượng/thành công FLUX thật.
- Validator raw BSON reject sai type; transaction commit1 record/counter1 và rollback
  không để record thứ hai/counter tăng thêm. Không tuyên bố đã cài validator cho mọi collection sản phẩm.

| Collection | Dữ liệu và lý do | Index khai báo |
|---|---|---|
| users | Hồ sơ `displayName`/email, tham chiếu active job; không nhúng lịch sử tăng vô hạn | unique email |
| sessions | Tham chiếu user, hash jti/CSRF, expiry; không lưu JWT thô | unique tokenHash; user+expiry; TTL expiresAt |
| generations | Prompt gốc/submitted, settings/error/lease/checkpoint nhúng; tham chiếu user/image | unique user+requestKey; user+createdAt+_id; status+createdAt |
| images | Metadata/storage nhúng; user/generation tham chiếu; bytes ở cloud | unique generationId; user+deletedAt+createdAt+_id |
| dailyUsage | Counter riêng theo user/app/ngàyUTC, không reset bằng TTL | unique scopeType+scopeId+dateKey |

TTL sessions chỉ dọn rác, auth vẫn kiểm tra expiry/revocation. Integration tạo declared indexes
trên DB test; không drop/sync index hay ghi vào DB demo. Rationale chi tiết nằm ở
[database-design](../backend/database-design.md), [baseline03](../technical-baseline/03-MONGODB.md)
và [bàn giao C/D](TASK_C_D_LIBRARY_HISTORY_HANDOFF.md).

## JSON metadata — phương án để nhóm review (PROPOSAL)

Chủ dự án trong chat ngày04/11 chọn **“Chưa chốt — chuẩn bị phương án để nhóm review”**.
Đây chưa phải duyệt format/CLI hoặc xác nhận đóng D5. Tham chiếu
[bản đối chiếu D5](D5_METADATA_IMPORT_EXPORT_AUDIT.md); không coi JSON là backup file Cloudinary.

| Phương án | Phạm vi đề xuất | Điều cần xác nhận |
|---|---|---|
| A — metadata để nộp/bàn giao | Export projection whitelist của dữ liệu synthetic hoặc một owner đã xác định; không import vào app | Có cần prompt thật không, đối tượng nhận file, chỉ xuất có đủ nhu cầu của Vũ không |
| B — minh chứng export→import | CLI nội bộ, DB/collections demo riêng, schema version/limits/ID mapping/duplicate policy; không worker | Dataset, cách xác định owner đích, cách xử lý nhập lặp, có chấp nhận chỉ metadata demo không |
| C — chuyển ảnh dùng được giữa máy nhóm | Metadata + quyền/namespace/storage/integrity và cơ chế cleanup riêng | Phải xác định file cloud và quyền đích trước; phạm vi rộng hơn round-trip JSON |

Đề xuất bắt đầu A hoặc B nếu nhu cầu là báo cáo học phần; chưa tự chọn thay nhóm.
Không import sessions/passwordHash/JWT/quota/active lease hoặc URL tùy ý;
không để bản sao thiếu file thành ảnh succeeded hoặc xóa asset còn dùng chung.
Không thêm UI/API/schema/dependency. Chỉ triển khai sau khi Vũ/Hiếu chốt phạm vi và cập nhật contract.

Nội dung đề nghị trao đổi (bản nháp, chưa gửi):

> Tôi đã kiểm tra lại Thư viện/Chi tiết/Lịch sử trên code sau PR21/23/24 bằng API thật,
> DB tạm và storage giả lập, kèm hai tài khoản và logout/login. Nhờ Vũ đối chiếu cùng
> trên môi trường cloud thật. Về JSON metadata, nhờ Vũ/Hiếu chốt A (xuất để bàn giao),
> B (round-trip demo DB riêng) hay C (chuyển ảnh dùng được giữa máy); metadata không backup file Cloudinary.

## Giới hạn nghiệm thu

Task này đủ bằng chứng tự động để nhóm review các mục local/isolated. Chưa có xác nhận
review chéo hoặc buổi kiểm tra cùng Vũ, chưa tạo ảnh cloud/kiểm tra unsigned URL trong task này,
chưa có format/CLI JSON đã duyệt. Không tick các mục này hoặc đóng Issue17 thay nhóm.
Issue25 và các cải tiến sau đề tài vẫn chờ ưu tiên của nhóm.
Diff chỉ gồm test và tài liệu/evidence, không đổi source sản phẩm/model/contract/dependency,
không tác động cấu hình Docker hoặc DB/cloud đang chạy của nhóm. Chưa commit/push hoặc cập nhật checklist GitHub.
