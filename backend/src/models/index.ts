import { DailyUsageModel } from './daily-usage.model.js';
import { GenerationModel } from './generation.model.js';
import { ImageModel } from './image.model.js';
import { SessionModel } from './session.model.js';
import { UserModel } from './user.model.js';

export { DailyUsageModel, GenerationModel, ImageModel, SessionModel, UserModel };

/** Creates declared indexes without dropping or reconciling existing indexes. */
export async function createDeclaredIndexes(): Promise<void> {
  await Promise.all([
    UserModel.createIndexes(),
    SessionModel.createIndexes(),
    GenerationModel.createIndexes(),
    ImageModel.createIndexes(),
    DailyUsageModel.createIndexes(),
  ]);
}
