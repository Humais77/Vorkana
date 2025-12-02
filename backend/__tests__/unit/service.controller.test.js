// backend/__tests__/unit/service.controller.test.js

const mongoose = require('mongoose');
const Service = require('../../models/services.model.js');
const Category = require('../../models/category.model.js');
const {
  createService,
  updateService,
  deleteService,
} = require('../../controllers/services.controller.js');

jest.mock('../../models/services.model');
jest.mock('../../models/category.model');

describe('Service Controller - Unit Tests', () => {
  let req, res, next;
  const validId = new mongoose.Types.ObjectId().toHexString();
  const validCategoryId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    req = { body: {}, params: {}, user: { _id: new mongoose.Types.ObjectId().toHexString(), role: 'user' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should create a service successfully', async () => {
    Category.findById.mockResolvedValue({ _id: validCategoryId });
    Service.create.mockResolvedValue({
      _id: validId,
      title: 'Test Service',
      category: validCategoryId,
      createdBy: req.user._id,
    });

    req.body = {
      title: 'Test Service',
      description: 'desc',
      category: validCategoryId,
      price: 50,
      deliveryTime: 5,
    };

    await createService(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should update service successfully', async () => {
    const fakeService = {
      _id: validId,
      title: 'Old Title',
      createdBy: req.user._id,
      category: validCategoryId,
      save: jest.fn().mockResolvedValue({}),
    };

    // Mock the first findById (controller update)
    Service.findById
      .mockResolvedValueOnce(fakeService) // fetch before update
      .mockReturnValueOnce({              // populate after save
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            ...fakeService,
            title: 'Updated Title',
            category: { _id: validCategoryId, name: 'Web' },
            createdBy: { _id: req.user._id, fullname: 'Sys User', email: 'sys@example.com' },
          }),
        }),
      });

    req.params.id = validId;
    req.body = { title: 'Updated Title' };

    await updateService(req, res, next);

    expect(fakeService.save).toHaveBeenCalled();
    expect(fakeService.title).toBe('Updated Title');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      service: expect.objectContaining({
        _id: validId,
        title: 'Updated Title',
        category: { _id: validCategoryId, name: 'Web' },
        createdBy: { _id: req.user._id, fullname: 'Sys User', email: 'sys@example.com' },
      }),
    });
  });

  it('should prevent unauthorized update', async () => {
    Service.findById.mockResolvedValue({
      _id: validId,
      createdBy: 'otherUser',
      isActive: true,
    });

    req.params.id = validId;
    req.user._id = 'hacker';

    await updateService(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should delete a service successfully', async () => {
    const svc = {
      _id: validId,
      createdBy: req.user._id,
      isActive: true,
      save: jest.fn().mockResolvedValue({}),
    };

    Service.findById.mockResolvedValue(svc);
    req.params.id = validId;

    await deleteService(req, res, next);

    expect(svc.isActive).toBe(false);
    expect(svc.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Service deleted',
    });
  });

  it('should prevent unauthorized delete', async () => {
    Service.findById.mockResolvedValue({
      _id: validId,
      createdBy: 'otherUser',
      isActive: true,
    });

    req.params.id = validId;
    req.user._id = 'hacker';

    await deleteService(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
