# 01 — Stack và sổ quyết định
Ngày 30/10/2026. Không coi lựa chọn tài liệu là dependency đã cài.

| ID | Thành phần | Lựa chọn | Trạng thái |
|---|---|---|---|
| ST-01 | Frontend | React + TypeScript strict + Vite + Tailwind CSS, CSS token chung | CONFIRMED — giữ repo |
| ST-02 | Backend | Node.js + Express + TypeScript strict, ES Modules | CONFIRMED — giữ repo |
| ST-03 | Persistence | MongoDB + Mongoose; local replica set trên máy nhóm | CONFIRMED — user chọn |
| ST-04 | Image AI | Cloudflare Workers AI REST; FLUX.1 Schnell; model server-owned | CONFIRMED — hướng FLUX/0 đồng được yêu cầu |
| ST-05 | File | Cloud storage; DB chỉ metadata, key và URL phù hợp delivery | CONFIRMED — user chọn cloud |
| ST-06 | Storage provider | Azure Blob trước; Azure for Students hiện có, user báo còn76USD | CONFIRMED |
| ST-07 | File access | Private container; backend kiểm tra ownership trước delivery | CONFIRMED |
| ST-08 | Auth | Opaque MongoDB-backed session + HttpOnly cookie; không JWT | CONFIRMED — giữ contract hiện có |
| ST-09 | API | /api/v1; giữ GET /api/health | CONFIRMED |
| ST-10 | UI | Midnight Aurora FLUX-UI-001; 8 màn hình hiện có | CONFIRMED |
| ST-11 | Budget | Không nâng gói/bật billing tự động; chạy FE/BE local | CONFIRMED |
| ST-12 | Runtime | Node 24.x LTS; npm 11.x; bản patch chung ghi khi nghiệm thu | PROPOSAL — máy kiểm tra 24.21.0/11.19.0 |
| ST-13 | Worker | Một process riêng hoặc cùng backend cho demo; Mongo lease; concurrency 1 | PROPOSAL — không Redis/BullMQ |
| ST-14 | Password hashing | Argon2id qua argon2; kiểm tra cài/build Windows trước | PROPOSAL — chưa cài |
| ST-15 | Validation | Zod tại HTTP/env boundary, Mongoose validation tại persistence | PROPOSAL — chưa cài |
| ST-16 | Routing | Giữ pathname preview hiện tại; chọn router khi auth integration được giao | OPEN QUESTION — cần 404/guard rõ |
| ST-17 | Testing | Backend node:test qua tsx đã có; build FE; browser E2E khi tích hợp | CONFIRMED công cụ hiện có; E2E tool PROPOSAL |

| ST-18 | Storage portability | Adapter chung, registry theo từng record; chuyển cloud giữ ID và private | CONFIRMED — chi tiết07 |

## Phiên bản và dependency
Nguồn phiên bản tái lập là package-lock.json của từng package; dùng npm ci, không npm update.
Hiện manifest: React ^19.3.1, Vite ^8.3.4, Tailwind ^4.3.3, TypeScript ^7.0.2; Express ^5.3.0, Mongoose ^9.11.4.
Các range trên là hiện trạng repo, không phải số cần chép lại vào dự án khác. Lockfile quyết định resolved versions.
Không đổi manifest/lock chỉ vì tài liệu này; mọi thay package có PR riêng và build/test.
MongoDB server version chưa biết: ghi mongod --version, replica-set version và Database Tools version trong biên bản setup trước test transaction.

## Không dùng ở MVP
Next.js/NestJS, PostgreSQL, JWT, Redis, queue broker, microservices, nhiều model ở UI, auto prompt rewrite, thanh toán.
Không thay toàn bộ kiến trúc vì tên framework; ưu tiên đủ luồng thật và bằng chứng MongoDB.

## Chốt tiếp trước phần phụ thuộc
Storage provider/private đã chốt; còn SDK/identity và delivery mechanism chi tiết; Node patch + Mongo server version; hash/validation package; session/CSRF policy; numeric limits.
Trước tích hợp AI cần một request thật được user cho phép, đo output/dimensions/MIME/neurons; không coi ảnh tham chiếu là kết quả.

