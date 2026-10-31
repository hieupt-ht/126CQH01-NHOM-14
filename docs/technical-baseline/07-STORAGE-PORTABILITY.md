# 07 — Lưu trữ độc lập nhà cung cấp và chuyển cloud
Ngày: 30/10/2026. Decision ST-18. Quy định thiết kế đã được chủ dự án yêu cầu; chưa triển khai adapter hoặc chuyển dữ liệu thật.

## 1. Quyết định áp dụng
- CONFIRMED: Azure Blob Storage private là provider đầu tiên, tận dụng Azure for Students hiện có (user báo còn76USD; chưa kiểm tra portal).
- CONFIRMED: có khả năng đổi sang Cloudinary sau này qua adapter; không gắn nghiệp vụ/frontend vào Azure.
- CONFIRMED: giữ quyền riêng tư khi chuyển. Không đổi private thành public để đơn giản hóa tích hợp.
- Chỉ xây Azure adapter cho MVP; Cloudinary adapter và migration runner chỉ xây khi có task chuyển cloud.
- PROPOSAL: dùng backend stream/proxy có session cho ảnh inline và download ở MVP; không trả SAS cho browser mặc định.
- PROPOSAL: SDK @azure/storage-blob + @azure/identity, Entra credential/RBAC phù hợp máy local; kiểm tra quyền thực tế trước cài/tích hợp.
- Cloudinary tương lai phải kiểm chứng private/authenticated delivery và gói tài khoản đủ dùng; không giả định Free hỗ trợ mọi yêu cầu.

## 2. Hợp đồng storage
Service nghiệp vụ chỉ gọi ImageStorage; SDK Azure/Cloudinary chỉ được import trong adapter/config wiring.
Mẫu dưới là contract đích; chưa phải interface có sẵn trong repo:
~~~ts
type StoredObject = {
  provider: 'azure' | 'cloudinary';
  accountAlias: string; // tên cấu hình server, không credential
  container: string;    // Azure container / namespace tương ứng adapter
  key: string;          // blobName / publicId
  version?: string;    // identity phiên bản nếu provider có
  deliveryMode: 'private';
};
type VerifiedObject = {
  object: StoredObject;
  bytes: number;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  sha256: string;
};
interface ImageStorage {
  put(input: {
    operationId: string;
    logicalKey: string;
    sourcePath: string; // checkpoint do backend tạo, không phải đường dẫn từ request
    contentType: VerifiedObject['contentType'];
    expectedBytes: number;
    expectedSha256: string;
  }): Promise<VerifiedObject>;
  head(object: StoredObject): Promise<VerifiedObject | null>;
  openRead(object: StoredObject): Promise<NodeJS.ReadableStream>;
  delete(object: StoredObject): Promise<void>;
}
~~~
- put phải idempotent theo operationId/logicalKey; object đã có cùng nội dung thì reuse, khác checksum thì conflict, không overwrite mù.
- Nếu SDK/provider không hỗ trợ trực tiếp, adapter/runner phải reconcile bằng key và đọc bytes; không được giả vờ exactly-once.
- head không được trả sha256 tự đặt theo input mà chưa xác minh; nếu provider không có checksum tương đương thì phải đọc file để xác minh.
- Không so sánh ETag Azure với ETag Cloudinary như checksum nội dung; có thể khác thuật toán/ý nghĩa.
- delete không có object coi là hoàn thành; permission/network lỗi phải có mã lỗi an toàn và retry phù hợp.
- openRead hỗ trợ lỗi stream, client disconnect và giới hạn bộ nhớ; không buffer toàn thư viện.
- Tách các lỗi NOT_FOUND, UNAVAILABLE, QUOTA_EXCEEDED, ACCESS_DENIED, CONTENT_CONFLICT; không đưa raw SDK/secret ra response.

