import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    name: 'Admin User',
    email: 'admin@maintainiq.com',
    password: 'Admin@123',
    role: UserRole.ADMIN,
  },
  {
    name: 'Tech User',
    email: 'tech@maintainiq.com',
    password: 'Tech@123',
    role: UserRole.TECHNICIAN,
  },
  {
    name: 'Supervisor User',
    email: 'supervisor@maintainiq.com',
    password: 'Super@123',
    role: UserRole.SUPERVISOR,
  },
];

async function main() {
  for (const u of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
      },
    });
    console.log(`Seeded ${u.role}: ${u.email} / ${u.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
