jest.setTimeout(60000);

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');
const User = require('../../models/user.model');
const Category = require('../../models/category.model');

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Category.deleteMany({});
  await mongoose.connection.db.dropCollection('gigs').catch(() => {});
});

describe('Gig System Test', () => {
  it('registers, logs in, creates, updates, and deletes a gig', async () => {
    // Register
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Sys User',
      email: 'sys@gig.com',
      password: 'password123'
    });
    expect(reg.status).toBe(201);

    // Login
    const login = await request(app).post('/api/auth/login').send({
      email: 'sys@gig.com',
      password: 'password123'
    });
    expect(login.status).toBe(200);
    const token = login.body.token;

    // Create category
    const category = await Category.create({ name: 'Sys Cat' });

    // Create gig
    const createRes = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Sys Creator',
        oauthEmail: 'sys@gig.com',
        country: 'PK',
        phone: '1234567890',
        projectCategory: category._id.toString(),
        description: 'A valid detailed description for the gig that is long enough.',
        budget: 100,
        timeline: '3 days'
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.gig._id;

    // Update gig
    const updateRes = await request(app)
      .put(`/api/gigs/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ timeline: '5 days' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.gig.timeline).toBe('5 days');

    // Delete gig
    const del = await request(app)
      .delete(`/api/gigs/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
  });
});