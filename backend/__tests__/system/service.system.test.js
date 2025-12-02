const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');
const User = require('../../models/user.model');
const Category = require('../../models/category.model');
const jwt = require('jsonwebtoken');

describe('Service System Test', () => {
  jest.setTimeout(60000);

  let mongo, token, category, user;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret123';
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    // Create user
    user = await User.create({
      fullname: "Sys User",
      email: "sys@example.com",
      password: "password123",
      role: "user"
    });

    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // Create category only once
    category = await Category.create({ name: "Web" });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('creates, updates, fetches and deletes service', async () => {
    // CREATE
    const createRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: "System Service",
        description: "Test description",
        category: category._id,
        price: 50,
        deliveryTime: 5
      });

    expect(createRes.status).toBe(201);
    const id = createRes.body.service._id;

    // UPDATE
    const updateRes = await request(app)
      .put(`/api/services/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: "Updated System Service" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.service.title).toBe("Updated System Service");

    // FETCH
    const getRes = await request(app).get(`/api/services/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.service.title).toBe("Updated System Service");

    // DELETE
    const deleteRes = await request(app)
      .delete(`/api/services/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});
