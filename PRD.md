# PRD — Ứng dụng tạo và quản lý ảnh từ mô tả bằng Node.js, MongoDB và FLUX API

**Phiên bản:** 1.0 — bản đề xuất triển khai MVP  
**Ngày:** 20/10/2026  
**Bối cảnh:** Đồ án học phần Cơ sở dữ liệu phi quan hệ; nhóm 3 sinh viên; ưu tiên ngân sách dịch vụ 0 đồng trong hạn mức miễn phí.  
**Tên sản phẩm tạm thời:** PromptCanvas

Tài liệu này tổng hợp phạm vi đã thảo luận, kèm các quyết định triển khai đề xuất. Đây chưa phải đề cương hoặc tiêu chí chấm điểm chính thức của giảng viên. Mốc thời gian và ngưỡng nghiệm thu dưới đây là mục tiêu của nhóm, cần điều chỉnh sau khi thử tích hợp thực tế.

## 1. Tổng quan sản phẩm

### 1.1. Vấn đề cần giải quyết

Người dùng muốn nhập một đoạn mô tả tự do để tạo ảnh, sau đó xem lại và quản lý kết quả. Họ không cần hiểu cú pháp prompt, API hoặc điền nhiều trường bắt buộc.

Nhóm phát triển cần một ứng dụng đủ hoàn chỉnh để demo, kiểm soát tài nguyên AI và thể hiện rõ năng lực thiết kế, truy vấn, tối ưu MongoDB.

### 1.2. Giải pháp

Xây dựng website cho phép đăng ký, đăng nhập, nhập mô tả, tạo ảnh bằng FLUX, theo dõi xử lý, lưu ảnh và quản lý thư viện cá nhân. Node.js xử lý nghiệp vụ; MongoDB quản lý dữ liệu; dịch vụ lưu file giữ ảnh kết quả.

**Luồng giá trị chính:** Đăng nhập → nhập mô tả tự do → tạo ảnh → lưu kết quả → mở lại thư viện → tải xuống.

### 1.3. Người dùng và vai trò

| Vai trò | Nhu cầu và quyền |
|---|---|
| Khách chưa đăng nhập | Đăng ký, đăng nhập; không sử dụng API tạo ảnh và dữ liệu cá nhân |
| Người dùng đã đăng nhập | Tạo ảnh trong hạn mức; xem và quản lý ảnh, lịch sử của chính mình |
| Nhóm vận hành | Cấu hình hạn mức và secret phía server, xem dashboard nhà cung cấp, kiểm tra tác vụ lỗi; MVP không cần giao diện admin riêng |

## 2. Mục tiêu và giới hạn phạm vi

### 2.1. Mục tiêu sản phẩm

- Người dùng tạo được ảnh thật từ một đoạn mô tả tự do.
- Kết quả được lưu bền vững và mở lại sau khi đăng xuất hoặc tải lại trang.
- Các yêu cầu hợp lệ không bị gọi AI nhiều lần do nhấn nút hoặc gửi lại request.
- Hệ thống không chủ động mua hoặc nâng cấp dịch vụ khi hết hạn mức.
- Giao diện tiếng Việt, rõ trạng thái đang xử lý, thành công, lỗi và hết lượt.

### 2.2. Mục tiêu học phần

- Thiết kế collection, document nhúng, mảng và tham chiếu theo nhu cầu truy vấn.
- Thực hiện CRUD, schema validation, unique index và compound index.
- Xây dựng aggregation thống kê trên dữ liệu thật.
- Đo hiệu quả index bằng execution statistics trên dữ liệu mẫu.
- Thể hiện kiểm soát cập nhật đồng thời và tính nhất quán giữa tác vụ, metadata và file.

### 2.3. Phân loại ưu tiên

| Mức | Nội dung |
|---|---|
| P0 — bắt buộc | Auth; một ô prompt; tạo một ảnh; trạng thái tác vụ; lưu file và metadata; thư viện; chi tiết; tải xuống; đổi tên; xóa; lịch sử gồm cả lỗi; phân quyền; hạn mức; chống gửi trùng; báo cáo MongoDB |
| P1 — sau khi P0 chạy ổn | Yêu thích; tìm theo tiêu đề; lọc theo ngày; dashboard thống kê; hồ sơ cơ bản; phản hồi chất lượng ảnh |
| Ngoài MVP | Chỉnh sửa ảnh bằng AI; upload ảnh đầu vào; tạo truyện; nhân vật nhất quán; nhiều ảnh mỗi yêu cầu; thanh toán; cộng đồng; lựa chọn nhiều nhà cung cấp trên giao diện; AI viết lại prompt tự động |

Tài liệu thiết kế có thể dự trù mở rộng, nhưng không tạo trước toàn bộ collection truyện tranh hoặc hệ thống thanh toán.

## 3. Kiến trúc và ngân sách

### 3.1. Công nghệ đề xuất

