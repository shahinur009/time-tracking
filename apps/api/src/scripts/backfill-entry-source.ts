import { connectDB, disconnectDB } from '../config/db';
import { TimeEntry } from '../models/TimeEntry';

async function main(): Promise<void> {
  await connectDB();

  const result = await TimeEntry.updateMany(
    { $or: [{ source: { $exists: false } }, { source: null }] },
    { $set: { source: 'tracker' } },
  );

  console.log(
    `[backfill] matched=${result.matchedCount} modified=${result.modifiedCount}`,
  );

  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