## 3. Registry và cấu hình
- StorageRegistry.forObject(object) định tuyến theo provider + accountAlias trên bản ghi.
- IMAGE_STORAGE_PROVIDER chỉ chọn nơi ghi ảnh MỚI; không chọn nơi đọc/xóa tất cả ảnh.
- Giữ config/credential read-delete của provider cũ trong giai đoạn cùng tồn tại; không xóa ngay sau đổi env.
- Validate accountAlias/container theo allowlist server; không biến metadata import thành URL fetch hoặc tài khoản đích tùy ý.
- Namespace tách dev/test/demo và generationId; không chứa email/prompt.
- Không upload cùng lúc hai cloud cho mỗi generation ở MVP; không auto fallback khi upload timeout.
- Ảnh Azure cũ tiếp tục đọc qua Azure dù ảnh mới chuyển Cloudinary.

## 4. MongoDB và ID ổn định
PROPOSAL schema mở rộng (cần PR model/validator/migration riêng):
~~~json
{
  "_id": "<imageId giữ nguyên>",
  "userId": "<owner giữ nguyên>",
  "generationId": "<generationId giữ nguyên>",
  "storageRevision": 1,
  "storage": {
    "provider": "azure",
    "accountAlias": "demo-primary",
    "container": "generated-images",
    "key": "demo/generations/<generationId>/original.png",
    "deliveryMode": "private"
  },
  "integrity": {
    "sha256": "<checksum bytes gốc>"
  }
}
~~~
Schema hiện có provider/key/version?/deliveryMode; accountAlias/container/storageRevision/integrity chưa tồn tại.
Đo kích thước/format/bytes từ ảnh thật; không suy ra từ đuôi URL.
Không persist SAS/signed URL/API key/connection string vào MongoDB, JSON export hoặc log.
Không cần storage.url cho private: DB giữ định danh bền vững, backend tạo đường truy cập.
Không đổi imageId/generationId/userId khi chuyển, không tạo generation mới, không tính quota AI.
Backfill bản ghi cũ trước rollout; record thiếu provider/config phải báo lỗi an toàn, không fallback tùy ý.
Giữ namespace/owner đúng khi import; file cùng key không đồng nghĩa cùng quyền.

## 5. API ổn định
PROPOSAL khóa contract khi làm integration:
- GET /api/v1/images/:id/content: session + lookup {_id,userId,deletedAt:null}, backend stream private.
- GET /api/v1/images/:id/download: cùng ownership, Content-Disposition attachment an toàn.
- DTO có contentUrl/downloadUrl là relative API paths theo imageId, không là URL nhà cung cấp.
- Cache-Control: private,no-store; X-Content-Type-Options:nosniff; MIME thực tế.
- Không trả container/key/accountAlias/credentials trong DTO public.
- Frontend không import SDK, ghép blob URL, parse publicId hoặc quyết định provider.
Nếu sau này cần SAS: task riêng, read-only trên đúng một object, HTTPS, TTL ngắn có cấu hình, issue sau ownership; bearer URL có thể chia sẻ đến expiry.
Private container không đòi private network endpoint; backend local có thể dùng endpoint HTTPS công khai với Azure authentication.
Không thêm Azure private endpoint/CDN/VM chỉ vì chữ private, tránh chi phí và complexity không cần.

## 6. Cấu hình Azure ban đầu
PROPOSAL Standard GPv2, Hot, LRS phù hợp demo; xác minh giá vùng trước tạo.
Disable anonymous blob access ở account, container private.
Entra/RBAC quyền tối thiểu cần upload/read/delete trong namespace; không trao account key cho frontend.
Local có thể dùng Azure CLI login qua DefaultAzureCredential sau cấp role; CI không dựa vào phiên CLI cá nhân.
Chưa chốt identity deployment; credential thật chỉ server environment/identity, không tài liệu/Git.
Theo dõi credit76USD và ngày hết hạn trong portal; không coi credit là miễn phí vĩnh viễn.
Giữ spending limit nếu subscription hỗ trợ; không chuyển Pay-As-You-Go. Alerts không phải hard cap.
Chưa truy cập portal hoặc tạo resource trong task docs.

## 7. Quy trình chuyển Azure → Cloudinary
Mục tiêu: chuyển dần, có thể tiếp tục phục vụ ảnh, không xóa nguồn trước kiểm chứng.

