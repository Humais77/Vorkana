const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');
const User = require('../../models/user.model');
const Category = require('../../models/category.model');
const jwt = require('jsonwebtoken');

describe('Service System Test', () => {
  jest.setTimeout(60000);
  let mongo, token, category;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret123';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    // In service.system.test.js
    const user = await User.create({
      fullname: "Sys User",
      email: "sys@example.com",
      password: "password123",
      role: "user"   // ADD THIS LINE
    });

    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    category = await Category.create({ name: "Web" });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('creates, updates, fetches and deletes service', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: "System Service",
        category: category._id,
        price: 50,
        deliveryTime: 5
      });

    expect(createRes.status).toBe(201);
    const id = createRes.body.service._id;

    // Update
    await request(app)
      .put(`/api/services/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: "Updated System Service" })
      .expect(200);

    // Fetch
    const getRes = await request(app).get(`/api/services/${id}`);
    expect(getRes.body.service.title).toBe("Updated System Service");

    // Delete
    await request(app)
      .delete(`/api/services/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});