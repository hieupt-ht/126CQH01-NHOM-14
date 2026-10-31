// Run in mongosh inside the Compose network. Never print credentials.
const admin = connect('mongodb://mongodb:27017/admin?directConnection=true');
const authenticated = admin.auth(process.env.MONGO_INITDB_ROOT_USERNAME, process.env.MONGO_INITDB_ROOT_PASSWORD);
if (authenticated !== 1 && authenticated?.ok !== 1)
  throw new Error('MongoDB authentication failed');
try {
  const status = admin.runCommand({ replSetGetStatus: 1 });
  if (status.ok !== 1) {
    if (status.code !== 94) throw new Error('Replica status unavailable');
    const result = admin.runCommand({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017' }] } });
    if (result.ok !== 1 && result.code !== 23) throw new Error('Replica initialization failed');
  }
} catch (error) { throw new Error('Could not initialize replica set; check existing configuration'); }
for (let attempt = 0; attempt < 60; attempt++) {
  const hello = admin.runCommand({ hello: 1 });
  if (hello.setName === 'rs0' && hello.isWritablePrimary) {
    print('Replica rs0 PRIMARY ready');
    quit(0);
  }
  sleep(1000);
}
throw new Error('Replica rs0 did not become PRIMARY');
