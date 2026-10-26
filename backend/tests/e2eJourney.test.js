const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Request = require('../src/models/Request');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

describe('Stage 8 - Complete End-to-End User Journey & Security Verification', () => {
  beforeAll(async () => {
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    await Request.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    await Request.deleteMany({});
    await User.deleteMany({});
  });

  // Test state variables across the 10-step journey
  let userAToken, userAId;
  let userBToken, userBId;
  let userCToken, userCId; // Third party user for security assertions
  let exchangeRequestId;
  let conversationId;
  let message1Id, message2Id;

  // -----------------------------------------------------------------
  // 1. Register both users and log in
  // -----------------------------------------------------------------
  describe('Step 1: Registration and Authentication of Two Separate Accounts', () => {
    it('should register User A (Devika) successfully and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Devika Nair',
          email: 'devika.nair@skillbridge.test',
          password: 'Password123!',
          role: 'both',
          location: 'Kochi, Kerala',
          skillsToTeach: ['React', 'JavaScript'],
          skillsToLearn: ['Python'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      userAToken = res.body.token;
      userAId = res.body.user.id || res.body.user._id;
      expect(userAId).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it('should register User B (Rohan) successfully and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Rohan Verma',
          email: 'rohan.verma@skillbridge.test',
          password: 'Password123!',
          role: 'both',
          location: 'Bengaluru, Karnataka',
          skillsToTeach: ['Python', 'Django'],
          skillsToLearn: ['React'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      userBToken = res.body.token;
      userBId = res.body.user.id || res.body.user._id;
      expect(userBId).toBeDefined();
    });

    it('should register User C (Third Party) to test security boundaries', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Intruder User',
          email: 'intruder@skillbridge.test',
          password: 'Password123!',
          role: 'learner',
        });

      expect(res.status).toBe(201);
      userCToken = res.body.token;
      userCId = res.body.user.id || res.body.user._id;
    });

    it('should authenticate both users via /api/auth/login and retrieve valid tokens', async () => {
      const loginA = await request(app)
        .post('/api/auth/login')
        .send({ email: 'devika.nair@skillbridge.test', password: 'Password123!' });
      expect(loginA.status).toBe(200);
      expect(loginA.body.token).toBeDefined();

      const loginB = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rohan.verma@skillbridge.test', password: 'Password123!' });
      expect(loginB.status).toBe(200);
      expect(loginB.body.token).toBeDefined();
    });
  });

  // -----------------------------------------------------------------
  // 2. Create and update their profiles with different skills
  // -----------------------------------------------------------------
  describe('Step 2: Profile Customization and Skill Management', () => {
    it('should allow User A to update bio, availability, and add skills', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          bio: 'Frontend enthusiast interested in backend APIs & data science',
          availability: 'Weekday evenings & Sunday',
          skillsToTeach: ['React', 'TypeScript', 'CSS/Tailwind'],
          skillsToLearn: ['Python', 'FastAPI'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.bio).toContain('Frontend enthusiast');
      expect(res.body.user.skillsToTeach).toContain('TypeScript');
      expect(res.body.user.skillsToLearn).toContain('FastAPI');
    });

    it('should allow User B to update bio, location, and skills', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          bio: 'Backend engineer exploring modern UI frameworks',
          availability: 'Flexible weekends',
          skillsToTeach: ['Python', 'Django', 'FastAPI'],
          skillsToLearn: ['React', 'TypeScript'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.skillsToTeach).toContain('FastAPI');
    });
  });

  // -----------------------------------------------------------------
  // 3. Discover each other using search and filters
  // -----------------------------------------------------------------
  describe('Step 3: Skill Discovery, Search, and Multi-criteria Filtering', () => {
    it('User A should discover User B when searching for Python teachers', async () => {
      const res = await request(app)
        .get('/api/users?teach=Python')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);

      const foundUserB = res.body.users.find(
        (u) => (u.id || u._id).toString() === userBId.toString()
      );
      expect(foundUserB).toBeDefined();
      expect(foundUserB.name).toBe('Rohan Verma');
      expect(foundUserB.skillsToTeach).toContain('Python');

      // User A should be excluded from own search results by default
      const foundSelf = res.body.users.find(
        (u) => (u.id || u._id).toString() === userAId.toString()
      );
      expect(foundSelf).toBeUndefined();
    });

    it('User B should discover User A using combined filters (teaches React + wants to learn Python)', async () => {
      const res = await request(app)
        .get('/api/users?teach=React&learn=Python')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const foundUserA = res.body.users.find(
        (u) => (u.id || u._id).toString() === userAId.toString()
      );
      expect(foundUserA).toBeDefined();
      expect(foundUserA.name).toBe('Devika Nair');
    });

    it('User A should be able to view User B public profile without seeing private credentials', async () => {
      const res = await request(app)
        .get(`/api/users/${userBId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Rohan Verma');
      expect(res.body.user.bio).toBe('Backend engineer exploring modern UI frameworks');
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.__v).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------
  // 4. Send a skill exchange request from one user
  // -----------------------------------------------------------------
  describe('Step 4: Creating a Skill Exchange Request', () => {
    it('User A sends a skill exchange request to User B', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          recipient: userBId,
          skillWanted: 'Python',
          skillOffered: 'React',
          message: 'Hi Rohan! I would love to learn Python from you and can teach you React in return.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe('pending');
      expect(res.body.request.skillWanted).toBe('Python');
      expect(res.body.request.skillOffered).toBe('React');

      exchangeRequestId = res.body.request.id || res.body.request._id;
      expect(exchangeRequestId).toBeDefined();
    });

    it('User A should see the request under sent requests', async () => {
      const res = await request(app)
        .get('/api/requests/sent')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBe(1);
      expect(res.body.requests[0].recipient.name).toBe('Rohan Verma');
      expect(res.body.requests[0].status).toBe('pending');
    });

    it('User B should see the request under received requests', async () => {
      const res = await request(app)
        .get('/api/requests/received')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.requests.length).toBe(1);
      expect(res.body.requests[0].sender.name).toBe('Devika Nair');
      expect(res.body.requests[0].status).toBe('pending');
    });
  });

  // -----------------------------------------------------------------
  // 5. Accept the request from the other user
  // -----------------------------------------------------------------
  describe('Step 5: Accepting the Request (Permission and State Transition)', () => {
    it('should forbid User A (sender) or User C (third party) from accepting the request', async () => {
      // Sender cannot accept
      const resA = await request(app)
        .patch(`/api/requests/${exchangeRequestId}/status`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'accepted' });
      expect(resA.status).toBe(403);

      // Third party cannot accept
      const resC = await request(app)
        .patch(`/api/requests/${exchangeRequestId}/status`)
        .set('Authorization', `Bearer ${userCToken}`)
        .send({ status: 'accepted' });
      expect(resC.status).toBe(403);
    });

    it('User B (recipient) accepts the pending request', async () => {
      const res = await request(app)
        .patch(`/api/requests/${exchangeRequestId}/status`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ status: 'accepted' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe('accepted');
    });

    it('should reject further modifications once in terminal accepted state', async () => {
      const res = await request(app)
        .patch(`/api/requests/${exchangeRequestId}/status`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ status: 'declined' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Terminal states cannot be changed');
    });
  });

  // -----------------------------------------------------------------
  // 6. Open the conversation created for the accepted request
  // -----------------------------------------------------------------
  describe('Step 6: Initiating and Opening Conversation', () => {
    it('should forbid third-party from creating a conversation for this request', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userCToken}`)
        .send({ requestId: exchangeRequestId });

      expect(res.status).toBe(403);
    });

    it('should allow User A to open a conversation for the accepted request', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ requestId: exchangeRequestId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      conversationId = res.body.conversation.id || res.body.conversation._id;
      expect(conversationId).toBeDefined();
    });

    it('should return the existing conversation idempotently when User B opens it', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ requestId: exchangeRequestId });

      expect(res.status).toBe(200);
      const returnedId = res.body.conversation.id || res.body.conversation._id;
      expect(returnedId.toString()).toBe(conversationId.toString());
    });
  });

  // -----------------------------------------------------------------
  // 7 & 8. Exchange messages, verify chronological order and read receipts
  // -----------------------------------------------------------------
  describe('Steps 7 & 8: Exchanging Messages, Chronological Ordering, and Read Receipts', () => {
    it('User A sends message 1 to User B', async () => {
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ text: 'Hello Rohan! Excited to exchange React and Python skills.' });

      expect(res.status).toBe(201);
      expect(res.body.message.text).toBe('Hello Rohan! Excited to exchange React and Python skills.');
      expect(res.body.message.readAt).toBeNull();
      message1Id = res.body.message.id || res.body.message._id;
    });

    it('User B sends reply message 2 to User A', async () => {
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ text: 'Hey Devika! Me too. Let us set up our first session this weekend.' });

      expect(res.status).toBe(201);
      expect(res.body.message.text).toBe('Hey Devika! Me too. Let us set up our first session this weekend.');
      expect(res.body.message.readAt).toBeNull();
      message2Id = res.body.message.id || res.body.message._id;
    });

    it('should retrieve messages in chronological (oldest-to-newest) order', async () => {
      const res = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.messages.length).toBe(2);
      expect(res.body.messages[0].text).toContain('Hello Rohan');
      expect(res.body.messages[1].text).toContain('Hey Devika');
    });

    it('User A marks conversation as read -> only User B incoming message is marked read', async () => {
      const readRes = await request(app)
        .patch(`/api/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.readCount).toBe(1); // Only message 2 from User B

      // Verify message states
      const msgRes = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userAToken}`);

      const [m1, m2] = msgRes.body.messages;
      expect(m1.readAt).toBeNull(); // User A's own message is not read by User B yet
      expect(m2.readAt).not.toBeNull(); // User B's message is marked read by User A
    });

    it('should forbid User C (third party) from reading or sending messages', async () => {
      const readRes = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userCToken}`);
      expect(readRes.status).toBe(403);

      const sendRes = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userCToken}`)
        .send({ text: 'Unauthorized message' });
      expect(sendRes.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------
  // 9. Session restoration and database persistence
  // -----------------------------------------------------------------
  describe('Step 9: Session Restoration and Data Persistence', () => {
    it('should restore User A session using JWT token via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Devika Nair');
      expect(res.body.user.email).toBe('devika.nair@skillbridge.test');
      expect(res.body.user.skillsToTeach).toContain('TypeScript');
    });

    it('should persist conversation list and message history across requests', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.conversations[0].lastMessage).toBeDefined();
    });
  });

  // -----------------------------------------------------------------
  // 10. Logout and protected-route redirects / rejection
  // -----------------------------------------------------------------
  describe('Step 10: Unauthenticated Requests & Protected Route Rejections', () => {
    it('should reject access to /api/auth/me without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject access to /api/users/me without token', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('should reject access to /api/requests without token', async () => {
      const res = await request(app).get('/api/requests/received');
      expect(res.status).toBe(401);
    });

    it('should reject access to /api/conversations without token', async () => {
      const res = await request(app).get('/api/conversations');
      expect(res.status).toBe(401);
    });

    it('should reject malformed or expired tokens', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token-string');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid token');
    });
  });
});