| Thành phần | Lựa chọn | Vai trò |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Form, trạng thái tác vụ, thư viện |
| Backend | Node.js + Express | Xác thực, kiểm tra dữ liệu, API, điều phối tác vụ |
| Database | MongoDB Atlas Free + Mongoose | Metadata, lịch sử, hạn mức, truy vấn |
| AI | FLUX.1 Schnell qua Cloudflare Workers AI REST API | Tạo ảnh từ văn bản |
| Lưu file | Cloudinary Image and Video APIs Free | Giữ và phân phối file ảnh |
| Worker | Tiến trình Node.js đơn giản dùng MongoDB | Nhận và xử lý tác vụ nền |
| Môi trường đầu tiên | Laptop của nhóm | Chạy frontend, backend và worker; chưa cần VPS hoặc tên miền |

```text
React ──→ Express ──→ MongoDB
             ↑            ↑
             └── Worker ──┘
                    │
                    ├──→ Cloudflare / FLUX
                    └──→ Cloudinary / file ảnh
```

Node.js gọi REST API Cloudflare trực tiếp; ứng dụng không bắt buộc chạy trên Cloudflare Workers. API của ứng dụng dùng mô hình job, dù endpoint AI có thể trả dữ liệu ảnh trong một request.

### 3.2. Cơ sở lựa chọn dịch vụ

Thông tin được kiểm tra ngày 20/10/2026:

