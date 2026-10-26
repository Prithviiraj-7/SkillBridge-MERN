const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Stage 4 - Skill Discovery & Search', () => {
  let currentUserToken;
  let currentUserId;

  const seedUsers = [
    {
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      password: 'password123',
      role: 'both',
      bio: 'Fullstack developer mentoring students in React',
      location: 'Bengaluru, India',
      skillsToTeach: ['React', 'JavaScript', 'Node.js'],
      skillsToLearn: ['Flute', 'Classical Music'],
    },
    {
      name: 'Rohan Verma',
      email: 'rohan.verma@example.com',
      password: 'password123',
      role: 'teacher',
      bio: 'Python enthusiast & AI researcher',
      location: 'Bengaluru, India',
      skillsToTeach: ['Python', 'Machine Learning', 'TensorFlow'],
      skillsToLearn: ['React', 'Web Development'],
    },
    {
      name: 'Ananya Gupta',
      email: 'ananya.gupta@example.com',
      password: 'password123',
      role: 'learner',
      bio: 'College student eager to learn coding and public speaking',
      location: 'Delhi, India',
      skillsToTeach: ['Public Speaking', 'Debate'],
      skillsToLearn: ['Python', 'Data Structures'],
    },
    {
      name: 'Vikram Joshi',
      email: 'vikram.joshi@example.com',
      password: 'password123',
      role: 'both',
      bio: 'Carnatic and Hindustani classical flute instructor',
      location: 'Chennai, India',
      skillsToTeach: ['Classical Flute', 'Music Theory'],
      skillsToLearn: ['Guitar', 'Audio Production'],
    },
  ];

  beforeEach(async () => {
    await User.deleteMany({});

    // Register current user who performs discovery
    const currentRes = await request(app).post('/api/auth/register').send({
      name: 'Searching User',
      email: 'searcher@example.com',
      password: 'password123',
      role: 'both',
      location: 'Mumbai, India',
      skillsToTeach: ['React', 'TypeScript'],
      skillsToLearn: ['Python', 'Flute'],
    });
    currentUserToken = currentRes.body.token;
    currentUserId = currentRes.body.user.id || currentRes.body.user._id;

    // Register all seed users
    for (const u of seedUsers) {
      await request(app).post('/api/auth/register').send(u);
    }
  });

  describe('Discovery by skillsToTeach', () => {
    it('should find users teaching a skill with case-insensitive and partial matching', async () => {
      // Search "react" in lower case
      const res = await request(app)
        .get('/api/users?teach=react')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Priya Sharma');
      expect(res.body.users[0].skillsToTeach).toContain('React');
    });

    it('should find users with uppercase and partial skill query (e.g., FLUTE -> Classical Flute)', async () => {
      const res = await request(app)
        .get('/api/users?teach=FLUTE')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Vikram Joshi');
      expect(res.body.users[0].skillsToTeach).toContain('Classical Flute');
    });

    it('should support alias query parameter skillsToTeach', async () => {
      const res = await request(app)
        .get('/api/users?skillsToTeach=python')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Rohan Verma');
    });
  });

  describe('Discovery by skillsToLearn', () => {
    it('should find users who want to learn a particular skill', async () => {
      const res = await request(app)
        .get('/api/users?learn=python')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Ananya Gupta');
      expect(res.body.users[0].skillsToLearn).toContain('Python');
    });

    it('should support alias query parameter skillsToLearn', async () => {
      const res = await request(app)
        .get('/api/users?skillsToLearn=react')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Rohan Verma');
    });
  });

  describe('Combined Filters', () => {
    it('should combine teach and learn filters (perfect match for bilateral exchange)', async () => {
      // Find someone who teaches Python AND wants to learn React
      const res = await request(app)
        .get('/api/users?teach=Python&learn=React')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Rohan Verma');
    });

    it('should combine teach and location filter', async () => {
      // Find someone teaching Python in Bengaluru
      const res = await request(app)
        .get('/api/users?teach=Python&location=Bengaluru')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Rohan Verma');
    });

    it('should return empty list when combined filters do not match any single user', async () => {
      // Python teacher in Chennai (Rohan is in Bengaluru, Vikram is in Chennai but teaches Flute)
      const res = await request(app)
        .get('/api/users?teach=Python&location=Chennai')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.count).toBe(0);
      expect(res.body.users).toEqual([]);
    });

    it('should filter by role', async () => {
      const res = await request(app)
        .get('/api/users?role=learner')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Ananya Gupta');
      expect(res.body.users[0].role).toBe('learner');
    });
  });

  describe('Free-text Search across profile and skills', () => {
    it('should search across bio', async () => {
      const res = await request(app)
        .get('/api/users?search=mentoring')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Priya Sharma');
    });

    it('should search across names', async () => {
      const res = await request(app)
        .get('/api/users?search=Ananya')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Ananya Gupta');
    });
  });

  describe('Current User Exclusion & Inclusion', () => {
    it('should exclude the currently authenticated user from discovery results by default', async () => {
      // Searcher teaches React, Priya also teaches React
      const res = await request(app)
        .get('/api/users?teach=React')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users[0].name).toBe('Priya Sharma');
      // Verify searcher is not in results
      const searcherPresent = res.body.users.some(
        (u) => (u.id || u._id).toString() === currentUserId.toString()
      );
      expect(searcherPresent).toBe(false);
    });

    it('should include currently authenticated user if excludeMe=false is explicitly passed', async () => {
      const res = await request(app)
        .get('/api/users?teach=React&excludeMe=false')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      const userNames = res.body.users.map((u) => u.name);
      expect(userNames).toContain('Searching User');
      expect(userNames).toContain('Priya Sharma');
    });
  });

  describe('Pagination & Validation', () => {
    it('should paginate results correctly with total, page, and pages count', async () => {
      const res = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(2);
      expect(res.body.count).toBe(2);
      expect(res.body.total).toBe(4);
      expect(res.body.page).toBe(1);
      expect(res.body.pages).toBe(2);
    });

    it('should reject invalid page parameter with 400', async () => {
      const res = await request(app)
        .get('/api/users?page=0')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Page must be a positive integer');
    });

    it('should reject limit exceeding maximum allowable (50) with 400', async () => {
      const res = await request(app)
        .get('/api/users?limit=100')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Limit must be between 1 and 50');
    });

    it('should reject invalid role with 400', async () => {
      const res = await request(app)
        .get('/api/users?role=superadmin')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Role must be one of');
    });

    it('should never expose passwords or sensitive internal fields in discovery results', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${currentUserToken}`);

      expect(res.status).toBe(200);
      for (const u of res.body.users) {
        expect(u.password).toBeUndefined();
        expect(u.__v).toBeUndefined();
      }
    });
  });
});
