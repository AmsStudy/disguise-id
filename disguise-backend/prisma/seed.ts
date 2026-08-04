import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { code: 'POLDA-JATIM' },
    update: {},
    create: {
      name: 'POLDA JAWA TIMUR',
      code: 'POLDA-JATIM',
      plan: 'enterprise',
      settings: {
        default_threshold: 0.5703,
        alert_auto_assign: false,
        retention_days_frames: 30,
        retention_days_events: 365,
      },
    },
  });

  console.log(`✅ Organization created: ${org.name} (${org.code})`);

  // Create super_admin user
  const superAdminHash = await bcrypt.hash('SuperAdmin123!', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@disguiseid.local' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'superadmin@disguiseid.local',
      passwordHash: superAdminHash,
      fullName: 'Super Administrator',
      role: 'super_admin',
      isActive: true,
    },
  });

  console.log(`✅ Super admin created: ${superAdmin.email}`);

  // Create admin user
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@polda.go.id' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@polda.go.id',
      passwordHash: adminHash,
      fullName: 'Admin Polda',
      role: 'admin',
      isActive: true,
    },
  });

  console.log(`✅ Admin created: ${admin.email}`);

  // Create operator user
  const operatorHash = await bcrypt.hash('Operator123!', 12);
  const operator = await prisma.user.upsert({
    where: { email: 'operator@polda.go.id' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'operator@polda.go.id',
      passwordHash: operatorHash,
      fullName: 'Budi Santoso',
      role: 'operator',
      isActive: true,
    },
  });

  console.log(`✅ Operator created: ${operator.email}`);

  // Create investigator user
  const investigatorHash = await bcrypt.hash('Investigator123!', 12);
  const investigator = await prisma.user.upsert({
    where: { email: 'investigator@polda.go.id' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'investigator@polda.go.id',
      passwordHash: investigatorHash,
      fullName: 'Siti Rahma',
      role: 'investigator',
      isActive: true,
    },
  });

  console.log(`✅ Investigator created: ${investigator.email}`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Credentials:');
  console.log('  superadmin@disguiseid.local : SuperAdmin123!');
  console.log('  admin@polda.go.id           : Admin123!');
  console.log('  operator@polda.go.id        : Operator123!');
  console.log('  investigator@polda.go.id    : Investigator123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
