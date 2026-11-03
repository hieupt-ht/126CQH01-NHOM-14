// Run in mongosh inside the Compose network. Never print credentials.
const admin = connect('mongodb://mongodb:27017/admin?directConnection=true');
const authenticated = admin.auth(process.env.MONGO_INITDB_ROOT_USERNAME, process.env.MONGO_INITDB_ROOT_PASSWORD);
if (authenticated !== 1 && authenticated?.ok !== 1)
  throw new Error('MongoDB authentication failed');

const hasMongoError = (error, code, codeName) =>
  error?.code === code || error?.codeName === codeName;

let status;
try {
  status = admin.runCommand({ replSetGetStatus: 1 });
} catch (error) {
  if (!hasMongoError(error, 94, 'NotYetInitialized'))
    throw new Error('Could not read replica-set status; check MongoDB configuration');
}

const notInitialized = !status || (status.ok !== 1 && hasMongoError(status, 94, 'NotYetInitialized'));
if (!notInitialized && status.ok !== 1)
  throw new Error('Could not read replica-set status; check MongoDB configuration');

if (notInitialized) {
  let result;
  try {
    result = admin.runCommand({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017' }] } });
  } catch (error) {
    if (!hasMongoError(error, 23, 'AlreadyInitialized'))
      throw new Error('Could not initialize replica set; check existing configuration');
  }
  if (result && result.ok !== 1 && !hasMongoError(result, 23, 'AlreadyInitialized'))
    throw new Error('Could not initialize replica set; check existing configuration');
}

for (let attempt = 0; attempt < 60; attempt++) {
  const hello = admin.runCommand({ hello: 1 });
  if (hello.setName === 'rs0' && hello.isWritablePrimary) {
    print('Replica rs0 PRIMARY ready');
    quit(0);
  }
  sleep(1000);
}
throw new Error('Replica rs0 did not become PRIMARY');
