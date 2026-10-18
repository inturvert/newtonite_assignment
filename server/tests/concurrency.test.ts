import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

describe('Critical Concurrency & Business Rules Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let teamId: string;

  beforeEach(async () => {
    // Reset test DB
    await prisma.activityLog.deleteMany();
    await prisma.workItem.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.user.deleteMany();
    await prisma.idempotencyKey.deleteMany();

    const passwordHash = await bcrypt.hash('password123', 10);

    // Create User A (manager)
    const userA = await prisma.user.create({
      data: { email: 'alice@test.corp', name: 'Alice Test', passwordHash },
    });
    userAId = userA.id;

    // Create User B (member)
    const userB = await prisma.user.create({
      data: { email: 'bob@test.corp', name: 'Bob Test', passwordHash },
    });
    userBId = userB.id;

    // Create Team
    const team = await prisma.team.create({
      data: { name: 'Operations Test Team' },
    });
    teamId = team.id;

    // Add members
    await prisma.teamMember.create({
      data: { userId: userAId, teamId, role: 'manager' },
    });
    await prisma.teamMember.create({
      data: { userId: userBId, teamId, role: 'member' },
    });

    // Login User A
    const loginARes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.corp', password: 'password123' });
    userAToken = loginARes.body.token;

    // Login User B
    const loginBRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@test.corp', password: 'password123' });
    userBToken = loginBRes.body.token;
  });

  // TEST 1: Optimistic Locking rejects stale edits
  it('CRITICAL 1: Optimistic locking rejects stale edits with 409 Conflict', async () => {
    // Create an item
    const createRes = await request(app)
      .post('/api/work-items')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Original Title',
        teamId,
        priority: 'medium',
      });
    expect(createRes.status).toBe(201);
    const item = createRes.body.item;
    expect(item.version).toBe(1);

    // User A updates item successfully (providing version 1)
    const updateARes = await request(app)
      .patch(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        version: 1,
        title: 'User A Modified Title',
      });
    expect(updateARes.status).toBe(200);
    expect(updateARes.body.item.version).toBe(2);

    // User B tries to update using stale version 1 -> REJECTED with 409
    const updateBRes = await request(app)
      .patch(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        version: 1, // Stale!
        title: 'User B Overwriting Stale Title',
      });
    expect(updateBRes.status).toBe(409);
    expect(updateBRes.body.error).toBe('Conflict');
    expect(updateBRes.body.currentData.version).toBe(2);
  });

  // TEST 2: Atomic Self-Claim Race Condition Prevention
  it('CRITICAL 2: Prevents race condition when two users try to claim the same work item', async () => {
    const createRes = await request(app)
      .post('/api/work-items')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Unassigned Urgent Bug',
        teamId,
        priority: 'high',
      });
    const item = createRes.body.item;

    // User A claims it first
    const claimARes = await request(app)
      .post(`/api/work-items/${item.id}/claim`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ version: 1 });
    expect(claimARes.status).toBe(200);
    expect(claimARes.body.item.assigneeId).toBe(userAId);
    expect(claimARes.body.item.version).toBe(2);

    // User B tries to claim the same item
    const claimBRes = await request(app)
      .post(`/api/work-items/${item.id}/claim`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ version: 1 }); // Still thought it was version 1 and unassigned
    expect(claimBRes.status).toBe(409);
    expect(claimBRes.body.error).toBe('Conflict');
  });

  // TEST 3: Idempotency prevents duplicate operations
  it('CRITICAL 3: Idempotency key prevents duplicate execution and returns identical response', async () => {
    const idempotencyKey = 'unique-req-uuid-999';

    // First request
    const res1 = await request(app)
      .post('/api/work-items')
      .set('Authorization', `Bearer ${userAToken}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({
        title: 'Idempotent Work Item',
        teamId,
      });
    expect(res1.status).toBe(201);
    const createdId = res1.body.item.id;

    // Duplicate request with identical key (e.g. network retry)
    const res2 = await request(app)
      .post('/api/work-items')
      .set('Authorization', `Bearer ${userAToken}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({
        title: 'Idempotent Work Item',
        teamId,
      });
    expect(res2.status).toBe(201);
    expect(res2.headers['x-idempotency-hit']).toBe('true');
    expect(res2.body.item.id).toBe(createdId);

    // Verify only ONE item was created in the database
    const count = await prisma.workItem.count({ where: { title: 'Idempotent Work Item' } });
    expect(count).toBe(1);
  });

  // TEST 4: Workflow State Machine enforces valid transitions
  it('CRITICAL 4: State machine rejects invalid status jumps', async () => {
    const createRes = await request(app)
      .post('/api/work-items')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Workflow Item',
        teamId,
      });
    const item = createRes.body.item;
    expect(item.status).toBe('open');

    // Invalid: 'open' directly to 'resolved' (skipping in_progress / under_review)
    const invalidRes = await request(app)
      .post(`/api/work-items/${item.id}/transition`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        version: 1,
        toStatus: 'resolved',
      });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toBe('ValidationError');

    // Valid: 'open' to 'in_progress'
    const validRes = await request(app)
      .post(`/api/work-items/${item.id}/transition`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        version: 1,
        toStatus: 'in_progress',
        comment: 'Beginning investigation.',
      });
    expect(validRes.status).toBe(200);
    expect(validRes.body.item.status).toBe('in_progress');
  });

  // TEST 5: Server-side RBAC enforces permissions
  it('CRITICAL 5: Server independently rejects unauthorized privilege escalations', async () => {
    // User B (regular member) attempts to escalate priority to 'critical'
    const createRes = await request(app)
      .post('/api/work-items')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Member Escalation Test',
        teamId,
        priority: 'medium',
      });
    const item = createRes.body.item;

    const escalateRes = await request(app)
      .patch(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        version: 1,
        priority: 'critical', // Member not allowed!
      });
    expect(escalateRes.status).toBe(403);
    expect(escalateRes.body.error).toBe('Forbidden');

    // Manager User A can escalate
    const managerEscalateRes = await request(app)
      .patch(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        version: 1,
        priority: 'critical',
      });
    expect(managerEscalateRes.status).toBe(200);
    expect(managerEscalateRes.body.item.priority).toBe('critical');
  });

  // TEST 6: Immutable Append-Only Audit Trail
  it('CRITICAL 6: Records full immutable audit history for all operations', async () => {
    const createRes = await request(app)
      .post('/api/work-items')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Audit Trail Test',
        teamId,
      });
    const item = createRes.body.item;

    // Transition
    await request(app)
      .post(`/api/work-items/${item.id}/transition`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ version: 1, toStatus: 'in_progress' });

    // Comment
    await request(app)
      .post(`/api/work-items/${item.id}/comments`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ comment: 'User B added an audit comment.' });

    // Fetch detail with activities
    const detailRes = await request(app)
      .get(`/api/work-items/${item.id}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(detailRes.status).toBe(200);
    const activities = detailRes.body.item.activities;
    expect(activities.length).toBe(3); // created, status_changed, commented
    expect(activities[0].action).toBe('commented');
    expect(activities[1].action).toBe('status_changed');
    expect(activities[2].action).toBe('created');
  });
});
