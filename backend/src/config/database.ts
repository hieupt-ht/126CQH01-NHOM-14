import mongoose, { type ConnectOptions } from 'mongoose';

export class DatabaseConnectionError extends Error {
  readonly name = 'DatabaseConnectionError';

  constructor() {
    super('MongoDB connection failed. Check database availability and server configuration.');
  }
}

export async function connectMongo(
  uri: string,
  options: Pick<ConnectOptions, 'serverSelectionTimeoutMS'> = {},
): Promise<typeof mongoose> {
  try {
    mongoose.set('autoIndex', false);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 5000 });
    return mongoose;
  } catch {
    throw new DatabaseConnectionError();
  }
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
