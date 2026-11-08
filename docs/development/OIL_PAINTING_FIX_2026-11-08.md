# Sửa Sơn dầu khi prompt có anime — 08/11/2026

## Lần sửa mới nhất — theo ảnh mẫu impasto rõ

Chủ dự án cung cấp ảnh mới cho thấy lần sửa đầu vẫn còn nét anime trơn và ảnh
mẫu có lớp sơn nổi, vệt cọ lớn, mặt sơn gồ ghề. Đọc riêng job mới khớp prompt
xác nhận runtime đã dùng prefix/suffix lần sửa đầu; scene vẫn có `anime portraits`
và prefix cũng nhắc từ anime. Đây là bằng chứng chỉ dẫn trước chưa đủ, không phải
khẳng định được mức đóng góp của từng yếu tố vào hình ảnh.

- Bỏ phần diễn giải nhắc tới anime trong prefix; mô tả trực quan heavy impasto,
  broad strokes, raised paint ridges, broken color, swirling strokes và paint relief.
  Giữ cue ở cuối; không thêm trăng, hoa, pose hoặc màu từ ảnh mẫu vào scene khác.
- Chỉ khi chọn Sơn dầu, thay clause medium độc lập trong bản gửi model, ví dụ
  `anime portraits` → `oil-painted portraits`, `chân dung anime` → `chân dung vẽ sơn dầu`.
  Giữ nguyên originalPrompt/fingerprint; không strip mọi chữ anime.
- Bộ thay thế hữu hạn, quote-aware: giữ biển chữ `"anime portraits"`, quote đơn/
  cong, apostrophe trong sở hữu, quote chưa đóng; giữ câu phủ định/địa điểm và
  chủ thể như anime convention/character. Những cách diễn đạt không nằm trong
  danh sách không bị đoán hoặc xóa. Các preset khác giữ hành vi.
- Unit **57 đạt / 1 skip** vì thiếu test URI riêng; full integration **20 đạt /0 skip**;
  build và strict typecheck test đạt. API/worker test dùng prompt báo lỗi xác nhận
  originalPrompt nguyên vẹn, submittedPrompt dùng medium mới và được gửi đúng cho
  provider fixture, replay/quota/checkpoint vẫn giữ một inference. Test không chứng
  minh chất lượng ảnh FLUX thật. Không gọi cloud thật trong test.
- Giữ FLUX Schnell/M2M100 và4 steps, không đổi provider, billing/quota hoặc thêm
  tham số ngoài schema. [Cloudflare model input schema](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/)
  kiểm tra ngày08/11 có prompt/steps, không có ảnh tham chiếu được tài liệu hóa;
  ảnh mẫu được dùng làm tiêu chí mô tả texture, không upload vào inference.
- Sau kiểm thử, xác nhận0 job active và helper trong container đã thay clause/
  có cue vệt cọ mới, restart riêng backend; health trả200/ok. Không tạo ảnh live
  để xác nhận chất lượng và không sửa job/ảnh đã lưu.

Phần dưới là lịch sử lần sửa đầu; quyết định giữ toàn bộ submitted scene nguyên
văn ở lần đầu được thay bằng xử lý clause medium có giới hạn ở trên. Không bảo
đảm model hiện tại tái hiện chất lượng/texture ngang ảnh tạo bởi model khác.

## Lần sửa đầu — bằng chứng và thay đổi

Chủ dự án báo ảnh tạo với Sơn dầu vẫn mang nét anime trơn. Đọc riêng các job
khớp prompt báo lỗi trong MongoDB local Docker (không ghi/xóa dữ liệu) xác nhận
job đã chọn `oil-painting`, nhưng submittedPrompt vẫn chứa prefix Sơn dầu cũ
`Oil painting on canvas, rich layered pigments...` và phần scene kết thúc bằng
`anime portraits, virtual lighting and nighttime background`.
Điều này xác nhận lựa chọn đã tới backend; runtime ở lần tạo đó dùng chỉ dẫn cũ
và còn hai chỉ dẫn medium cạnh tranh. Không suy ra mức ảnh hưởng của từng nguyên
nhân hoặc chất lượng FLUX từ test giả lập.

- Làm rõ medium Sơn dầu được ưu tiên khi chọn preset; anime có thể là thiết kế
  chủ thể, còn bề mặt toàn ảnh cần chất liệu sơn dầu/canvas/impasto rõ.
- Tăng chỉ dẫn pigment dày, bristle/impasto, palette-knife ridges và canvas grain
  ở đầu; nhắc lại chất liệu ở cuối để từ anime trong scene không là chỉ dẫn render
  cuối cùng. Scene gốc/đã dịch vẫn nguyên vẹn, kể cả chữ `"anime"` trong biển chữ.
- Chỉ thay `oil-painting`; helper không thêm prefix/suffix lần hai, tổng UTF-16
  vẫn tối đa2048 trước transaction/quota. Không thêm provider, dependency, schema,
  post-processing filter hoặc inference. `none` và các style khác giữ hành vi.
- Job/replay dùng submittedPrompt đã lưu; không sửa hoặc render lại ảnh cũ.

## Kiểm tra đã chạy

- Backend build đạt; unit **55 đạt / 1 skip** do không có MONGODB_TEST_URI riêng.
- Strict typecheck test preset/unit đạt.
- Full integration chạy tuần tự: **20 đạt / 0 skip** trên MongoDB replica set tạm,
  translator/provider/storage giả lập. Oil subtest dùng đúng prompt tiếng Việt báo
  lỗi và bản dịch fixture; xác nhận scene giữ nguyên, medium cue ở cuối, prompt
  thực gửi provider khớp DB, replay/conflict/quota và saving recovery không inference lại.
- Unit tái hiện anime portrait/quoted lettering, kiểm tra cue cuối, không ghép lặp,
  ranh giới2048 với emoji và quá1 UTF-16 unit; các preset khác vẫn giữ scene.
- Không gọi AI/storage cloud thật trong test và không tự tạo ảnh thật trên DB local.

## Cập nhật runtime local

Compose backend bind-mount `backend/src`, chạy npm dev. Sau khi test đạt, kiểm tra
DB local có **0 job queued/processing/saving**, xác nhận helper trong container có
medium priority/cue mới, rồi restart **riêng backend**. Health sau restart trả200/ok.
Không xóa volume, đổi credential/quota, sửa job cũ hoặc restart MongoDB/frontend.
Khi máy nhóm chưa nạp code sau pull, cần restart backend lúc không có job active.

## Cách đối chiếu kết quả

Tạo yêu cầu mới với cùng nội dung và chọn Sơn dầu trên môi trường đã cấu hình;
đối chiếu texture/nét cọ trên cả nhân vật và nền. Kết quả đã lưu/replay cũ giữ nguyên.
Độ bám chất liệu thực tế chưa được xác nhận sau sửa; không cam kết đạt100% vì
đây vẫn là chỉ dẫn cho FLUX. Chất lượng chữ/thoại cũng chưa được test cloud live.

Nguồn: AGENTS.md, backend-api/backend-testing, contract FE/BE, baseline08/09,
backend rules và dữ liệu chẩn đoán chỉ đọc của prompt người dùng cung cấp.
Phạm vi file: presentation helper, unit/integration preset, PRD/contract và báo cáo.
Báo cáo được lập trước bước phát hành; trạng thái commit/push/merge theo PR của
nhánh `codex/fix-oil-painting-style`.
