const request = require('supertest');
const app = require('../src/app');

describe('Stage 1 - API Health & Welcome Endpoints', () => {
  it('GET /api should return API name and version', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('SkillBridge API');
    expect(res.body.version).toBe('1.0.0');
  });

  it('GET /api/health should report health and database connected state', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET /api/non-existent-route should return 404 with structured error', async () => {
    const res = await request(app).get('/api/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('API route not found');
  });

  it('POST with malformed JSON should return 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ invalid: json, ');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid JSON payload');
  });
});
