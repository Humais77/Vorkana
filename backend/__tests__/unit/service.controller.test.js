const Service = require('../../models/services.model.js');
const Category = require('../../models/category.model.js');
const {
  createService,
  updateService,
  deleteService,
} = require('../../controllers/services.controller.js');

jest.mock('../../models/services.model.js');
jest.mock('../../models/category.model.js');

describe('Service Controller - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {}, user: { _id: 'user123', role: 'user' } };
    res = { 
      status: jest.fn().mockReturnThis(), 
      json: jest.fn() 
    };
    next = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  // CREATE
  it('should create a service successfully', async () => {
    Category.findById.mockResolvedValue({ _id: 'cat123' }); // Mock FIRST
    Service.create.mockResolvedValue({ _id: 'svc1', title: 'Test Service' });

    req.body = {
      title: "Test Service",
      description: "Desc",
      category: "cat123",
      price: 10,
      deliveryTime: 3,
    };

    await createService(req, res, next);

    expect(Category.findById).toHaveBeenCalledWith('cat123');
    expect(Service.create).toHaveBeenCalledWith(expect.objectContaining({
      title: "Test Service",
      category: "cat123",
      createdBy: "user123"
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      service: expect.any(Object)
    });
  });

  it('should fail if category does not exist', async () => {
    Category.findById.mockResolvedValue(null); // Mock first

    req.body = {
      title: "Test",
      category: "invalid",
      price: 10,
      deliveryTime: 3
    };

    await createService(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid category id"
    });
  });

  // UPDATE
  it('should update service successfully', async () => {
    const fakeService = {
      _id: "svc1",
      title: "Old",
      createdBy: "user123",
      save: jest.fn().mockResolvedValue(this),
    };

    Service.findById.mockResolvedValue(fakeService);
    Category.findById.mockResolvedValue({ _id: "cat123" });

    req.params.id = "svc1";
    req.body = { title: "Updated Title" };

    await updateService(req, res, next);

    expect(fakeService.save).toHaveBeenCalled();
    expect(fakeService.title).toBe("Updated Title");
  });

  it('should prevent unauthorized update', async () => {
    req.user._id = "hacker123";
    req.params.id = "svc1";

    Service.findById.mockResolvedValue({ createdBy: "user123" });

    await updateService(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  // DELETE
  it('should delete a service', async () => {
    const svc = {
      _id: "svc1",
      createdBy: "user123",
      deleteOne: jest.fn()
    };

    Service.findById.mockResolvedValue(svc);
    req.params.id = "svc1";

    await deleteService(req, res, next);

    expect(svc.deleteOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Service deleted"
    });
  });
});