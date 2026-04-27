import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';

async function main(): Promise<void> {
  await connectDB();

  const result = await User.updateMany(
    { role: 'manager' },
    { $set: { role: 'admin' } },
  );

  console.log(
    `[migrate] manager → admin matched=${result.matchedCount} modified=${result.modifiedCount}`,
  );

  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
