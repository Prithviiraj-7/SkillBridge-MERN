const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Request = require('../src/models/Request');

describe('Stage 5 - Skill Exchange Requests', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let user3Token;
  let user3Id;

  const user1 = {
    name: 'Devika Nair',
    email: 'devika@example.com',
    password: 'password123',
    role: 'both',
    skillsToTeach: ['React', 'CSS'],
    skillsToLearn: ['Python'],
  };

  const user2 = {
    name: 'Sameer Khan',
    email: 'sameer@example.com',
    password: 'password123',
    role: 'both',
    skillsToTeach: ['Python', 'Django'],
    skillsToLearn: ['React'],
  };

  const user3 = {
    name: 'Third Party User',
    email: 'thirdparty@example.com',
    password: 'password123',
    role: 'learner',
  };

  beforeEach(async () => {
    await Request.deleteMany({});
    await User.deleteMany({});

    const reg1 = await request(app).post('/api/auth/register').send(user1);
    user1Token = reg1.body.token;
    user1Id = reg1.body.user.id || reg1.body.user._id;

    const reg2 = await request(app).post('/api/auth/register').send(user2);
    user2Token = reg2.body.token;
    user2Id = reg2.body.user.id || reg2.body.user._id;

    const reg3 = await request(app).post('/api/auth/register').send(user3);
    user3Token = reg3.body.token;
    user3Id = reg3.body.user.id || reg3.body.user._id;
  });

  describe('POST /api/requests (Create request)', () => {
    it('should create a request with both skillWanted and skillOffered and default to pending', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipient: user2Id,
          skillWanted: 'Python',
          skillOffered: 'React',
          message: 'Hi Sameer, would love to exchange skills!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe('pending');
      expect(res.body.request.skillWanted).toBe('Python');
      expect(res.body.request.skillOffered).toBe('React');
      expect(res.body.request.message).toBe('Hi Sameer, would love to exchange skills!');
      expect(res.body.request.sender.name).toBe(user1.name);
      expect(res.body.request.recipient.name).toBe(user2.name);
      expect(res.body.request.sender.password).toBeUndefined();
      expect(res.body.request.recipient.password).toBeUndefined();
    });

    it('should create a one-way learning request with no skill offered (no mandatory barter)', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipient: user2Id,
          skillWanted: 'Python',
          message: 'Can you mentor me on Python basics?',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.request.skillWanted).toBe('Python');
      expect(res.body.request.skillOffered).toBe('');
      expect(res.body.request.status).toBe('pending');
    });

    it('should reject a request sent to oneself with 400', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipient: user1Id,
          skillWanted: 'React',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('yourself');
    });

    it('should reject a request with nonexistent recipient user ID with 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipient: nonExistentId,
          skillWanted: 'Python',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Recipient user not found');
    });

    it('should reject request with malformed recipient ID with 400', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipient: '12345-not-an-id',
          skillWanted: 'Python',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should prevent duplicate pending requests for the same skill between the same users', async () => {
      // First request
      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipient: user2Id,
          skillWanted: 'Python',
        });

      // Second identical request
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipient: user2Id,
          skillWanted: 'python', // case-insensitive check
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('pending request for this skill has already been sent');
    });

    it('should ignore client spoofing of sender and status fields', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          sender: user3Id, // spoofed sender
          status: 'accepted', // spoofed initial status
          recipient: user2Id,
          skillWanted: 'Python',
        });

      expect(res.status).toBe(201);
      // Sender must still be user1, status must still be pending
      expect(res.body.request.sender._id.toString()).toBe(user1Id.toString());
      expect(res.body.request.status).toBe('pending');
    });

    it('should reject unauthenticated request creation with 401', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          recipient: user2Id,
          skillWanted: 'Python',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/requests/sent and /api/requests/received', () => {
    beforeEach(async () => {
      // User 1 sends request to User 2
      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ recipient: user2Id, skillWanted: 'Python' });

      // User 3 sends request to User 1
      await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ recipient: user1Id, skillWanted: 'React' });
    });

    it('should retrieve sent requests for current user with populated recipient', async () => {
      const res = await request(app)
        .get('/api/requests/sent')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.requests[0].recipient.name).toBe(user2.name);
      expect(res.body.requests[0].skillWanted).toBe('Python');
    });

    it('should retrieve received requests for current user with populated sender', async () => {
      const res = await request(app)
        .get('/api/requests/received')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.requests[0].sender.name).toBe(user3.name);
      expect(res.body.requests[0].skillWanted).toBe('React');
    });

    it('should paginate request lists properly', async () => {
      const res = await request(app)
        .get('/api/requests/sent?page=1&limit=1')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.pages).toBe(1);
    });
  });

  describe('GET /api/requests/:id (Access control)', () => {
    let requestId;

    beforeEach(async () => {
      const created = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ recipient: user2Id, skillWanted: 'Python' });
      requestId = created.body.request.id || created.body.request._id;
    });

    it('should allow sender to view request details', async () => {
      const res = await request(app)
        .get(`/api/requests/${requestId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.skillWanted).toBe('Python');
    });

    it('should allow recipient to view request details', async () => {
      const res = await request(app)
        .get(`/api/requests/${requestId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.skillWanted).toBe('Python');
    });

    it('should forbid third-party user from viewing request with 403', async () => {
      const res = await request(app)
        .get(`/api/requests/${requestId}`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Not authorized to view this request');
    });

    it('should return 404 for nonexistent request ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/requests/${nonExistentId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Request not found');
    });
  });

  describe('PATCH /api/requests/:id/status (Lifecycle & Permissions)', () => {
    let requestId;

    beforeEach(async () => {
      const created = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ recipient: user2Id, skillWanted: 'Python' });
      requestId = created.body.request.id || created.body.request._id;
    });

    it('should allow recipient to accept a pending request', async () => {
      const res = await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ status: 'accepted' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe('accepted');
    });

    it('should allow recipient to decline a pending request', async () => {
      const res = await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ status: 'declined' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe('declined');
    });

    it('should allow sender to cancel a pending request', async () => {
      const res = await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ status: 'cancelled' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe('cancelled');
    });

    it('should forbid sender from accepting their own request with 403', async () => {
      const res = await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ status: 'accepted' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only the recipient can accept or decline');
    });

    it('should forbid recipient from cancelling a request with 403', async () => {
      const res = await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ status: 'cancelled' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only the sender can cancel');
    });

    it('should forbid third-party from modifying status with 403', async () => {
      const res = await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ status: 'accepted' });

      expect(res.status).toBe(403);
    });

    it('should reject modification of terminal state (accepted -> cancelled)', async () => {
      // First accept
      await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ status: 'accepted' });

      // Attempt to cancel
      const res = await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ status: 'cancelled' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Terminal states cannot be changed');
    });

    it('should reject invalid status with 400', async () => {
      const res = await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Status must be one of');
    });

    it('should allow creating a new request for the same skill once previous request was declined', async () => {
      // Decline the initial request
      await request(app)
        .patch(`/api/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ status: 'declined' });

      // Now create a new request for the same skill
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          recipient: user2Id,
          skillWanted: 'Python',
          message: 'Trying again with different availability',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe('pending');
    });
  });
});
