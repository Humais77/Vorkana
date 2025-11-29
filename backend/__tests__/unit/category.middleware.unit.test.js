const { adminOnly } = require('../../middleware/auth.middleware');

describe('Category Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {}; 
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('adminOnly allows admin', () => {
    req.user = { role: 'admin' };
    adminOnly(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('adminOnly rejects non-admin', () => {
    req.user = { role: 'user' };
    adminOnly(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
