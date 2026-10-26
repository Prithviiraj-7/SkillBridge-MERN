const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Stage 2 - Authentication & Authorization', () => {
  beforeEach(async () => {
    // Clean up users collection before each test
    await User.deleteMany({});
  });

  const testUser = {
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    password: 'password123',
    role: 'both',
    bio: 'Web developer learning classical flute',
    skillsToTeach: ['React', 'JavaScript', 'Node.js'],
    skillsToLearn: ['Flute', 'Music Theory'],
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully with hashed password and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe('both');
      expect(res.body.user.skillsToTeach).toEqual(expect.arrayContaining(['React']));
      expect(res.body.user.skillsToLearn).toEqual(expect.arrayContaining(['Flute']));
      expect(res.body.user.password).toBeUndefined();

      // Verify user is in database with hashed password
      const dbUser = await User.findOne({ email: testUser.email }).select('+password');
      expect(dbUser).not.toBeNull();
      expect(dbUser.password).not.toBe(testUser.password);
    });

    it('should reject registration if email is already registered (case-insensitive)', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      // Attempt with uppercase variation
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email: 'AARAV@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('valid email');
    });

    it('should reject registration with password shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('at least 6 characters');
    });

    it('should reject registration with missing name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'noname@example.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Name is required');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should authenticate user and return token with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    let token;

    beforeEach(async () => {
      const regRes = await request(app).post('/api/auth/register').send(testUser);
      token = regRes.body.token;
    });

    it('should return current user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.password).toBeUndefined();
    });

    it('should return 401 Unauthorized when no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No authentication token provided');
    });

    it('should return 401 Unauthorized when invalid/tampered token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid token');
    });
  });
});
