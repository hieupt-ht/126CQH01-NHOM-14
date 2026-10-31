> **Cập nhật01/11/2026:** [09-CLOUDINARY-DECISION](09-CLOUDINARY-DECISION.md) thay quyết định Azure-first bằng Cloudinary authenticated. Các mô tả Azure/chưa có Cloudinary dưới đây là lịch sử hoặc thiết kế mở rộng nếu mâu thuẫn09. Xem [LOCAL_RUN](../development/LOCAL_RUN.md) để chạy hiện tại.

# 06 — Môi trường, backlog và nghiệm thu

Cập nhật31/10/2026. Hướng dẫn chạy chi tiết ở [LOCAL_RUN](../development/LOCAL_RUN.md).
[08](08-IMPLEMENTATION-STATUS.md) là nguồn chính cho code/contract/bằng chứng hiện tại;
bảng cổng nghiệm thu dưới đây là checklist, không có nghĩa toàn bộ đã được nghiệm thu live.

## Chuẩn bị tái lập
CONFIRMED demo FE/BE trên máy nhóm, MongoDB local replica set.
Runtime Node24.x/npm11.x; backend đã khai báo engines, dependency cụ thể trong lockfile.
Script dev:local khởi tạo MongoDB8.2.6, replica set rs0, port27027, dữ liệu backend/data/mongo.
Replica set phải healthy/primary và transaction smoke test pass; standalone không thay thế.
Dev origins frontend http://localhost:5173/backend http://localhost:3000; Vite /api proxy có sẵn.
Không coi dữ liệu cloud tồn tại là DB backup; sao lưu metadata và tài khoản cloud riêng.

## Commands hiện có (từ repo root, PowerShell hoặc CMD)
Chạy từng lệnh, không copy cả hai terminal vào một process.
Xem UI mặc định chỉ cần terminal frontend; không cần MongoDB/cloud/backend.
Muốn API thật, tạo frontend/.env.local với VITE_UI_PREVIEW=false và restart Vite;
sau đó chạy thêm terminal backend. Production build luôn dùng API thật.

Terminal frontend:
~~~text
cd frontend
npm ci
npm run dev
~~~

Terminal backend:
~~~text
cd backend
npm ci
npm run dev:local
~~~
dev:local tự chạy MongoDB dev loopback; không chạy nhiều instance cùng data directory.
Nếu dùng MongoDB cài riêng: tạo backend/.env từ .env.example, cấu hình MONGODB_URI replica set,
rồi dùng npm run dev thay dev:local. Không trỏ script test vào DB demo/live.
Kiểm tra: npm run build trong mỗi package; npm test ở backend.
db:indexes chạy dist script sau backend build; kiểm tra đúng DB trước khi tạo indexes.
Test ghi DB phải dùng MONGODB_TEST_URI riêng có tên test; không trỏ DB demo/live.

## Env hiện có (không đưa secret lên Git)
| Biến | Mục đích |
|---|---|
| NODE_ENV,PORT,FRONTEND_ORIGIN | runtime |
| MONGODB_URI | replica-set connection, secret |
| SESSION_COOKIE_NAME, SESSION_TTL_DAYS, SESSION_COOKIE_SAME_SITE, SESSION_COOKIE_SECURE | session policy |
| CLOUDFLARE_ACCOUNT_ID | account |
| CLOUDFLARE_API_TOKEN | secret server-only |
| GENERATION_ENABLED | false mặc định, true chỉ khi cloud đã sẵn sàng |
| IMAGE_STORAGE_DIR | checkpoint tạm ngoài public, không phải kho ảnh cuối |
| IMAGE_STORAGE_NAMESPACE | prefix cloud riêng cho máy/môi trường |
| DAILY_USER_LIMIT,DAILY_APP_LIMIT | quota nội bộ mặc định5/20 |
| AZURE_STORAGE_ACCOUNT_URL, AZURE_STORAGE_CONTAINER, AZURE_STORAGE_ACCOUNT_ALIAS | Azure Blob private |
| VITE_UI_PREVIEW | frontend dev: true/default xem UI, false gọi API thật |
| MONGODB_TEST_URI | DB test riêng |

Model FLUX.1 Schnell cố định ở provider; không có env CLOUDFLARE_IMAGE_MODEL/IMAGE_STORAGE_PROVIDER/IMAGE_CHECKPOINT_DIR trong parser hiện tại.
Azure Blob private đã chọn: account/container/accountAlias và credential server-side phù hợp local identity; không expose connection string/SAS dài hạn.
Azure SDK/adapter và DefaultAzureCredential đã có code; role/identity và cloud live chưa kiểm chứng.
Cloudinary chưa triển khai; credential chỉ thêm trong task chuyển provider, không giữ SDK thứ hai chỉ để dự phòng.
Đọc07 về provider registry, private delivery, chuyển cloud và rollback trước storage implementation.
Không VITE_* secrets. .env.example chỉ placeholder. Gemini chỉ còn trong tài liệu lịch sử; không dùng làm provider hiện tại.

## Backlog theo cổng nghiệm thu
| Giai đoạn | Bàn giao | Bằng chứng |
|---|---|---|
| 0 Quyết định | Azure private đã chốt; khóa SDK/identity/delivery + runtime/limits | decision record, env mẫu, không secrets |
| 1 DB nền | replica set/schema/index/validator | connection + transaction + index tests trên DB test |
| 2 Auth | register/login/me/logout, CSRF/guard | expiry/revoke/IDOR/cookie tests, browser session |
| 3 AI+cloud | prompt→job→FLUX→cloud→metadata | một ảnh thật, dashboard usage, refresh vẫn xem được |
| 4 CRUD/history | library/detail/download/rename/delete | ownership, deleted history, cloud cleanup retry |
| 5 Reliability | duplicate/quota/restart/recovery | race tests và zero duplicate inference |
| 6 Course/P1 | aggregation/explain/stats | kết quả10k metadata riêng, báo cáo và demo |

Mỗi module một owner và một reviewer; chưa tự gán Hiếu/Định/Vũ.
P0 trước P1, không thêm UI chức năng ngoài phạm vi để chia đủ đầu việc.

## Kiểm thử mục tiêu
- CI/unit dùng provider/storage stub có nhãn, không gọi API thật mặc định.
- DB integration chỉ database test, test records có namespace, không drop database tùy ý.
- Live smoke test người dùng cho phép riêng, đo hạn mức; không gọi tự động mỗi PR.
- E2E: auth→create→cloud→library→download→logout/login lại.
- Faults: quota, concurrent request, uncertain dispatch, upload lỗi, metadata lỗi, restart, cleanup lỗi.
- UI: desktop/mobile, keyboard/focus/reduced-motion, long prompt/title, loading/error/empty/expired session.
Không coi npm build là visual/security/integration test.

## Chứng cứ nộp môn
Schema/index/validator rationale; CRUD/query/$lookup/aggregation scripts; explain trước/sau; concurrency outcomes; ảnh thật và prompt/model/settings; giới hạn chất lượng.
Video dự phòng ghi rõ kết quả tạo trước, không giả live inference.

## Quy trình PR
feature/fix từ develop; PR base develop; main chỉ release nghiệm thu.
Mô tả outcome, decision IDs, contract/schema changes, exact tests, limits.
Không auto commit/push/merge; task docs không cài dependency hoặc sửa runtime.

## Kiểm tra cuối
Mọi CONFIRMED có nguồn user/repo; PROPOSAL chưa được coi là package đã cài.
Không secrets, link file hợp lệ, không tài liệu active nào ép quay về Gemini/local-final-storage.

