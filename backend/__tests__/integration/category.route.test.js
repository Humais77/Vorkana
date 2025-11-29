const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');
const Category = require('../../models/category.model');
const User = require('../../models/user.model');
const jwt = require('jsonwebtoken');

describe('Category Route Integration Tests', () => {
  let mongo, token, admin;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri);

    admin = await User.create({
      name: 'Admin',
      email: 'admin@test.com',
      password: 'hashed',
      role: 'admin'
    });

    token = jwt.sign({ user: { id: admin._id } }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();
  });

  it('creates category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Graphics', description: 'design' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('gets categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('updates category', async () => {
    const category = await Category.create({ name: 'DevOps' });

    const res = await request(app)
      .put(`/api/categories/${category._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'DevOps Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('soft deletes category', async () => {
    const category = await Category.create({ name: 'ToDelete' });

    const res = await request(app)
      .delete(`/api/categories/${category._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await Category.findById(category._id);
    expect(updated.isActive).toBe(false);
  });
});
