const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/user.model.js');
const { protect, adminOnly } = require('../../middleware/auth.middleware');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';

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

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('protect', () => {
    it('should return 401 if no token', async () => {
      await protect(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token provided' });
    });

    it('should return 401 if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalidtoken';
      await protect(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, token failed' });
    });

    it('should attach user to req if token is valid', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
      });

      const token = jwt.sign(
        { user: { id: user._id } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      await protect(req, res, next);

      expect(req.user._id.toString()).toBe(user._id.toString());
      expect(next).toHaveBeenCalled();
    });
  });

  describe('adminOnly', () => {
    it('should return 403 if user is not admin', () => {
      req.user = { role: 'user' };
      adminOnly(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized as an admin' });
    });

    it('should call next if user is admin', () => {
      req.user = { role: 'admin' };
      adminOnly(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});