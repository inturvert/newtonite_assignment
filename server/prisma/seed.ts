import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Newtonite database...');

  // Clean existing data
  await prisma.activityLog.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.idempotencyKey.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@newtonite.corp',
      name: 'Alice Chen (Eng Lead)',
      passwordHash,
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@newtonite.corp',
      name: 'Bob Sharma (Dev)',
      passwordHash,
    },
  });

  const carol = await prisma.user.create({
    data: {
      email: 'carol@newtonite.corp',
      name: 'Carol Taylor (Payments Mgr)',
      passwordHash,
    },
  });

  const david = await prisma.user.create({
    data: {
      email: 'david@newtonite.corp',
      name: 'David Patel (Operations)',
      passwordHash,
    },
  });

  const eva = await prisma.user.create({
    data: {
      email: 'eva@newtonite.corp',
      name: 'Eva Rodriguez (Compliance Lead)',
      passwordHash,
    },
  });

  // 2. Create Teams
  const engTeam = await prisma.team.create({
    data: {
      name: 'Platform Engineering',
      description: 'Core infrastructure, microservices, database reliability, and production incident response.',
    },
  });

  const paymentsTeam = await prisma.team.create({
    data: {
      name: 'Payments & Settlement',
      description: 'Payment gateway integrations, dispute reconciliation, UPI timeouts, and fraud detection.',
    },
  });

  const complianceTeam = await prisma.team.create({
    data: {
      name: 'Compliance & Legal',
      description: 'Regulatory audit requests, high-value transaction scrutiny, and SEBI compliance verification.',
    },
  });

  // 3. Assign Memberships & Roles
  await prisma.teamMember.createMany({
    data: [
      { userId: alice.id, teamId: engTeam.id, role: 'admin' },
      { userId: bob.id, teamId: engTeam.id, role: 'member' },
      { userId: carol.id, teamId: paymentsTeam.id, role: 'manager' },
      { userId: david.id, teamId: paymentsTeam.id, role: 'member' },
      { userId: alice.id, teamId: paymentsTeam.id, role: 'member' }, // Cross-team
      { userId: eva.id, teamId: complianceTeam.id, role: 'admin' },
      { userId: carol.id, teamId: complianceTeam.id, role: 'member' },
    ],
  });

  // 4. Create Work Items & Activity Logs

  // Item 1: Critical Incident (Unassigned, Needs Attention)
  const item1 = await prisma.workItem.create({
    data: {
      title: 'Database connection pool exhaustion on primary replica',
      description: 'Spike in p99 API latency to 4.8s. High connection count observed in us-east cluster. Needs immediate pool tuning and connection drain investigation.',
      priority: 'critical',
      status: 'open',
      type: 'incident',
      teamId: engTeam.id,
      creatorId: alice.id,
      version: 1,
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    },
  });
  await prisma.activityLog.create({
    data: {
      workItemId: item1.id,
      actorId: alice.id,
      action: 'created',
      newValue: item1.title,
    },
  });

  // Item 2: Overdue Payment Investigation (Assigned to David)
  const item2 = await prisma.workItem.create({
    data: {
      title: 'HDFC UPI Webhook callback timeouts causing phantom drops',
      description: 'Merchant settlement batch #94821 failed due to gateway timeout. 42 users debited but pending order status.',
      priority: 'high',
      status: 'in_progress',
      type: 'payment',
      teamId: paymentsTeam.id,
      creatorId: carol.id,
      assigneeId: david.id,
      version: 2,
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Overdue by 1 day!
    },
  });
  await prisma.activityLog.createMany({
    data: [
      {
        workItemId: item2.id,
        actorId: carol.id,
        action: 'created',
        newValue: item2.title,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
      {
        workItemId: item2.id,
        actorId: carol.id,
        action: 'assigned',
        oldValue: 'Unassigned',
        newValue: david.name,
        createdAt: new Date(Date.now() - 40 * 60 * 60 * 1000),
      },
      {
        workItemId: item2.id,
        actorId: david.id,
        action: 'commented',
        comment: 'Contacted bank nodal officer. They confirmed network blip on their end between 14:00 and 15:30 UTC.',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ],
  });

  // Item 3: Under Review Compliance Task (Assigned to Eva)
  const item3 = await prisma.workItem.create({
    data: {
      title: 'Quarterly AML high-value transaction audit report',
      description: 'Prepare reconciliation files for transactions > ₹10,00,000 for statutory submission before month-end.',
      priority: 'high',
      status: 'under_review',
      type: 'compliance',
      teamId: complianceTeam.id,
      creatorId: eva.id,
      assigneeId: eva.id,
      version: 3,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.activityLog.createMany({
    data: [
      {
        workItemId: item3.id,
        actorId: eva.id,
        action: 'created',
        newValue: item3.title,
        createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      },
      {
        workItemId: item3.id,
        actorId: eva.id,
        action: 'status_changed',
        oldValue: 'open',
        newValue: 'in_progress',
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
      {
        workItemId: item3.id,
        actorId: eva.id,
        action: 'status_changed',
        oldValue: 'in_progress',
        newValue: 'under_review',
        comment: 'Draft audit sheets compiled and attached for external legal review.',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
    ],
  });

  // Item 4: Resolved Task
  const item4 = await prisma.workItem.create({
    data: {
      title: 'Upgrade Redis cache cluster to v7.2 for memory efficiency',
      description: 'Scheduled maintenance performed on Sunday morning. Zero data loss and cluster returned to healthy green state.',
      priority: 'medium',
      status: 'resolved',
      type: 'task',
      teamId: engTeam.id,
      creatorId: alice.id,
      assigneeId: bob.id,
      version: 4,
    },
  });
  await prisma.activityLog.createMany({
    data: [
      {
        workItemId: item4.id,
        actorId: alice.id,
        action: 'created',
        newValue: item4.title,
      },
      {
        workItemId: item4.id,
        actorId: alice.id,
        action: 'assigned',
        oldValue: 'Unassigned',
        newValue: bob.name,
      },
      {
        workItemId: item4.id,
        actorId: bob.id,
        action: 'status_changed',
        oldValue: 'in_progress',
        newValue: 'resolved',
        comment: 'Successfully completed rollout. Memory utilization down by 23%.',
      },
    ],
  });

  // Item 5: Unassigned Bug
  const item5 = await prisma.workItem.create({
    data: {
      title: 'Webhook retry backoff logic missing jitter causing thundering herd',
      description: 'When webhook delivery fails, retries fire at exact 60s intervals, causing synchronized traffic spikes.',
      priority: 'medium',
      status: 'open',
      type: 'bug',
      teamId: engTeam.id,
      creatorId: bob.id,
      version: 1,
    },
  });
  await prisma.activityLog.create({
    data: {
      workItemId: item5.id,
      actorId: bob.id,
      action: 'created',
      newValue: item5.title,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('Demo Accounts (password for all: password123):');
  console.log(' - alice@newtonite.corp (Platform Engineering Admin)');
  console.log(' - bob@newtonite.corp (Platform Engineering Member)');
  console.log(' - carol@newtonite.corp (Payments Manager)');
  console.log(' - david@newtonite.corp (Payments Member)');
  console.log(' - eva@newtonite.corp (Compliance Admin)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
