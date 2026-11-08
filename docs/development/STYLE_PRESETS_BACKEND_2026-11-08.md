# Backend Sơn dầu, 3D, Truyện tranh — 08/11/2026

## CONFIRMED — phạm vi hoàn thiện

Chủ dự án yêu cầu tiếp tục backend của ba phong cách sau khi đã push giao diện
trong `6c410f8`. Kế thừa whitelist, POST generations, presentation settings và job
DTO hiện có; lần này hoàn thiện chỉ dẫn chất liệu và kiểm chứng đủ cả ba preset
qua HTTP, MongoDB và worker với provider/storage giả lập.

| Phong cách | Giá trị API | Chỉ dẫn chất liệu |
| --- | --- | --- |
| Sơn dầu | `oil-painting` | Canvas có kết cấu, pigment nhiều lớp, impasto và nét cọ trên toàn cảnh |
| 3D | `3d` | Hình khối dựng 3 chiều, vật liệu có chiều sâu, ánh sáng và bóng tiếp xúc trên toàn cảnh |
| Truyện tranh | `comic` | Nét mực, mảng màu phẳng, halftone trên toàn cảnh; giữ chữ/thoại người dùng yêu cầu |

Preset cũ của Truyện tranh chứa `without added text or speech bubbles`, có thể mâu
thuẫn với prompt muốn chữ/thoại; đã bỏ ràng buộc này và chỉ dẫn ép bố cục/dynamic
panels. Cả ba preset yêu cầu giữ chủ thể, hành động, bố cục và lettering được yêu cầu.
`originalPrompt` được giữ nguyên; chỉ dẫn ghép sau bước dịch vào `submittedPrompt`.
Đây là chỉ dẫn cho model, không phải bằng chứng FLUX đã vẽ đúng nội dung/chữ.

## Contract và invariant đã kiểm chứng

- Giữ `{prompt, style, aspectRatio}`, session/CSRF/Origin và owner từ backend.
  Không nhận `userId`, `count` hoặc enum/tỷ lệ tùy ý.
- Giới hạn cuối 2048 UTF-16 sau ghép preset; unit test kiểm tra đúng ranh giới với
  emoji và quá một code unit. HTTP từ chối prompt vượt giới hạn do thêm style trước
  khi tạo job/quota; lỗi dịch cũng không giữ lock hoặc reservation.
- Cùng key/payload trả lại cùng job, không dịch/trừ lượt/gọi tạo ảnh lần nữa.
  Cùng key đổi style, prompt hoặc tỷ lệ trả409 trước khi dịch.
- Lưu `settings.style`/`aspectRatio`; GET detail/history trả đúng lựa chọn và prompt
  gốc. Worker gửi đúng submittedPrompt đã lưu cho provider giả lập.
- Mỗi style có một inference: lưu lần đầu lỗi giữ `saving` và checkpoint, worker
  mới phục hồi (inference tắt) dùng bytes gốc, không dịch/render thêm. Thành công
  mới có image metadata; đúng một ảnh/một lượt, active lock được giải phóng.
- Ảnh 16:9 được padding, file tải riêng tư/no-store, bytes khớp storage stub;
  tài khoản khác không đọc được job/file. Replay sau thành công vẫn giữ kết quả.

## File và nguồn

- `backend/src/modules/generations/presentation.ts`: hoàn thiện ba chỉ dẫn chất liệu.
- `backend/tests/presentation.test.ts`: ranh giới UTF-16, giữ scene/chữ và không
  ghép lặp prefix cho ba preset.
- `backend/tests/integration/style-presets.test.ts`: một DB replica set tạm, ba
  subtest qua API cho từng style; dịch/provider/storage là fixture giả lập có
  assertion số lần gọi. Không chạy worker nền hoặc đọc credential cloud.
- PRD và contract FE/BE cập nhật theo yêu cầu trực tiếp.

Đã đọc AGENTS.md, backend-api/backend-testing, BACKEND_RULES, QUALITY_CHECKLIST,
contract FE/BE, docs backend về API/database/implementation và baseline08/09.
Không sửa frontend, model/schema/index, quota, dependency, provider hoặc migration.

## Cách kiểm tra local

Kết quả đã chạy trên Windows, DB test MongoDB8.2.6:

- Backend build đạt.
- Unit: **54 đạt, 1 skip** (test index cần MONGODB_TEST_URI riêng).
- Strict typecheck hai file test mới/cập nhật: đạt.
- Integration riêng preset: **4 đạt, 0 skip** (một test cha và ba subtest).
- Full integration chạy tuần tự: **20 đạt, 0 skip**.
- Diff check đạt. Không sửa frontend hoặc thêm thay đổi ngoài phạm vi backend/kiểm thử/tài liệu.

Lần full integration đầu có19 đạt/1 fail tại assertion cleanup đường dẫn temp
của test postmerge cũ (`/` so với `\`), sau khi các subtest nghiệp vụ đã đạt.
Chuẩn hóa TEMP/TMP bằng Resolve-Path và chạy lại toàn suite đạt20/20; không sửa
code ứng dụng hay nới assertion để xử lý lỗi môi trường này.

Trong thư mục `backend`, với Node và dependency đã có:

```powershell
npm run build
npm test
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --esModuleInterop --skipLibCheck tests/integration/style-presets.test.ts tests/presentation.test.ts
node --import tsx --test tests/integration/style-presets.test.ts
node --import tsx --test --test-concurrency=1 tests/integration/*.test.ts
```

Các integration tự tạo MongoDB memory replica set riêng và dọn đúng tài nguyên
của từng test; không dùng MONGODB_URI ứng dụng hoặc drop DB chung. Nếu ổ hệ thống
thiếu chỗ, đặt TEMP/TMP vào thư mục test đã tạo trên ổ còn trống. Trên Windows,
dùng `(Resolve-Path -LiteralPath '<thư mục test>').Path` để lấy dấu phân cách native:
suite postmerge hiện có kiểm tra chặt parent temp trước khi xóa.

## Giới hạn nghiệm thu

Không gọi FLUX/Cloudinary thật, không bật billing. Chất lượng Sơn dầu/3D/Truyện
tranh và chữ/thoại trên ảnh thật cần người dùng đối chiếu sau khi chạy ứng dụng
trên môi trường đã cấu hình, bằng prompt giống nhau và lần lượt chọn từng style.
Những kiểm tra API/DB không chứng minh độ bám phong cách 100% hoặc nghiệm thu
E2E cloud. Giữ nguyên prompt gốc giúp đối chiếu submittedPrompt trong MongoDB.

Báo cáo kiểm tra được lập trước bước commit/push/PR/merge và phản hồi issue;
trạng thái phát hành được ghi tại PR và issue #17.
