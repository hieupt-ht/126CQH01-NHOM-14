export const aspectOptions = [
  { value: "auto", label: "Ảnh gốc", ratio: "1 / 1" },
  { value: "1:1", label: "Vuông", ratio: "1 / 1" },
  { value: "16:9", label: "Ngang", ratio: "16 / 9" },
  { value: "9:16", label: "Dọc", ratio: "9 / 16" },
  { value: "4:3", label: "Ngang", ratio: "4 / 3" },
  { value: "3:4", label: "Dọc", ratio: "3 / 4" },
] as const;
export const styleOptions = [
  { value: "none", label: "Theo mô tả của tôi" },
  { value: "watercolor", label: "Màu nước" },
  { value: "cinematic", label: "Điện ảnh" },
  { value: "photographic", label: "Ảnh chân thực" },
  { value: "illustration", label: "Minh họa" },
  { value: "anime", label: "Anime" },
] as const;
export type AspectRatio = typeof aspectOptions[number]["value"];
export type ImageStyle = typeof styleOptions[number]["value"];
