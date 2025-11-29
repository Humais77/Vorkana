const { validateCreate, validateUpdate } = require('../../middleware/validators/category.validator.js');

describe('Category Validator Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('validateCreate passes valid data', () => {
    req.body = { name: 'Design', description: 'test' };
    validateCreate(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('validateCreate rejects invalid name', () => {
    req.body = { name: 'A' };
    validateCreate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('validateUpdate accepts partial data', () => {
    req.body = { description: 'Updated desc' };
    validateUpdate(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