- Cloudflare Workers AI có phân bổ miễn phí 10.000 neurons/ngày. Đây là đơn vị tài nguyên, không phải 10.000 ảnh. Trên gói Free, vượt hạn mức sẽ bị từ chối; chính sách có thể thay đổi. [Nguồn](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- Endpoint FLUX.1 Schnell nhận prompt, mặc định 4 bước, giới hạn prompt 2.048 ký tự theo tài liệu; đầu ra được mô tả dạng Base64. [Nguồn](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/)
- Cloudinary Image and Video APIs Free hiện có 25 credits/tháng, không yêu cầu thẻ tín dụng. Credits không tương đương số ảnh. [Nguồn](https://cloudinary.com/pricing)
- MongoDB Atlas Free có dung lượng 512 MB gồm dữ liệu và index. [Nguồn](https://www.mongodb.com/docs/atlas/manage-clusters/)

**Mục tiêu chi phí:** không trả phí dịch vụ trong hạn mức; không bao gồm thiết bị, điện và Internet. Không cam kết dịch vụ miễn phí vô thời hạn hoặc khả dụng liên tục.

### 3.3. Điều kiện cần kiểm tra ngay khi khởi động

1. Giảng viên có chấp nhận FLUX qua Cloudflare hay yêu cầu API trực tiếp Black Forest Labs? Hai nhà cung cấp có giao thức khác nhau.
2. Thực hiện thử một lượt tạo ảnh, lưu file, ghi MongoDB và mở lại.
3. Thử prompt tiếng Việt để đánh giá chất lượng thực tế; không mặc định chất lượng của FLUX.2 giống FLUX.1 Schnell.
4. Xác nhận các tham số được endpoint thực tế hỗ trợ. MVP chưa đưa lựa chọn kích thước, tỷ lệ, seed lên giao diện nếu chưa kiểm chứng.
5. Chọn tài khoản Free và kiểm tra dashboard tài nguyên; không phụ thuộc credit khuyến mại chưa được xác nhận.

## 4. Trải nghiệm và màn hình

| Màn hình | Đường dẫn | Nội dung chính | Ưu tiên |
|---|---|---|---|
| Đăng ký | `/register` | Tên, email, mật khẩu, kiểm tra lỗi | P0 |
| Đăng nhập | `/login` | Đăng nhập, thông báo lỗi | P0 |
| Tạo ảnh | `/app/create` | Một ô mô tả, nút tạo, lượt còn lại, trạng thái, kết quả | P0 |
| Thư viện | `/app/library` | Grid ảnh, phân trang, mở chi tiết | P0 |
| Chi tiết ảnh | `/app/images/:id` | Ảnh lớn, prompt, thời gian, đổi tên, tải, xóa | P0 |
| Lịch sử | `/app/history` | Các lần tạo thành công, lỗi, đang chạy | P0 |
| Tổng quan | `/app` | Ảnh gần đây, thống kê hoạt động | P1 |
| Hồ sơ | `/app/settings` | Xem email, đổi tên hiển thị | P1 |

Layout gồm điều hướng, tên người dùng và đăng xuất. Loading, chưa có dữ liệu, hết phiên, hết lượt, lỗi mạng là trạng thái ngay trong màn hình; không cần các trang riêng.

### 4.1. Tương tác tại trang tạo ảnh

- Người dùng chỉ cần nhập một đoạn văn; không phải chia chủ thể, hành động, phong cách.
- Placeholder đưa ví dụ; hướng dẫn chỉ mang tính hỗ trợ.
- Hiển thị số ký tự và lỗi vượt giới hạn trước khi gửi; backend vẫn kiểm tra lại.
- Chỉ nhấn “Tạo ảnh” mới gửi yêu cầu; không tự gọi AI khi đang gõ.
- Trong lúc xử lý, hiển thị trạng thái và cho phép chuyển trang; không hiển thị phần trăm tiến độ giả.
- Khi thành công, hiển thị ảnh và nút mở chi tiết, tải xuống, tạo ảnh mới.
- Khi lỗi, mô tả nguyên nhân có thể hành động; không trả stack trace hoặc secret.
- Thông báo ngắn rằng mô tả được gửi đến dịch vụ AI để tạo ảnh.

## 5. Yêu cầu chức năng và tiêu chí nghiệm thu

| Mã | Yêu cầu | Tiêu chí nghiệm thu |
|---|---|---|
| FR-01 | Tài khoản | Email chuẩn hóa và duy nhất; mật khẩu được hash; đăng nhập/đăng xuất hoạt động; mật khẩu hash không xuất hiện trong response |
| FR-02 | Gửi mô tả tự do | Chấp nhận văn bản có nội dung trong giới hạn; giữ dấu tiếng Việt, số lượng, màu sắc, quan hệ vị trí và yêu cầu phủ định |
| FR-03 | Tạo ảnh | Một request hợp lệ tạo một job; dùng model và cấu hình server đã cho phép; tạo được file ảnh thật |
| FR-04 | Theo dõi tác vụ | Có thể tải lại trang và mở lại trạng thái; rời trang không hủy tác vụ đã nhận |
| FR-05 | Lưu kết quả | Chỉ báo thành công khi file đã lưu và metadata có thể truy vấn; mở lại ảnh không gọi AI |
| FR-06 | Thư viện | Chỉ trả ảnh thuộc tài khoản hiện tại, có phân trang và sắp xếp mới nhất |
| FR-07 | Quản lý ảnh | Xem chi tiết, đổi tên, tải file hoạt động; tải xuống không chỉ mở một liên kết bị lỗi CORS |
| FR-08 | Xóa ảnh | Hỏi xác nhận trong UI; ảnh bị ẩn khỏi thư viện; việc xóa file được theo dõi và thử lại nếu storage lỗi |
| FR-09 | Lịch sử | Job thất bại vẫn xuất hiện với prompt, thời điểm và lý do an toàn |
| FR-10 | Hạn mức | Không nhận quá lượt của người dùng hoặc toàn hệ thống khi có request đồng thời |
| FR-11 | Chống gửi trùng | Cùng user và mã yêu cầu trả cùng job, không trừ thêm lượt hoặc gọi AI thêm |
| FR-12 | Phân quyền | User B không đọc/sửa/xóa/tải ảnh hoặc xem job của user A qua API |
| FR-13 | Thống kê | P1: aggregation trả số job theo ngày/trạng thái và thời gian xử lý trung bình, chỉ trong phạm vi user |
| FR-14 | Tìm/lọc | P1: tìm theo tiêu đề, lọc theo ngày, yêu thích; kiểm tra độ dài và escape ký tự nếu dùng regex |

Không có tính năng chọn userId tự do từ frontend. Backend lấy danh tính từ phiên đã xác thực và gắn điều kiện quyền sở hữu vào mọi truy vấn.

## 6. Chính sách prompt và chất lượng ảnh

### 6.1. Xử lý prompt mặc định

1. Kiểm tra kiểu chuỗi và nội dung không rỗng sau trim.
2. Chuẩn hóa khoảng trắng không cần thiết, loại ký tự điều khiển; không bỏ dấu hoặc tự sửa nội dung.
3. Giữ nguyên chủ thể, số lượng, màu, hành động, bố cục, phong cách, câu chữ cần hiện trong ảnh và phủ định.
4. Kiểm tra độ dài theo schema endpoint; quá dài thì yêu cầu người dùng rút gọn, không âm thầm cắt.
5. Gửi prompt văn bản trực tiếp. Không bắt buộc chuyển sang JSON, dịch sang tiếng Anh hoặc gọi mô hình văn bản khác.

Không tự thêm phong cách ảnh chụp, cinematic, 8K hoặc nhân vật mới. Nếu đầu vào thiếu chi tiết, để model diễn giải; không giả vờ đã suy ra chính xác mong muốn chưa được nêu.

Lưu `originalPrompt` và `submittedPrompt` để truy vết. Hai trường có thể giống nhau.

### 6.2. Kiểm soát chất lượng

- Mục tiêu là ảnh phù hợp mô tả và đủ chất lượng demo; không cam kết đúng 100%, chữ hoàn hảo hoặc cấu trúc cơ thể luôn chính xác.
- Chuẩn bị 12 prompt cố định: phong cảnh, vật thể, con người, tranh minh họa; có prompt tiếng Việt và tiếng Anh tương đương để so sánh khi cần.
- Mỗi ảnh chấm 0–2 cho 4 tiêu chí: đúng chủ thể, đúng bối cảnh/hành động, đúng phong cách, bố cục và lỗi thị giác.
- Ngưỡng mục tiêu đề xuất: ít nhất 9/12 ảnh đạt từ 6/8 điểm, không sai chủ thể chính. Đây là ngưỡng nội bộ cần xác nhận bằng thử nghiệm, không phải cam kết của nhà cung cấp.
- Nếu chưa đạt, kiểm tra việc giữ nội dung prompt, cấu hình và giới hạn model trước. Không tự sinh nhiều ảnh để chọn ảnh đẹp nhất trong mỗi yêu cầu.
- P1: người dùng đánh dấu “phù hợp/chưa phù hợp”, chọn lý do để nhóm đánh giá cải tiến.

AI viết lại prompt là hướng nâng cấp riêng, chỉ triển khai khi có bằng chứng cải thiện chất lượng so với chi phí và độ trễ bổ sung.

## 7. Kiểm soát tài nguyên và quy tắc nghiệp vụ

### 7.1. Cấu hình ban đầu do nhóm đề xuất

| Quy tắc | Giá trị ban đầu |
|---|---|
| Ảnh mỗi tác vụ | 1 |
| Số bước tạo | 4, cấu hình phía server |
| Hạn mức cá nhân | 10 yêu cầu được nhận/ngày |
| Hạn mức ứng dụng | 30 yêu cầu được nhận/ngày cho giai đoạn phát triển |
| Tác vụ hoạt động của user | Tối đa 1 |
| Worker gọi AI đồng thời | Ban đầu 1 |
| Khoảng cách giữa hai job mới | 15 giây/người |
| Frontend hỏi trạng thái | Khoảng 3 giây; dừng khi kết thúc hoặc rời màn hình |
| Thử lưu file lại | Tối đa 2 lần sau lần đầu; không tạo lại ảnh |

Các ngưỡng này không phải hạn mức nhà cung cấp. Sau 5–10 lượt thật, xem dashboard và điều chỉnh. Hạn mức 30 yêu cầu không bảo đảm toàn tài khoản luôn dưới quota nếu còn ứng dụng khác sử dụng chung.

### 7.2. Cách tính lượt

- Yêu cầu sai dữ liệu hoặc bị từ chối trước khi tạo job không mất lượt.
- Cùng mã yêu cầu được gửi lại không mất thêm lượt.
- Một job được hệ thống chấp nhận giữ một lượt; nếu đã gửi sang AI, lượt đó vẫn tính dù job lỗi vì tài nguyên thực tế có thể đã được dùng.
- Job chắc chắn chưa gửi AI có thể hoàn lượt bằng thao tác idempotent; không hoàn lặp.
- Một lần người dùng chủ động “Tạo ảnh mới” là yêu cầu mới, kể cả prompt giống nhau.
- Timeout không đủ căn cứ kết luận nhà cung cấp chưa xử lý; không hoàn lượt hoặc tự gọi lại dựa chỉ vào timeout.
- Bộ đếm quota dùng ngày UTC, tương ứng reset 07:00 giờ Việt Nam, để đồng bộ chu kỳ Cloudflare. Giao diện hiển thị thời điểm reset rõ ràng.

FLUX trên Cloudflare được niêm yết theo tile ảnh và bước xử lý; ứng dụng không hiển thị chi phí token giả. Theo dõi lượt gọi và tài nguyên thực tế trên dashboard; không gán một số neurons cố định cho mọi ảnh khi chưa đo.

## 8. Vòng đời tác vụ và xử lý lỗi

### 8.1. Trạng thái

```text
queued → processing → saving → succeeded
   │          │          │
   └──────────┴──────────┴──→ failed
              └────────────→ needs_review
```

| Trạng thái | Ý nghĩa |
|---|---|
| queued | Job đã lưu, chờ worker |
| processing | Đang gửi/nhận dữ liệu từ AI |
| saving | Có ảnh, đang lưu file hoặc metadata |
| succeeded | File và metadata đã sẵn sàng |
| failed | Lỗi đã biết, lưu nguyên nhân |
| needs_review | Kết quả bên AI chưa chắc chắn, ví dụ mất kết nối sau khi gửi; không tự gọi lại |

### 8.2. Luồng xử lý

1. Express xác thực, kiểm tra prompt và `Idempotency-Key`.
2. Nếu job cùng mã đã có, trả job đó trước khi kiểm tra hạn mức tạo mới.
3. Trong transaction MongoDB ngắn: giữ lượt cá nhân/toàn ứng dụng, giữ quyền có một job hoạt động và tạo job. Không gọi dịch vụ ngoài trong transaction.
4. Trả HTTP 202 với jobId; frontend theo dõi qua API của ứng dụng.
5. Worker nhận job bằng cập nhật có điều kiện và lease, tránh hai worker xử lý cùng job.
6. Worker gọi adapter Cloudflare, chuyển Base64 thành file; checkpoint file tạm vào thư mục dữ liệu của ứng dụng trước khi upload.
7. Lưu Cloudinary bằng định danh file xác định từ jobId; upsert metadata theo generationId để tránh bản ghi trùng.
8. Cập nhật succeeded và giải phóng trạng thái hoạt động của user. Các bước kết thúc phải chạy an toàn khi lặp lại.
9. Dọn file tạm sau khi lưu thành công; file của job lỗi được giữ theo thời gian cấu hình để phục hồi.

Cloudflare không dùng nguyên cơ chế polling_url của API BFL trực tiếp. Adapter tách biệt để sau này đổi nhà cung cấp mà giữ API frontend.

### 8.3. Các tình huống bắt buộc xử lý

| Tình huống | Hành vi |
|---|---|
| Prompt rỗng/quá dài | Báo lỗi; không tạo job hoặc gọi AI |
| Nhấn nút hai lần | Trả cùng job; không gọi AI hai lần |
| Hết lượt cá nhân/hệ thống | Từ chối job mới, thông báo khi nào có thể thử lại |
| Nhà cung cấp trả hết quota | Dừng nhận lượt AI mới theo cấu hình, ghi lỗi; không nâng cấp trả phí |
| AI trả lỗi đã biết | Failed, thông báo an toàn; không retry vô hạn |
| Mất kết nối, kết quả không rõ | Needs_review; không gửi lại inference tự động |
| Upload lỗi | Saving, thử lưu lại từ file tạm; quá số lần thì failed với khả năng phục hồi lưu file |
| File lưu xong nhưng ghi DB lỗi | Dùng jobId/storage key để đối soát, upsert metadata khi phục hồi |
| Restart khi queued | Worker có thể nhận lại bình thường |
| Restart khi processing | Job hết lease được kiểm tra; nếu không biết đã gửi AI chưa thì needs_review |
| Restart khi saving | Tìm checkpoint/file storage để tiếp tục lưu; không mặc định tạo ảnh lại |
| Xóa storage lỗi | Giữ trạng thái chờ xóa file, thử lại; không báo đã xóa file vật lý |

MVP chạy trên một laptop với thư mục dữ liệu bền vững. Khi triển khai lên host có ổ đĩa tạm, cần thay cơ chế checkpoint trước khi coi môi trường đó được hỗ trợ.

## 9. Thiết kế MongoDB

### 9.1. Collection

| Collection | Trường chính |
|---|---|
| users | `_id`, `name`, `email`, `passwordHash`, `activeGenerationId`, `lastGenerationAt`, `createdAt`, `updatedAt` |
| generations | `_id`, `userId`, `requestKey`, `originalPrompt`, `submittedPrompt`, `provider`, `model`, `settings`, `status`, `lease`, `checkpoint`, `error`, `quotaReservation`, `createdAt`, `startedAt`, `completedAt`, `durationMs` |
| images | `_id`, `userId`, `generationId`, `title`, `storage`, `width`, `height`, `format`, `bytes`, `isFavorite`, `deletedAt`, `storageDeletionStatus`, `createdAt`, `updatedAt` |
| dailyUsage | `_id`, `scopeType`, `scopeId`, `dateKey`, `reservedRequests`, `updatedAt` |
| sessions | Phiên xác thực theo thư viện session đã chọn, thời điểm hết hạn và userId |

`dailyUsage` gồm phạm vi user và application. Không dùng TTL xóa dailyUsage như một cơ chế reset quota; ngày mới có document mới. TTL chỉ phù hợp dọn lịch sử theo chính sách lưu giữ hoặc session hết hạn.

### 9.2. Nhúng và tham chiếu

- Nhúng `settings`, `storage`, `error` và `lease`: dữ liệu nhỏ, có giới hạn, thường được đọc cùng document.
- Dùng `userId`, `generationId` để tham chiếu: lịch sử và thư viện tăng liên tục, cần truy vấn độc lập.
- Không nhúng toàn bộ ảnh hoặc lịch sử tác vụ vào users.
- Không lưu Base64 ảnh trong document nghiệp vụ. MongoDB lưu metadata; file được lưu riêng.
- Không sao chép prompt sang images trong MVP. Khi cần xem prompt, dùng generationId; lịch sử tác vụ không bị xóa khi user xóa ảnh.
- ObjectId không phải cơ chế phân quyền và không tự tạo ràng buộc khóa ngoại; ứng dụng phải kiểm tra tham chiếu và quyền sở hữu.

### 9.3. Index tối thiểu

| Collection | Index | Mục đích |
|---|---|---|
| users | `{ email: 1 }`, unique | Không trùng tài khoản |
| generations | `{ userId: 1, requestKey: 1 }`, unique | Chống job trùng theo request |
| generations | `{ userId: 1, createdAt: -1, _id: -1 }` | Lịch sử cá nhân |
| generations | `{ status: 1, createdAt: 1 }` | Worker tìm job chờ |
| images | `{ userId: 1, deletedAt: 1, createdAt: -1, _id: -1 }` | Thư viện và thứ tự ổn định |
| images | `{ generationId: 1 }`, unique | MVP một ảnh đầu ra/job, upsert an toàn |
| dailyUsage | `{ scopeType: 1, scopeId: 1, dateKey: 1 }`, unique | Một bộ đếm/phạm vi/ngày |

Index riêng cho tìm kiếm, yêu thích hoặc phục hồi lease chỉ thêm khi truy vấn thực tế cần. Tìm chuỗi con không được mặc định coi là đã tối ưu nhờ index thường.

### 9.4. Validation và tính nhất quán

- Mongoose validation cho ứng dụng; kèm validator MongoDB ở các collection nghiệp vụ quan trọng để minh họa ràng buộc tại database.
- Trạng thái theo enum; prompt và tiêu đề có giới hạn; timestamp dùng BSON Date; số lượt không âm.
- Email được trim và chuẩn hóa trước khi ghi, bắt lỗi duplicate key.
- Transaction giữ quota và tạo job dùng replica set/Atlas hỗ trợ transaction; nếu dùng local phải cấu hình replica set hoặc thiết kế lại rõ ràng.
- Transaction MongoDB không bao gồm Cloudflare/Cloudinary. Tính nhất quán file–metadata được giải quyết bằng checkpoint, idempotency và đối soát.

### 9.5. Truy vấn và thực nghiệm học phần

1. CRUD user, job, image theo quyền sở hữu.
2. Lấy 20 ảnh mới nhất và trang tiếp theo, thứ tự `createdAt`, `_id`.
3. Lịch sử theo khoảng ngày, trạng thái; truy vấn trường lồng trong settings/error.
4. Aggregation `$match`, `$group`, `$dateToString`, `$avg`, `$sort` cho số job/ngày, trạng thái và thời gian job thành công. Biểu đồ ngày dùng timezone Asia/Ho_Chi_Minh.
5. Một truy vấn `$lookup` lấy chi tiết ảnh kèm generation; không bắt buộc join mọi lần tải thư viện.
6. Thử hai request đồng thời khi còn đúng một lượt; chỉ một job mới được chấp nhận.
7. Tạo khoảng 10.000 metadata giả để so sánh `explain('executionStats')` trước/sau index; không gọi AI tương ứng và không đưa dữ liệu giả vào chỉ số chất lượng thật.
8. Báo cáo execution plan, số document/key được quét, số kết quả và thời gian; không chỉ dựa vào milliseconds của một lần chạy.

## 10. Hợp đồng API đề xuất

Tất cả API dưới đây, ngoại trừ đăng ký/đăng nhập, yêu cầu phiên xác thực. Tên endpoint có thể điều chỉnh một lần trước khi chia việc; giữ thống nhất trong suốt triển khai.

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/logout` | Hủy phiên |
| GET | `/api/auth/me` | User hiện tại |
| PATCH | `/api/users/me` | P1: cập nhật tên |
| POST | `/api/generations` | Nhận prompt, tạo job; header Idempotency-Key |
| GET | `/api/generations/:id` | Trạng thái và kết quả job |
| GET | `/api/generations` | Lịch sử có phân trang, lọc |
| GET | `/api/images` | Thư viện có phân trang |
| GET | `/api/images/:id` | Chi tiết ảnh và thông tin generation |
| PATCH | `/api/images/:id` | Đổi tên; P1: yêu thích |
| DELETE | `/api/images/:id` | Ẩn ảnh và lên lịch xóa file |
| GET | `/api/images/:id/download` | Kiểm tra quyền, trả file tải xuống |
| GET | `/api/usage/me` | Số lượt còn và thời điểm reset |
| GET | `/api/stats/me` | P1: thống kê cá nhân |

Request tạo ảnh chỉ cần `{ "prompt": "..." }`. Frontend không được tự truyền API key hoặc mở rộng model, steps, số ảnh tùy ý.

Response tạo job: HTTP 202, `{ "success": true, "data": { "id": "...", "status": "queued" } }`.

Response lỗi thống nhất: `{ "success": false, "error": { "code": "...", "message": "..." } }`.

Các mã lỗi cần có: `INVALID_PROMPT`, `UNAUTHENTICATED`, `NOT_FOUND`, `DAILY_LIMIT_REACHED`, `GENERATION_IN_PROGRESS`, `PROVIDER_QUOTA_EXCEEDED`, `GENERATION_FAILED`, `RESULT_UNCERTAIN`, `STORAGE_FAILED`.

Trả 400 cho dữ liệu sai, 401 cho chưa xác thực, 404 cho tài nguyên không tồn tại hoặc không thuộc user, 409 cho tác vụ xung đột/mã yêu cầu dùng lại với payload khác, 429 cho hạn mức hoặc tốc độ. Không suy diễn HTTP 200 nghĩa là AI thành công nếu job vẫn đang chạy.

## 11. Yêu cầu phi chức năng

### 11.1. Bảo mật và quyền truy cập

- Hash mật khẩu bằng thư viện uy tín; session lưu phía server với cookie HttpOnly, cấu hình Secure khi chạy HTTPS.
- Chống CSRF phù hợp cho cơ chế cookie; cấu hình origin và CORS cụ thể.
- API key Cloudflare, Cloudinary, MongoDB chỉ đặt ở server; `.env` không commit, cung cấp `.env.example` trống secret.
- Không truyền nguyên body vào truy vấn MongoDB hoặc update; chỉ chấp nhận trường và toán tử đã định nghĩa.
- Áp dụng giới hạn đăng nhập, kích thước request và số lượt tạo ở backend.
- Log theo jobId và mã lỗi; không ghi token, mật khẩu hoặc Base64 ảnh. Prompt chỉ lưu nơi cần cho chức năng, không sao chép vào log tùy tiện.
- Kiểm tra quyền ở mọi API; đăng xuất hủy phiên thật phía server.

**Phạm vi riêng tư của file:** MVP dùng ảnh demo không nhạy cảm. Thư viện được phân quyền theo tài khoản, nhưng nếu cấu hình Cloudinary public thì người có URL vẫn có thể xem file; đây không phải cam kết ảnh riêng tư tuyệt đối. Nếu yêu cầu bảo mật file là tiêu chí bắt buộc, phải dùng delivery có xác thực đã kiểm chứng với gói dịch vụ, hoặc chuyển sang lưu file local và phục vụ qua API có xác thực. Chỉ proxy một URL public không làm file gốc trở thành riêng tư.

### 11.2. Hiệu năng và độ tin cậy

- Mục tiêu API nhận job trả trong 2 giây ở môi trường demo bình thường, không chờ ảnh tạo xong.
- Mục tiêu API thư viện trả trong 1 giây với 10.000 metadata mẫu ở môi trường đo đã ghi rõ; không bao gồm thời gian tải file ảnh.
- Không cam kết thời gian AI cố định; đo median, p95 và tỷ lệ lỗi trên các lượt thử thật.
- Kết nối AI/upload có timeout hữu hạn, cấu hình được và điều chỉnh sau tích hợp.
- Ảnh có thumbnail hoặc lazy loading để tránh tải toàn bộ file lớn cùng lúc.
- Restart không làm mọi job đang chạy tự động được gọi AI lại.

## 12. Phân công 3 thành viên

| Thành viên | Phạm vi full-stack | Trách nhiệm dữ liệu | Bàn giao |
|---|---|---|---|
| TV1 | Auth, layout, hồ sơ, dashboard | users, sessions; phối hợp stats | Đăng nhập/đăng xuất, middleware, layout; P1 thống kê |
| TV2 | Tạo ảnh, trạng thái, worker, adapter AI, lưu file | generations, dailyUsage; ghi images theo schema chung | Luồng tạo ảnh thật, quota, chống trùng, phục hồi |
| TV3 | Thư viện, lịch sử, chi tiết, quản lý ảnh, tải/xóa | images; truy vấn generation; index và thực nghiệm | Luồng xem lại, CRUD ảnh, lịch sử lỗi, báo cáo truy vấn |

- Cả nhóm chốt schema, response, phiên xác thực và quy tắc quota trong buổi đầu.
- TV3 quản lý định nghĩa Image; TV2 dùng service tạo/upsert thống nhất, không tự thêm schema khác.
- TV2 phụ trách xử lý vòng đời job; TV3 đọc lịch sử qua hợp đồng đã chốt.
- Mỗi endpoint có một người chịu trách nhiệm chính; review chéo và kiểm thử chức năng của thành viên khác.
- Dành thời gian cân bằng tải: TV1 hỗ trợ transaction/session/test; TV3 hỗ trợ test lỗi storage cho TV2.

## 13. Kế hoạch thực hiện đề xuất

| Mốc | Công việc | Điều kiện hoàn thành |
|---|---|---|
| Ngày 1–2 | Kiểm tra yêu cầu môn học; thử Cloudflare → file → MongoDB; chốt schema/API | Một ảnh thật mở lại được, xác nhận lựa chọn provider khả thi |
| Tuần 1 | Khởi tạo client/server/worker; auth; schema/index; UI bằng dữ liệu mẫu | Các module chạy độc lập, auth hoạt động, test tích hợp AI cơ bản qua |
| Tuần 2 | Tích hợp job, quota, lưu ảnh, thư viện, chi tiết, tải và lịch sử | Luồng đăng nhập → tạo → lưu → mở lại chạy hoàn chỉnh |
| Tuần 3 | Lỗi, concurrency, phân quyền, phục hồi; quality test; aggregation và đo index; tài liệu | P0 nghiệm thu, có báo cáo MongoDB và demo dự phòng |

Nếu tiến độ chậm, hoãn P1 và tối giản giao diện. Giữ phần lưu ảnh, quyền sở hữu, chống gửi trùng và bằng chứng database.

### 13.1. Cấu trúc mã nguồn đề xuất

```text
client/src/
  features/auth/
  features/generation/
  features/library/
  features/history/
  features/dashboard/
  components/
  layouts/
  services/
server/src/
  modules/auth/
  modules/users/
  modules/generations/
  modules/images/
  modules/usage/
  modules/stats/
  providers/cloudflare/
  storage/
  workers/
  middlewares/
  config/
docs/
scripts/
data/                 # File tạm/checkpoint, không commit vào Git
```

Thêm script khởi tạo index/validator, tạo dữ liệu mẫu và đo truy vấn. Dùng ảnh mẫu khi làm UI để tránh tiêu hao quota AI.

## 14. Kiểm thử và nghiệm thu MVP

| Nhóm | Kịch bản bắt buộc |
|---|---|
| Luồng chính | Đăng ký → đăng nhập → tạo ảnh thật → thư viện → tải xuống → đăng xuất → đăng nhập lại vẫn xem được |
| Đầu vào | Prompt rỗng, quá dài, có dấu, phủ định, nhiều chủ thể; không bị cắt/sửa ý âm thầm |
| Quyền | User khác không thể truy cập job, metadata hoặc API tải/sửa/xóa ảnh |
| Đồng thời | Hai request cùng mã chỉ có một job; hai job mới khi còn một lượt chỉ nhận một |
| Giới hạn | Hết lượt, đang có job, provider hết quota; không gọi AI khi đã bị từ chối |
| Lưu trữ | AI thành công nhưng upload lỗi; upload xong ghi DB lỗi; xóa file lỗi; không tạo ảnh lại để xử lý lỗi lưu |
| Restart | Queued được tiếp tục; processing không rõ kết quả không tự gửi lại; saving có checkpoint được phục hồi |
| Database | CRUD, validation, unique index, aggregation, explain trước/sau index có kết quả lưu lại |
| Chất lượng | Chấm bộ 12 prompt, ghi rõ model, cấu hình, kết quả; báo cáo trung thực nếu chưa đạt ngưỡng |

Mock chỉ dùng kiểm tra UI, lỗi và dữ liệu tải; báo cáo phân biệt với ảnh tạo thật. Có video và ảnh đã lưu cho tình huống Internet hoặc dịch vụ lỗi khi bảo vệ, ghi rõ đây là kết quả trước đó.

## 15. Hồ sơ bàn giao và rủi ro

### 15.1. Hồ sơ bàn giao

- Source code frontend/backend/worker, README chạy từ đầu và `.env.example`.
- Hướng dẫn tài khoản dịch vụ, cấu hình hạn mức và thư mục dữ liệu; không chứa secret thật.
- Tài liệu schema, quan hệ, validator, index và lý do lựa chọn nhúng/tham chiếu.
- Bộ API mẫu, script seed, truy vấn aggregation và báo cáo explain.
- Kết quả kiểm thử chính, quality test, hạn chế đã biết, kịch bản demo và phân công thực tế.

### 15.2. Rủi ro và hướng xử lý

| Rủi ro | Cách xử lý |
|---|---|
| Giảng viên yêu cầu BFL trực tiếp | Chốt sớm; tách adapter; đánh giá lại ngân sách, không khẳng định mọi API FLUX đều miễn phí |
| Gói miễn phí đổi hạn mức | Theo dõi dashboard, cấu hình quota, giữ demo đã lưu; không hứa 0 đồng ngoài hạn mức |
| Prompt tiếng Việt chưa cho kết quả tốt | Thử bộ mẫu; công bố kết quả; chỉ thêm dịch/viết lại khi đo được lợi ích |
| Model tạo sai chi tiết | Ghi rõ giới hạn, cho sửa mô tả và chủ động tạo lại; không bảo đảm tuyệt đối |
| Lộ API key hoặc bị gọi tràn | Secret phía server, auth, quota, rate limit, thu hồi key nếu lộ |
| Tác vụ mồ côi/file thừa | Lease, checkpoint, idempotency, script đối soát theo jobId |
| Mở rộng phạm vi quá sớm | Hoàn thành P0 trước; truyện tranh, chỉnh sửa và thanh toán để giai đoạn sau |

**Điểm bắt đầu thực hiện:** hoàn thành thử nghiệm một prompt → một ảnh → file lưu lâu dài → document MongoDB → mở lại sau tải trang. Sau khi luồng này khả thi, khóa schema/API và chia ba module để triển khai song song.
