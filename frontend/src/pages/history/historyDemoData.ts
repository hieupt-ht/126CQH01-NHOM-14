import type { LibraryImage } from '../library/libraryDemoData';
import { libraryDemoImages } from '../library/libraryDemoData';

export type GenerationStatus = 'queued' | 'processing' | 'saving' | 'succeeded' | 'failed' | 'needs_review';

export type GenerationHistoryItem = {
  demoKey: string;
  prompt: string;
  status: GenerationStatus;
  modelLabel: string;
  createdAtLabel: string;
  startedAtLabel: string;
  finishedAtLabel: string;
  durationLabel: string;
  imageFixtureKey?: string;
  imageDeleted?: boolean;
  errorMessage?: string;
};

const city = libraryDemoImages.find((image) => image.fixtureKey === 'library-city') as LibraryImage;
const portrait = libraryDemoImages.find((image) => image.fixtureKey === 'library-portrait') as LibraryImage;

// Stable local fixtures for UI review only. They are not server jobs or user records.
export const historyDemoItems: GenerationHistoryItem[] = [
  {
    demoKey: 'demo-job-queued',
    prompt: 'Một căn phòng kính nhìn ra cực quang, ánh sáng xanh tím dịu, phong cách điện ảnh tối giản.',
    status: 'queued',
    modelLabel: 'Chưa cấu hình',
    createdAtLabel: 'Chưa có thông tin',
    startedAtLabel: 'Chưa có thông tin',
    finishedAtLabel: 'Chưa có thông tin',
    durationLabel: 'Chưa có thông tin',
  },
  {
    demoKey: 'demo-job-processing',
    prompt: 'Một phi hành gia nhỏ đứng trên hành tinh xa lạ, phía sau là tinh vân tím và những dải sáng xanh.',
    status: 'processing',
    modelLabel: 'Chưa cấu hình',
    createdAtLabel: 'Chưa có thông tin',
    startedAtLabel: 'Chưa có thông tin',
    finishedAtLabel: 'Chưa có thông tin',
    durationLabel: 'Chưa có thông tin',
  },
  {
    demoKey: 'demo-job-saving',
    prompt: 'Khu rừng cổ thụ phủ sương với dòng suối phát sáng, ánh nắng xuyên qua tán cây, fantasy.',
    status: 'saving',
    modelLabel: 'Chưa cấu hình',
    createdAtLabel: 'Chưa có thông tin',
    startedAtLabel: 'Chưa có thông tin',
    finishedAtLabel: 'Chưa có thông tin',
    durationLabel: 'Chưa có thông tin',
  },
  {
    demoKey: 'demo-job-succeeded',
    prompt: city.prompt,
    status: 'succeeded',
    modelLabel: 'Chưa cấu hình',
    createdAtLabel: 'Chưa có thông tin',
    startedAtLabel: 'Chưa có thông tin',
    finishedAtLabel: 'Chưa có thông tin',
    durationLabel: 'Chưa có thông tin',
    imageFixtureKey: city.fixtureKey,
  },
  {
    demoKey: 'demo-job-succeeded-deleted',
    prompt: portrait.prompt,
    status: 'succeeded',
    modelLabel: 'Chưa cấu hình',
    createdAtLabel: 'Chưa có thông tin',
    startedAtLabel: 'Chưa có thông tin',
    finishedAtLabel: 'Chưa có thông tin',
    durationLabel: 'Chưa có thông tin',
    imageFixtureKey: portrait.fixtureKey,
    imageDeleted: true,
  },
  {
    demoKey: 'demo-job-failed',
    prompt: 'Chân dung một nhà thám hiểm giữa sa mạc tinh thể, bầu trời đêm đầy sao, ánh sáng xanh lạnh.',
    status: 'failed',
    modelLabel: 'Chưa cấu hình',
    createdAtLabel: 'Chưa có thông tin',
    startedAtLabel: 'Chưa có thông tin',
    finishedAtLabel: 'Chưa có thông tin',
    durationLabel: 'Chưa có thông tin',
    errorMessage: 'Yêu cầu minh họa chưa hoàn tất. Chi tiết lỗi thật sẽ do backend cung cấp.',
  },
  {
    demoKey: 'demo-job-needs-review',
    prompt: 'Một thành phố nổi trên biển mây, những cây cầu phát sáng nối các tòa tháp, góc nhìn toàn cảnh.',
    status: 'needs_review',
    modelLabel: 'Chưa cấu hình',
    createdAtLabel: 'Chưa có thông tin',
    startedAtLabel: 'Chưa có thông tin',
    finishedAtLabel: 'Chưa có thông tin',
    durationLabel: 'Chưa có thông tin',
  },
];
