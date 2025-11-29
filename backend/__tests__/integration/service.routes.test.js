const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app');
const User = require('../../models/user.model');
const Category = require('../../models/category.model');
const jwt = require('jsonwebtoken');

describe('Service Routes Integration Tests', () => {
    let mongo, token, user, category;
    jest.setTimeout(30000);

    beforeAll(async () => {
        process.env.JWT_SECRET = 'testsecret123';
        mongo = await MongoMemoryServer.create();
        await mongoose.connect(mongo.getUri());

        // In service.routes.test.js
        user = await User.create({
            fullname: "Test User",
            email: "test@example.com",
            password: "password123",
            role: "user"   // ADD THIS LINE
        });

        category = await Category.create({ name: "Design" });

        token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    },30000);

    afterAll(async () => {
        await mongoose.disconnect();
        await mongo.stop();
    });

    it('should create a service', async () => {
        const res = await request(app)
            .post('/api/services')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: "Logo Design",
                description: "Amazing logo",
                category: category._id,
                price: 20,
                deliveryTime: 2
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.service.title).toBe("Logo Design");
    });

    it('should fetch all services', async () => {
        const res = await request(app).get('/api/services');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.services)).toBe(true);
    });
});