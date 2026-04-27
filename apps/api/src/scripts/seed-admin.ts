import readline from 'readline';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { hashPassword } from '../utils/hash';

function ask(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main(): Promise<void> {
  await connectDB();

  const email = await ask('Admin email: ');
  const name = await ask('Admin name: ');
  const password = await ask('Admin password (min 8 chars): ');

  if (!email || !name || password.length < 8) {
    console.error('Invalid input');
    await disconnectDB();
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.name = name;
    existing.password = await hashPassword(password);
    existing.status = 'active';
    await existing.save();
    console.log(`[seed] updated existing user -> admin: ${email}`);
  } else {
    await User.create({
      email,
      name,
      password: await hashPassword(password),
      role: 'admin',
      status: 'active',
    });
    console.log(`[seed] admin created: ${email}`);
  }

  await disconnectDB();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
