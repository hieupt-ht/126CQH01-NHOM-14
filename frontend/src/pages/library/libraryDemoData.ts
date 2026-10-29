import type { DemoArtwork } from '../dashboard/dashboardData';
import { demoArtworks } from '../dashboard/dashboardData';

export type LibraryImage = DemoArtwork & {
  fixtureKey: string;
  createdAtLabel: string;
  modelLabel: string;
};

// These are local reference fixtures, not records owned by a signed-in user.
export const libraryDemoImages: LibraryImage[] = demoArtworks.map((artwork) => ({
  ...artwork,
  fixtureKey: `library-${artwork.id}`,
  createdAtLabel: 'Chưa có dữ liệu thật',
  modelLabel: 'Chưa cấu hình',
}));
