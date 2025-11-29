const { validateCreate, validateUpdate } = require('../../middleware/validators/service.validator.js');

describe('Service Validator Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('should pass create validation', () => {
    req.body = {
      title: "Test",
      category: "507f1f77bcf86cd799439011"
    };
    validateCreate(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should fail invalid category', () => {
    req.body = { title: "Test", category: "bad" };
    validateCreate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should allow optional fields during update', () => {
    req.body = {};
    validateUpdate(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
