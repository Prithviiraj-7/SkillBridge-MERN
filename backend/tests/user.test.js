const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Stage 3 - User Profiles & Profile Management', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;

  const user1Data = {
    name: 'Priya Patel',
    email: 'priya@example.com',
    password: 'password123',
    role: 'both',
    bio: 'Fullstack developer passionate about UI/UX',
    location: 'Bengaluru, India',
    skillsToTeach: ['Node.js', 'React', 'MongoDB'],
    skillsToLearn: ['Python', 'Machine Learning'],
    availability: 'Weekday evenings',
  };

  const user2Data = {
    name: 'Rohan Mehta',
    email: 'rohan@example.com',
    password: 'password123',
    role: 'teacher',
    bio: 'Data scientist and Python instructor',
    location: 'Mumbai, India',
    skillsToTeach: ['Python', 'Pandas', 'Data Science'],
    skillsToLearn: ['Docker'],
    availability: 'Weekends only',
  };

  beforeEach(async () => {
    await User.deleteMany({});

    // Register User 1
    const reg1 = await request(app).post('/api/auth/register').send(user1Data);
    user1Token = reg1.body.token;
    user1Id = reg1.body.user.id || reg1.body.user._id;

    // Register User 2
    const reg2 = await request(app).post('/api/auth/register').send(user2Data);
    user2Token = reg2.body.token;
    user2Id = reg2.body.user.id || reg2.body.user._id;
  });

  describe('GET /api/users/me (View own profile)', () => {
    it('should retrieve the authenticated user own profile', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe(user1Data.name);
      expect(res.body.user.email).toBe(user1Data.email);
      expect(res.body.user.bio).toBe(user1Data.bio);
      expect(res.body.user.location).toBe(user1Data.location);
      expect(res.body.user.skillsToTeach).toEqual(expect.arrayContaining(['Node.js']));
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id (View another user public profile)', () => {
    it('should retrieve another user profile by valid ID without exposing password', async () => {
      const res = await request(app)
        .get(`/api/users/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe(user2Data.name);
      expect(res.body.user.bio).toBe(user2Data.bio);
      expect(res.body.user.skillsToTeach).toEqual(expect.arrayContaining(['Python']));
      expect(res.body.user.password).toBeUndefined();
    });

    it('should return 400 for malformed MongoDB ObjectId', async () => {
      const res = await request(app)
        .get('/api/users/not-a-valid-object-id')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid user ID format');
    });

    it('should return 404 for valid ObjectId that does not exist in database', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('User not found');
    });
  });

  describe('PUT /api/users/me (Update own profile)', () => {
    it('should update allowed fields successfully', async () => {
      const updates = {
        name: 'Priya K. Patel',
        bio: 'Senior Fullstack Engineer & Mentor',
        location: 'Hyderabad, India',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        role: 'teacher',
        skillsToTeach: ['Node.js', 'React', 'GraphQL', 'TypeScript'],
        skillsToLearn: ['Rust', 'WebAssembly'],
        availability: 'Weekends & Flexible',
      };

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Priya K. Patel');
      expect(res.body.user.bio).toBe('Senior Fullstack Engineer & Mentor');
      expect(res.body.user.location).toBe('Hyderabad, India');
      expect(res.body.user.avatar).toBe('https://images.unsplash.com/photo-1494790108377-be9c29b29330');
      expect(res.body.user.role).toBe('teacher');
      expect(res.body.user.skillsToTeach).toEqual(expect.arrayContaining(['GraphQL', 'TypeScript']));
      expect(res.body.user.skillsToLearn).toEqual(expect.arrayContaining(['Rust', 'WebAssembly']));
      expect(res.body.user.availability).toBe('Weekends & Flexible');
    });

    it('should normalize and deduplicate skill tags (trimming whitespace and case-insensitive deduping)', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          skillsToTeach: ['  React  ', 'react', 'REACT', 'JavaScript', '', '  '],
          skillsToLearn: ['  Flute ', 'flute', 'Tabla'],
        });

      expect(res.status).toBe(200);
      expect(res.body.user.skillsToTeach).toEqual(['React', 'JavaScript']);
      expect(res.body.user.skillsToLearn).toEqual(['Flute', 'Tabla']);
    });

    it('should ignore attempts to modify email and password via profile update', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Priya Updated',
          email: 'hacked-email@example.com',
          password: 'newhackedpassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Priya Updated');
      expect(res.body.user.email).toBe(user1Data.email); // Must NOT change!

      // Verify in DB that email was not changed
      const dbUser = await User.findById(user1Id).select('+password');
      expect(dbUser.email).toBe(user1Data.email);

      // Verify that old password still logs in successfully
      const loginOldRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user1Data.email, password: user1Data.password });
      expect(loginOldRes.status).toBe(200);

      // Verify that login with attempted new password fails
      const loginNewRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user1Data.email, password: 'newhackedpassword123' });
      expect(loginNewRes.status).toBe(401);
    });

    it('should reject invalid avatar URL', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ avatar: 'not-a-valid-url' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Avatar must be a valid URL');
    });

    it('should reject invalid role enum', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ role: 'superadmin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Role must be one of');
    });

    it('should reject empty name string', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated profile update', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .send({ name: 'Unauthorized Name' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/users (List all users)', () => {
    it('should return paginated list of users without passwords', async () => {
      const res = await request(app)
        .get('/api/users?page=1&limit=10&excludeMe=false')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users.length).toBe(2);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.users[0].password).toBeUndefined();
      expect(res.body.users[1].password).toBeUndefined();
    });
  });

});
