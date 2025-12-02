const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');
const User = require('../../models/user.model');
const Category = require('../../models/category.model');
const Gig = require('../../models/gig.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

let mongoServer, token, user, category;

beforeAll(async () => {
  jest.setTimeout(30000); // Prevent timeout
  process.env.JWT_SECRET = 'testsecret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const hashed = await bcrypt.hash('password', 10);
  user = await User.create({ fullname: 'Int User', email: 'int@example.com', password: hashed, role: 'user' });
  token = jwt.sign({ user: { id: user._id } }, process.env.JWT_SECRET);

  category = await Category.create({ name: 'Integration Cat' });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Gig.deleteMany({});
});

describe('Gig routes (integration)', () => {
  it('POST /api/gigs - create gig', async () => {
    const res = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Valid Full Name',
        oauthEmail: 'a@b.com',
        country: 'PK',
        phone: '1234567890',
        projectCategory: category._id.toString(),
        description: 'This is a valid description with more than 20 characters for testing',
        budget: 50,
        timeline: '3 days'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/gigs returns list', async () => {
    await Gig.create({
      fullName: 'Valid User Name',
      oauthEmail: 'g@example.com',
      country: 'PK',
      phone: '1234567890',
      projectCategory: category._id,
      description: 'This description is long enough to pass validation rules in schema',
      budget: 100,
      timeline: '1 week',
      createdBy: user._id
    });

    const res = await request(app).get('/api/gigs');
    expect(res.status).toBe(200);
    expect(res.body.gigs).toHaveLength(1);
    expect(res.body.gigs[0].fullName).toBe('Valid User Name');
  });
});