const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');

describe('Category System (E2E) Tests', () => {
  let mongo, token;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongo.stop();
  });

  it('full workflow', async () => {
    // 1. register admin
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'AdminUser',
        email: 'admin@sys.com',
        password: '123456',
        role: 'admin'
      });

    // 2. login
    const login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@sys.com',
        password: '123456'
      });

    token = login.body.token;

    // 3. create category
    const created = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'SystemTestCategory',
        description: 'System desc'
      });

    expect(created.status).toBe(201);

    const id = created.body.category._id;

    // 4. get category by id
    const byId = await request(app).get(`/api/categories/${id}`);
    expect(byId.status).toBe(200);

    // 5. update category
    const updated = await request(app)
      .put(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated System Category' });

    expect(updated.status).toBe(200);

    // 6. delete category
    const deleted = await request(app)
      .delete(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleted.status).toBe(200);
  });
});
