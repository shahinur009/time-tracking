import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Tag } from '../models/Tag';
import { TimeEntry } from '../models/TimeEntry';
import { AuditLog } from '../models/AuditLog';
import { hashPassword } from '../utils/hash';

const DEMO_PASSWORD = 'Password123!';

const USERS = [
  { email: 'admin@demo.com', name: 'Demo Admin', role: 'admin' as const },
  { email: 'alice@demo.com', name: 'Alice Member', role: 'member' as const },
  { email: 'bob@demo.com', name: 'Bob Member', role: 'member' as const },
];

const PROJECTS = [
  { name: 'Website Redesign', color: '#4DC9FF', description: 'Marketing site refresh' },
  { name: 'Mobile App', color: '#52C41A', description: 'iOS + Android build' },
  { name: 'Internal Tools', color: '#FA8C16', description: 'Admin dashboard work' },
];

const TAGS = [
  { name: 'urgent', color: '#F5222D' },
  { name: 'research', color: '#722ED1' },
  { name: 'meeting', color: '#13C2C2' },
  { name: 'bug-fix', color: '#FA541C' },
];

const DESCRIPTIONS = [
  'Homepage hero section',
  'API integration planning',
  'Design review with team',
  'Fix login redirect bug',
  'Sprint planning meeting',
  'Competitor research',
  'Database query optimization',
  'Onboarding flow copy',
  'Mobile nav refactor',
  'Push notification testing',
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

async function wipeDemo(): Promise<void> {
  const emails = USERS.map((u) => u.email);
  const users = await User.find({ email: { $in: emails } }).select('_id');
  const userIds = users.map((u) => u._id);

  await TimeEntry.deleteMany({ userId: { $in: userIds } });
  await AuditLog.deleteMany({ actorId: { $in: userIds } });
  await Project.deleteMany({ createdBy: { $in: userIds } });
  await Tag.deleteMany({ name: { $in: TAGS.map((t) => t.name) } });
  await User.deleteMany({ email: { $in: emails } });
  console.log('[seed-demo] wiped existing demo data');
}

async function main(): Promise<void> {
  const reset = process.argv.includes('--reset');
  await connectDB();

  if (reset) await wipeDemo();

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const createdUsers = [];
  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      createdUsers.push(existing);
      console.log(`[seed-demo] user exists: ${u.email}`);
      continue;
    }
    const doc = await User.create({
      email: u.email,
      name: u.name,
      role: u.role,
      status: 'active',
      password: passwordHash,
    });
    createdUsers.push(doc);
    console.log(`[seed-demo] user created: ${u.email} (${u.role})`);
  }

  const admin = createdUsers.find((u) => u.role === 'admin')!;
  const members = createdUsers.filter((u) => u.role === 'member');

  const createdProjects = [];
  for (const p of PROJECTS) {
    const existing = await Project.findOne({ name: p.name, createdBy: admin._id });
    if (existing) {
      createdProjects.push(existing);
      console.log(`[seed-demo] project exists: ${p.name}`);
      continue;
    }
    const doc = await Project.create({
      name: p.name,
      color: p.color,
      description: p.description,
      createdBy: admin._id,
      members: createdUsers.map((u) => u._id),
    });
    createdProjects.push(doc);
    console.log(`[seed-demo] project created: ${p.name}`);
  }

  const createdTags = [];
  for (const t of TAGS) {
    const existing = await Tag.findOne({ name: t.name });
    if (existing) {
      createdTags.push(existing);
      continue;
    }
    const doc = await Tag.create({ name: t.name, color: t.color });
    createdTags.push(doc);
  }
  console.log(`[seed-demo] tags ready: ${createdTags.map((t) => t.name).join(', ')}`);

  const existingEntryCount = await TimeEntry.countDocuments({
    userId: { $in: createdUsers.map((u) => u._id) },
  });
  if (existingEntryCount > 0 && !reset) {
    console.log(
      `[seed-demo] ${existingEntryCount} entries already exist for demo users. skip entry seeding. Pass --reset to rebuild.`,
    );
    await disconnectDB();
    return;
  }

  const now = new Date();
  const entriesToCreate = [];
  const entryUsers = [admin, ...members];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    for (const user of entryUsers) {
      const entriesPerDay = randInt(2, 4);
      let cursorHour = 9;

      for (let i = 0; i < entriesPerDay; i++) {
        const durationMin = randInt(15, 120);
        const start = new Date(now);
        start.setDate(now.getDate() - dayOffset);
        start.setHours(cursorHour, randInt(0, 30), 0, 0);
        const end = new Date(start.getTime() + durationMin * 60 * 1000);

        entriesToCreate.push({
          userId: user._id,
          projectId: pick(createdProjects)._id,
          description: pick(DESCRIPTIONS),
          tags: [pick(createdTags)._id],
          taggedUsers: [],
          startTime: start,
          endTime: end,
          duration: durationMin * 60,
          status: 'finished' as const,
          pushedToClickup: false,
        });

        cursorHour += Math.ceil(durationMin / 60) + 1;
        if (cursorHour > 17) break;
      }
    }
  }

  await TimeEntry.insertMany(entriesToCreate);
  console.log(`[seed-demo] ${entriesToCreate.length} time entries created`);

  console.log('\n=== Demo credentials ===');
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(7)} ${u.email}  /  ${DEMO_PASSWORD}`);
  }
  console.log('========================\n');

  await disconnectDB();
}

main().catch(async (err) => {
  console.error('[seed-demo] failed:', err);
  await disconnectDB();
  process.exit(1);
});
