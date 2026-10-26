const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Request = require('../src/models/Request');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

describe('Stage 6 - REST-Based Messaging', () => {
  let user1Token, user1Id;
  let user2Token, user2Id;
  let user3Token, user3Id;
  let acceptedRequestId;
  let pendingRequestId;

  beforeEach(async () => {
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    await Request.deleteMany({});
    await User.deleteMany({});

    // Register User 1
    const reg1 = await request(app).post('/api/auth/register').send({
      name: 'Kavita Iyer',
      email: 'kavita@example.com',
      password: 'password123',
      role: 'both',
      skillsToTeach: ['React'],
      skillsToLearn: ['Python'],
    });
    user1Token = reg1.body.token;
    user1Id = reg1.body.user.id || reg1.body.user._id;

    // Register User 2
    const reg2 = await request(app).post('/api/auth/register').send({
      name: 'Arjun Das',
      email: 'arjun@example.com',
      password: 'password123',
      role: 'both',
      skillsToTeach: ['Python'],
      skillsToLearn: ['React'],
    });
    user2Token = reg2.body.token;
    user2Id = reg2.body.user.id || reg2.body.user._id;

    // Register User 3 (Third party)
    const reg3 = await request(app).post('/api/auth/register').send({
      name: 'Third Party',
      email: 'thirdparty@example.com',
      password: 'password123',
      role: 'learner',
    });
    user3Token = reg3.body.token;
    user3Id = reg3.body.user.id || reg3.body.user._id;

    // User 1 sends request to User 2 -> User 2 accepts it
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipient: user2Id, skillWanted: 'Python', skillOffered: 'React' });
    acceptedRequestId = reqRes.body.request.id || reqRes.body.request._id;

    await request(app)
      .patch(`/api/requests/${acceptedRequestId}/status`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ status: 'accepted' });

    // User 1 sends another request to User 3 which remains pending
    const pendRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipient: user3Id, skillWanted: 'Data Analysis' });
    pendingRequestId = pendRes.body.request.id || pendRes.body.request._id;
  });

  describe('POST /api/conversations (Create or retrieve conversation)', () => {
    it('should create a conversation for an accepted skill exchange request', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ requestId: acceptedRequestId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.conversation.request._id.toString()).toBe(acceptedRequestId.toString());
      expect(res.body.conversation.participants.length).toBe(2);
      expect(res.body.conversation.participants[0].password).toBeUndefined();
    });

    it('should return the existing conversation idempotently when called again', async () => {
      // First call
      const firstRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ requestId: acceptedRequestId });
      const firstId = firstRes.body.conversation.id || firstRes.body.conversation._id;

      // Second call by the other participant (User 2)
      const secondRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ requestId: acceptedRequestId });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.success).toBe(true);
      const secondId = secondRes.body.conversation.id || secondRes.body.conversation._id;
      expect(secondId.toString()).toBe(firstId.toString());
    });

    it('should reject conversation creation if request is pending', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ requestId: pendingRequestId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('only be initiated for accepted skill exchange requests');
    });

    it('should reject conversation creation if user is not a participant in the request', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user3Token}`) // User 3 is not in user1-user2 request
        .send({ requestId: acceptedRequestId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not an authorized participant');
    });

    it('should reject conversation creation for nonexistent request ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ requestId: nonExistentId });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Exchange request not found');
    });
  });

  describe('GET /api/conversations (List user conversations)', () => {
    beforeEach(async () => {
      // Create conversation between User 1 and User 2
      await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ requestId: acceptedRequestId });
    });

    it('should return conversations for participants', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.conversations.length).toBe(1);
      expect(res.body.conversations[0].participants[0].password).toBeUndefined();
    });

    it('should return empty list for user not in any conversations', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${user3Token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.conversations).toEqual([]);
    });
  });

  describe('Messaging (POST and GET /api/conversations/:id/messages)', () => {
    let conversationId;

    beforeEach(async () => {
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ requestId: acceptedRequestId });
      conversationId = convRes.body.conversation.id || convRes.body.conversation._id;
    });

    it('should send a message and retrieve messages in chronological order', async () => {
      // User 1 sends message 1
      const m1Res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'Hello Arjun! When can we start our first session?' });

      expect(m1Res.status).toBe(201);
      expect(m1Res.body.success).toBe(true);
      expect(m1Res.body.message.text).toBe('Hello Arjun! When can we start our first session?');
      expect(m1Res.body.message.sender.name).toBe('Kavita Iyer');
      expect(m1Res.body.message.readAt).toBeNull();

      // User 2 sends reply message 2
      const m2Res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ text: 'Hi Kavita! How about this Saturday at 4 PM?' });

      expect(m2Res.status).toBe(201);

      // Retrieve messages (should be oldest-to-newest)
      const listRes = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.total).toBe(2);
      expect(listRes.body.messages[0].text).toBe('Hello Arjun! When can we start our first session?');
      expect(listRes.body.messages[1].text).toBe('Hi Kavita! How about this Saturday at 4 PM?');
    });

    it('should update conversation activity metadata after sending message', async () => {
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'Check activity update' });

      const convRes = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(convRes.status).toBe(200);
      expect(convRes.body.conversation.lastMessage).not.toBeNull();
      expect(convRes.body.conversation.lastMessage.text).toBe('Check activity update');
    });

    it('should reject empty or whitespace-only messages with 400', async () => {
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject oversized messages exceeding 5000 characters with 400', async () => {
      const longText = 'a'.repeat(5001);
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: longText });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('cannot exceed 5000 characters');
    });

    it('should ignore client sender spoofing and enforce authenticated user as sender', async () => {
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          sender: user2Id, // spoofed sender
          text: 'Spoofed sender test',
        });

      expect(res.status).toBe(201);
      // Sender must still be User 1
      expect(res.body.message.sender._id.toString()).toBe(user1Id.toString());
    });

    it('should forbid unauthorized third-party user from sending messages with 403', async () => {
      const res = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ text: 'Intruder message' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Not authorized to send messages');
    });

    it('should forbid unauthorized third-party user from reading messages with 403', async () => {
      const res = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Not authorized to access messages');
    });
  });

  describe('PATCH /api/conversations/:id/read (Read receipts)', () => {
    let conversationId;

    beforeEach(async () => {
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ requestId: acceptedRequestId });
      conversationId = convRes.body.conversation.id || convRes.body.conversation._id;

      // User 1 sends a message to User 2
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ text: 'Message from user 1' });

      // User 2 sends a message to User 1
      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ text: 'Message from user 2' });
    });

    it('should mark only incoming messages as read, never own messages', async () => {
      // User 1 marks conversation as read
      const readRes = await request(app)
        .patch(`/api/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.success).toBe(true);
      expect(readRes.body.readCount).toBe(1); // Only 1 incoming message from User 2

      // Verify message states
      const messagesRes = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      const [user1Msg, user2Msg] = messagesRes.body.messages;

      // User 1's own message remains unread by recipient
      expect(user1Msg.readAt).toBeNull();

      // User 2's message to User 1 is now marked as read
      expect(user2Msg.readAt).not.toBeNull();
    });

    it('should forbid unauthorized third party from marking conversation as read with 403', async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(res.status).toBe(403);
    });
  });
});