1. Kiểm chứng Cloudinary private delivery + điều kiện gói, credential, cùng định dạng gốc; tải lên không áp dụng lossy transformation vào bản gốc.
2. Backup metadata và tạo manifest vận hành có migrationId, imageId, source descriptor/revision, target descriptor, checksum, bytes, state, attempts, lastError.
   PROPOSAL manifest JSONL riêng cho đồ án; không tăng collection sản phẩm chỉ để có migration. Không chứa secrets/signed URL.
3. Dry-run chỉ liệt kê số object, dung lượng, thiếu file, quyền, quota và ước lượng transfer cost; không ghi DB/file.
4. Thí điểm vài ảnh gồm nhiều format, dung lượng, quyền user; chạy content/download và rollback trước bulk.
5. Đọc source snapshot, copy bytes gốc sang target với deterministic key; concurrency thấp, backoff hữu hạn.
6. Xác minh target private, bytes, MIME, dimensions và SHA-256 bằng bytes; chỉ provider upload success chưa đủ.
7. Compare-and-set DB theo _id, storageRevision, source descriptor và deletedAt:null; atomically thay storage và tăng revision.
   Nếu record đã đổi/xóa, không overwrite/khôi phục ảnh. Ghi target orphan vào cleanup manifest và đối soát trước xóa.
8. Read path tiếp tục route theo metadata từng ảnh. Ảnh chưa chuyển vẫn dùng Azure, ảnh chuyển dùng Cloudinary.
9. Audit ownership/content/download/history sau cutover; manifest lưu checkpoint bền vững để resume không tạo bản sao trùng.
10. Giữ source trong retention window được duyệt (PROPOSAL7ngày); xóa từng source chỉ sau nghiệm thu và hết rollback window, không xóa toàn container.

## 8. Crash, xóa ảnh và rollback
- Crash sau upload trước manifest/DB: reconcile deterministic target key và checksum, không upload bản mới ngẫu nhiên.
- Crash sau DB switch: đọc lại revision/descriptor để biết commit đã xảy ra; không quyết định chỉ theo manifest cũ.
- User xóa trong lúc migration: không switch ảnh deleted; cleanup phải đối soát cả source/target trong manifest và metadata.
- Cleanup job lưu descriptor đầy đủ của object cần xóa; không chỉ imageId vì image có thể đã đổi provider.
- Trước mọi source/target delete kiểm tra không còn active reference; không xóa object dùng chung giữa DB/môi trường.
- Rollback kiểm tra source còn tồn tại, private và checksum đúng; CAS target descriptor/revision hiện tại → source.
- Không rollback ảnh user đã xóa; không ghi đè rename/favorite mới; chỉ đổi storage fields/revision.
- Sau rollback, giữ target trong cleanup window rồi dọn qua manifest. Không xóa target đang được tham chiếu.
- Khi nguồn đã bị xóa sau retention, rollback cần bản backup/file còn ở target; không hứa một nút quay lại vô hạn.

## 9. Chứng minh không phụ thuộc provider
Trước adapter được nghiệm thu:
- Contract tests chung put/head/read/delete và lỗi trên từng adapter.
- Runtime registry đọc/xóa đúng provider cũ sau đổi default write provider.
- Cross-user/unauthenticated không đọc/download, raw storage URL không anonymous.
- Migration dry-run không mutation; resume không duplicate; checksum mismatch không switch.
- Crash mọi mốc, rename/delete concurrent, CAS conflict, rollback không hồi sinh ảnh.
- images._id, userId, generationId, generation status, AI quota và history không đổi.
- Không gọi FLUX khi migrate/import/download; không leak secret qua log/export.
Dùng fake adapter/unit tests mặc định; live smoke trên namespace test khi có task và tài khoản phù hợp.

## 10. Giới hạn và nguồn
Không chuyển cloud bằng cách replace hostname URL trong JSON.
Không bảo đảm thời gian chuyển trước khi biết số bytes, network, quotas và account capabilities.
Tách adapter giúp giảm phần sửa code; không loại bỏ công việc chuyển file, chi phí transfer và kiểm chứng quyền riêng tư.
Nguồn kiểm tra30/10/2026:
- https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure
- https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-javascript-get-started
- https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit

