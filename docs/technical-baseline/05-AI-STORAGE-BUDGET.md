> **Cập nhật01/11/2026:** [09-CLOUDINARY-DECISION](09-CLOUDINARY-DECISION.md) thay quyết định Azure-first bằng Cloudinary authenticated. Các mô tả Azure/chưa có Cloudinary dưới đây là lịch sử hoặc thiết kế mở rộng nếu mâu thuẫn09. Xem [LOCAL_RUN](../development/LOCAL_RUN.md) để chạy hiện tại.

# 05 — FLUX, cloud storage và ngân sách
Xác minh tài liệu công khai ngày 30/10/2026; hạn mức provider có thể thay đổi, cần kiểm tra dashboard trước demo.

## AI đã chọn
CONFIRMED Cloudflare Workers AI REST với @cf/black-forest-labs/flux-1-schnell.
API token + Account ID server-only. Node native fetch; không cần SDK Gemini/BFL.
Một request một ảnh; steps4 mặc định; prompt tối đa2048 ký tự theo endpoint.
Không tự thêm tham số kích thước/negative prompt/batch nếu endpoint không xác nhận.
Output base64 chỉ là dữ liệu trung gian: decode/validate bytes rồi upload cloud, không đưa base64 vào DB/log.
Chưa có tích hợp Cloudflare trong code hiện tại.

## Ngân sách
Cloudflare Workers Free:10.000 neurons/ngày/tài khoản, reset00:00UTC (07:00 VN); dùng chung giữa model.
Hết quota trên Free: fail request, không tự nâng gói. Chuyển model không tạo quota mới.
Ước tính 1024x1024,4 steps:4 tiles*4,8 +4*9,6=57,6 neurons/ảnh;10.000/57,6≈173 ảnh lý thuyết.
Không bảo đảm 173 ảnh thành công; kiểm chứng kích thước output và dashboard trước dùng con số; lỗi/ứng dụng khác cũng có thể dùng tài nguyên.
PROPOSAL ban đầu:5 request/user/ngày,20 request/app/ngày,1 active/user,worker concurrency1,cooldown15giây.
Đây là mức vận hành thận trọng, không phải provider quota hoặc giá token. Chỉ tăng sau đo.
Không bật billing/paid plan; kiểm tra AI và storage quota độc lập. Budget alerts không được coi là hard spending cap.

## Cloud storage
CONFIRMED ảnh cuối nằm cloud; DB giữ metadata và key + URL phù hợp delivery.
CONFIRMED Azure Blob private trước; chủ dự án có Azure for Students, báo còn76USD credit. Cloudinary là đích có thể chuyển sau này, không phải provider chạy song song MVP.
Đọc [quy định storage và migration](07-STORAGE-PORTABILITY.md) trước tích hợp.
Chỉ xây Azure adapter trước; registry đọc/xóa theo descriptor mỗi record. Default provider chỉ điều khiển upload mới; không đổi provider của file cũ chỉ bằng env.
Upload server-side; key xác định theo generationId + namespace riêng từng môi trường.
Kiểm tra MIME/signature/size/dimensions; PROPOSAL max10MiB, width/height<=4096; chỉ PNG/JPEG/WebP, cần đo trước khóa.
Tạo ảnh thành công chỉ sau upload và DB metadata. Temp local ngoài public root phục vụ saving recovery, có cleanup.

| Lựa chọn (bảng so sánh, không phải hai cấu hình active) | Lợi ích | Điều kiện 0 đồng / giới hạn |
|---|---|---|
| Cloudinary Free | upload, delivery, quản lý ảnh | 25 credits/tháng theo tài liệu; storage/bandwidth/transformation dùng credit, không là25ảnh |
| Azure Blob | object storage, private access/SAS | Azure for Students $100/12tháng nếu đủ điều kiện; verify subscription/credit/spending limit; không miễn phí vô hạn |

Không tạo tài khoản cloud/storage hay gọi API trong task docs. Không bảo đảm quota/tier dựa chỉ vào tên dịch vụ.

## Private đã chọn; public chỉ giải thích khác biệt
Public: ai có URL xem được dù chưa login; API list/rename/delete vẫn ownership. Chỉ phù hợp ảnh demo không nhạy cảm nếu user chấp nhận.
Private: storage chặn anonymous; backend check owner rồi proxy hoặc cấp signed/SAS read-only ngắn hạn.
Signed URL vẫn là bearer link: người được chia sẻ URL xem được đến expiry, không tự gắn với session của website.
DB lưu key bền vững, không lưu signed URL hết hạn làm địa chỉ chính.
Proxy một origin public không làm file đó riêng tư. Không nhận image URL tùy ý để backend tải (SSRF).
ST-06/ST-07 đã chốt Azure private. PROPOSAL backend proxy/stream qua API ownership; không cấp SAS cho browser mặc định. Azure SDK/identity/RBAC cần PR triển khai và kiểm chứng.
Đổi sang Cloudinary phải bảo toàn private delivery và kiểm tra tier hỗ trợ; không âm thầm public ảnh.
Giữ spending limit trên subscription hỗ trợ, xác minh ngày hết hạn và76USD còn lại ở portal trước resource setup; không nâng Pay-As-You-Go. Giá storage/operations/transfer đều có thể trừ credit; không cam kết0đồng ngoài credit/hạn mức.

## Fallback và retention
Không auto fallback sang model khác sau timeout; có thể đã tạo ảnh và tính tài nguyên.
Cloud upload retry bằng cùng key, không retry inference. Reconcile orphan và deletion pending.
Retention cloud/checkpoint chưa chốt số ngày; không xóa tự động trước khi có policy và kiểm thử.
Giới hạn storage tổng, max ảnh/user và cảnh báo quota là PROPOSAL cần đo account.

## Nguồn
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- https://cloudinary.com/documentation/billing_and_plans
- https://learn.microsoft.com/en-us/azure/education-hub/azure-dev-tools-teaching/azure-students-program
- https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure

