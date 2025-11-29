const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app.js');
const User = require('../../models/user.model.js');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';

jest.setTimeout(30000);
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('Auth System Test (without custom route)', () => {
  it('registers and logs in a user, then accesses an existing protected route', async () => {
    // Register
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'System User',
      email: 'system@example.com',
      password: 'password123',
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);

    // Login
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'system@example.com',
      password: 'password123',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    const token = loginRes.body.token;
    expect(token).toBeDefined();

    // Access protected route (dummy route added for test)
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Updated Name');
  });

  it('fails access with no token', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it('fails access with invalid token', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', 'Bearer invalidtoken')
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token failed/i);
  });
});