export const MAX_PROMPT_LENGTH = 2048;
export function validatePrompt(value: string): string {
  if (!value.trim()) return "Hãy viết mô tả trước khi tạo ảnh.";
  if (value.length > MAX_PROMPT_LENGTH)
    return `Mô tả tối đa ${MAX_PROMPT_LENGTH} ký tự. Vui lòng rút gọn; nội dung chưa bị cắt.`;
  return "";
}
