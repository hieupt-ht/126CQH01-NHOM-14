# D5 — Đối chiếu import/export metadata học phần

Ngày kiểm tra: 02/11/2026. Người phụ trách: Định; reviewer: Hiếu.
Nền kiểm tra: `92a7690`, nhánh `codex/library-history-integration`; `origin/develop` ở `eab802f`.
Phạm vi: mục D5 trong [Issue #17](https://github.com/hieupt-ht/126CQH01-NHOM-14/issues/17),
đọc cùng [phân công thay thế](https://github.com/hieupt-ht/126CQH01-NHOM-14/issues/17#issuecomment-6560294331).
Đây là kết quả đối chiếu, không phải công cụ export/import đã triển khai hoặc bằng chứng round-trip.

## 1. Kết luận theo nguồn

| Nguồn đã đọc | Nội dung tìm thấy | Kết luận |
|---|---|---|
| [PRD mục2.2, 2.3 và5](../../PRD.md) | Mục tiêu học phần, P0/P1 và FR-01–14 không liệt kê import/export | CONFIRMED về nội dung PRD hiện có; không suy ra yêu cầu giảng viên |
| [PRD mục9.5](../../PRD.md#95-truy-vấn-và-thực-nghiệm-học-phần) | CRUD, paging, aggregation/$lookup, concurrency, 10k metadata và explain | Có yêu cầu thực nghiệm MongoDB, không có tiêu chí round-trip metadata |
| [PRD mục10, 14, 15.1](../../PRD.md) | Không có endpoint import/export; bàn giao API mẫu, seed, query và báo cáo | Xuất báo cáo thực nghiệm khác xuất/nhập dữ liệu ứng dụng |
| Issue #17, D5 | Đối chiếu; **nếu cần** công cụ metadata thì bảo vệ schema/ownership/chống trùng; không secret, không UI mới | CONFIRMED: phải đối chiếu và bảo vệ nếu triển khai; chưa chốt định dạng/lệnh |
| [Baseline03: JSON import/export](../technical-baseline/03-MONGODB.md#json-importexport) | Nhu cầu dữ liệu nhóm được ghi nhận; CLI/script, format version và script thật chưa có | CLI/định dạng cụ thể vẫn PROPOSAL; không coi là đã triển khai |
| [Baseline04](../technical-baseline/04-API-FRONTEND.md) và [README baseline](../technical-baseline/README.md) | Chưa giao endpoint hoặc nút import/export MVP | Không tự thêm route/API/UI |
| [Baseline08](../technical-baseline/08-IMPLEMENTATION-STATUS.md) | Course report là minh chứng riêng; JSON không sao lưu file cloud | Chưa có import/export vận hành toàn bộ dữ liệu |
| [Cải tiến bị hoãn](../project/POST_COMPLETION_IMPROVEMENTS.md) | Import/export mở rộng, preview nhập nằm trong đề xuất sau đề tài; phần gốc nếu có vẫn phải làm | Không dùng mục cải tiến để tự mở rộng hoặc bỏ yêu cầu học phần thực sự |

**CONFIRMED:** đã hoàn tất rà soát nguồn hiện có và phân loại khoảng trống.
Không tìm thấy rubric/đề cương giảng viên riêng hoặc contract import/export đã duyệt trong repository.
Vì PRD tự ghi chưa phải tiêu chí chấm điểm chính thức, không kết luận giảng viên không yêu cầu chức năng này.

**CONFIRMED — D5-01, thông tin Định cung cấp trong chat ngày02/11:** “Chưa có yêu cầu riêng”
từ leader/giảng viên về demo import/export metadata. Đây là thông tin người thực hiện cung cấp,
không phải xác nhận nghiệm thu hoặc miễn yêu cầu của leader/giảng viên.
**PROPOSAL:** dựa trên PRD và câu “nếu cần” của Issue #17, đề nghị reviewer xác nhận
phần đối chiếu và bảo vệ có điều kiện là đủ cho D5 hiện tại, chưa cần triển khai CLI.
Khi phát sinh yêu cầu: xác nhận đối tượng dữ liệu, môi trường đích và minh chứng trên collections demo riêng
hay phục hồi bản ghi ứng dụng có file ảnh trước khi triển khai.

## 2. Kiểm kê code hiện có

| File/lệnh | Thực sự làm gì | Không chứng minh điều gì |
|---|---|---|
| [package.json](../../backend/package.json): `course:report` | Chạy script thực nghiệm trên replica set tạm riêng | Không có lệnh metadata export/import |
| [course-report.ts](../../backend/src/scripts/course-report.ts) | Tạo10k synthetic metadata trong `course_*`; ghi report/explain JSON vào `backend/data/course-report/` | Không xuất record người dùng/ảnh/job của DB ứng dụng, không đọc file để import, không round-trip |
| [create-indexes.ts](../../backend/src/scripts/create-indexes.ts) | Tạo indexes khai báo cho DB được cấu hình | Không sao lưu hoặc nhập dữ liệu |
| [dev-local.ts](../../backend/src/scripts/dev-local.ts) | Khởi động môi trường local có dữ liệu bền vững | Không backup/restore |
| [product routes](../../backend/src/modules/product/routes.ts) | DTO owner-scoped cho ảnh, job và thao tác sản phẩm | List JSON và tải file ảnh không phải endpoint export/import metadata |
| [snapshot thực nghiệm](../backend/evidence/library-history-course-2026-11-02.json) | Kết quả explain/aggregation/$lookup/transaction trên metadata tổng hợp | Không phải backup MongoDB hoặc Cloudinary |

Không tìm thấy wrapper/lệnh import/export metadata ở source, package scripts hoặc test hiện có.
Đã tìm các tên công cụ mongoexport/mongoimport/mongodump/mongorestore và các tên metadata import/export;
các đề cập liên quan hiện nằm trong tài liệu, chưa là implementation.
Chưa chạy import/export hoặc phục hồi dữ liệu trong task này.

## 3. Ràng buộc bắt buộc nếu có bước triển khai

Các nguyên tắc dưới đây áp dụng từ Issue #17/baseline; không phải tuyên bố công cụ hiện có đã bảo vệ đủ.

| Nhóm | Bảo vệ và bằng chứng cần có |
|---|---|
| Schema | Parse cấu trúc trước ghi DB; whitelist field và nested field; reject field/operator lạ, sai enum/type/date/ID, schema version không hỗ trợ; giữ ràng buộc model hiện hành |
| Giới hạn | Chốt và kiểm tra giới hạn bytes/số record trước khi đọc/ghi; không dùng file hoặc path tùy ý để fetch dữ liệu bên ngoài |
| Ownership | Export phải lọc owner ở query; không tin `userId` trong file nhập; đích do operator hợp lệ xác định, kiểm tra từng quan hệ generation–image cùng owner |
| Tham chiếu | Có mapping old→new IDs được kiểm tra; reject dangling/cross-owner references và trùng ID; không dùng ObjectId làm bằng chứng quyền |
| Chống trùng | Chốt reject/skip/upsert trước; import lặp không thêm bản ghi hoặc ghi đè khác owner; kiểm tra unique index thật và rollback khi lỗi |
| Bí mật | Không export/import users credentials, sessions, JWT/jti/tokenHash/csrfTokenHash, password/passwordHash, DB URI, API key/secret hoặc signed URL tạm; không log raw record/secret khi lỗi |
| Trạng thái chạy | Không khôi phục queued/processing/saving thành job có thể bị worker claim; không import quota/active lock/lease/checkpoint hoặc trigger generation/cleanup |
| Cloud | Không nhận URL/provider/key từ file để tự fetch/xóa; metadata không tạo quyền với asset. Không nối bản sao metadata vào cleanup nếu asset còn dùng chung |
| Môi trường | Demo/test trong DB hoặc collections riêng; không drop DB demo/live, không chạy migration hoặc overwrite ảnh thật để minh chứng |

Model [generation](../../backend/src/models/generation.model.ts) có `requestKey`, lease,
checkpoint, quotaReservation; model [image](../../backend/src/models/image.model.ts) có descriptor storage
và cleanup state. Vì vậy không được dùng nguyên document hai collection làm file trao đổi.
Không xuất toàn bộ `users`, `sessions`, `dailyUsage` để chia sẻ demo cho thành viên khác.
Prompt có thể chứa dữ liệu cá nhân; dùng dữ liệu synthetic cho minh chứng, chỉ đưa prompt thật vào
file nội bộ khi đã xác định mục đích và quyền sử dụng. Không sửa prompt gốc của lịch sử.

## 4. Đề xuất tối thiểu để nhóm quyết định (PROPOSAL)

Nếu cần minh chứng học phần, ưu tiên CLI nội bộ với dữ liệu synthetic và DB test riêng,
export metadata được whitelist rồi import vào namespace/collections demo riêng có ID mapping.
Không ghi thẳng bản sao thiếu file vào `images`/`generations` sản phẩm để giả thành ảnh đã lưu hoặc job thành công.
Không tạo tài khoản bằng hash/password lấy từ file nhập; dùng tài khoản demo tạo hợp lệ nếu scope cần user.
Định dạng, version, limits và duplicate policy phải được chốt trước khi viết công cụ;
không coi bảng này là API/schema/command đã duyệt.

Nếu yêu cầu là chuyển/khôi phục ảnh có thể xem và xóa trong app, cần scope riêng gồm
ownership, mapping storage namespace, file thực, integrity và cleanup; chỉ import metadata là không đủ.
Các đề xuất “preview nhập”, UI import/export hoặc migration cloud mở rộng vẫn bị hoãn.

Các ca nghiệm thu cho công cụ **sau khi được xác nhận cần triển khai**:

1. Round-trip fixture hợp lệ: count/field/reference đúng, không lộ trường bị cấm.
2. User B không export/import/ghi đè dữ liệu A; reject reference chéo owner.
3. Reject file sai schema/version, field lạ/secret lồng nhau, ID/date sai và file vượt giới hạn; không ghi dở.
4. Nhập lặp cùng file theo duplicate policy đã chốt; race không tạo duplicate.
5. Lỗi giữa transaction rollback metadata; DB demo/live không đổi.
6. Assert số gọi AI/storage/cleanup bằng0; không có active job được worker nhận.
7. File cloud không tồn tại không được biến thành ảnh succeeded có thể phục vụ trong thư viện.

Các ca trên là tiêu chí đề xuất, **chưa chạy**, vì chưa có công cụ cần test.

## 5. Phân biệt export và backup

**CONFIRMED theo baseline:** JSON metadata không chứa bytes ảnh, không backup file Cloudinary,
không đảm bảo tái tạo indexes/options/validator hoặc quyền tài khoản cloud.
Baseline nhắc mongoexport/mongoimport cho dữ liệu và mongodump/mongorestore cho backup DB;
D5 không chạy, xác minh phiên bản hoặc cung cấp lệnh raw tool cho DB thật.
Backup/restore DB và backup cloud là quy trình riêng, có kiểm tra môi trường và phục hồi riêng.
Không đưa URI/credential thật vào tài liệu, JSON, issue hoặc PR.

## 6. Bàn giao và trạng thái D5

- Kiểm tra đã chạy: tìm kiếm toàn repo với `rg` về import/export và raw MongoDB tools;
  đọc các mục PRD/baseline và scripts/routes/models liên quan; kiểm tra relative links/anchors,
  `git diff --check` và diff chỉ gồm Markdown. Không chạy build/test runtime vì không đổi code.
- **Đã làm:** đọc/đối chiếu PRD–Issue–baseline–source, kiểm kê công cụ, ghi chính sách an toàn,
  phân biệt metadata/report/backup và lập tiêu chí triển khai có điều kiện.
- **Chưa làm:** CLI export/import, runtime round-trip, cloud backup/migration; không claim những phần này đã đạt.
- **Kết luận đối chiếu:** đã hoàn thành rà soát và bàn giao để Hiếu review. Đề nghị Hiếu xác nhận
  phạm vi này đủ đóng D5 hay cần CLI demo riêng; chưa coi câu trả lời trong chat là nghiệm thu của leader.
  CLI/format/round-trip vẫn là PROPOSAL, không được ghi là đã hoạt động.
  Nghiệm thu cloud/kiểm thử chung của Issue #17 vẫn riêng biệt.
- Không đổi source/model/API/UI/dependency hoặc dữ liệu. Không gọi DB/cloud; commit/push tài liệu theo yêu cầu riêng của người dùng sau bước đối chiếu.
