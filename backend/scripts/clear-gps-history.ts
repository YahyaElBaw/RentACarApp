import { config } from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';

config({ path: resolve(process.cwd(), '.env') });

async function clearGpsHistory() {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/rentacar';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  if (!db) {
    console.error('Failed to connect to MongoDB');
    await mongoose.disconnect();
    return;
  }

  const collections = await db.listCollections().toArray();
  const targets = collections
    .map((c) => c.name)
    .filter(
      (name) =>
        /^gpshistories$/i.test(name) ||
        /gps.?history/i.test(name),
    );

  if (targets.length === 0) {
    console.log(
      `No GPS history collection found in db "${db.databaseName}". Existing collections:`,
    );
    console.log(collections.map((c) => c.name).join(', '));
    await mongoose.disconnect();
    return;
  }

  for (const name of targets) {
    const result = await db.collection(name).deleteMany({});
    console.log(`Cleared "${name}": ${result.deletedCount} document(s) removed.`);
  }

  await mongoose.disconnect();
}

clearGpsHistory().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});