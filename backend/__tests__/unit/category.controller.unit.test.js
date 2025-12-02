const mongoose = require('mongoose');
const Category = require('../../models/category.model');
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} = require('../../controllers/category.controller');

jest.mock('../../models/category.model');

describe('Category Controller Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { params: {}, body: {}, user: { _id: '123', role: 'admin' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // --------------------- CREATE ---------------------
  describe('createCategory', () => {
    it('creates category successfully', async () => {
      req.body = { name: 'Design', description: 'UI/UX' };
      Category.create.mockResolvedValue({ name: 'Design' });

      await createCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('fails on duplicate name', async () => {
      req.body = { name: 'Design' };
      Category.create.mockRejectedValue({ code: 11000 });

      await createCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Category with that name already exists'
      });
    });

    it('returns 403 for non-admin', async () => {
      req.user.role = 'user';
      await createCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Forbidden' }));
    });
  });

  // --------------------- GET ALL ---------------------
  describe('getCategories', () => {
    it('returns active categories', async () => {
      Category.find.mockReturnValue({ lean: () => ({ sort: () => ['cat'] }) });

      await getCategories(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true, categories: ['cat'] });
    });
  });

  // --------------------- GET BY ID ---------------------
  describe('getCategoryById', () => {
    it('returns 400 invalid id', async () => {
      req.params.id = 'invalid';

      await getCategoryById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('returns 404 not found', async () => {
      req.params.id = new mongoose.Types.ObjectId().toString();
      Category.findOne.mockResolvedValue(null);

      await getCategoryById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  // --------------------- UPDATE ---------------------
  describe('updateCategory', () => {
    it('updates successfully as admin', async () => {
      const now = new mongoose.Types.ObjectId();
      req.params.id = now;

      const mockCategory = {
        _id: now,
        isActive: true,
        save: jest.fn(),
      };

      Category.findById.mockResolvedValue(mockCategory);

      req.body = { name: 'Updated' };
      await updateCategory(req, res, next);

      expect(mockCategory.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 403 when user is not admin', async () => {
      req.params.id = new mongoose.Types.ObjectId().toString();
      req.user.role = 'user'; // non-admin

      await updateCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Forbidden' }));
    });

    it('returns 404 when category not found', async () => {
      req.params.id = new mongoose.Types.ObjectId().toString();
      Category.findById.mockResolvedValue(null);

      await updateCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  // --------------------- DELETE ---------------------
  describe('deleteCategory', () => {
    it('soft deletes successfully as admin', async () => {
      const mockCategory = {
        isActive: true,
        save: jest.fn()
      };

      Category.findById.mockResolvedValue(mockCategory);
      req.params.id = new mongoose.Types.ObjectId().toString();

      await deleteCategory(req, res, next);

      expect(mockCategory.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Category deleted'
      });
    });

    it('returns 403 for non-admin', async () => {
      req.user.role = 'user';
      req.params.id = new mongoose.Types.ObjectId().toString();

      await deleteCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Forbidden' }));
    });

    it('returns 404 when category not found', async () => {
      req.user.role = 'admin';
      Category.findById.mockResolvedValue(null);
      req.params.id = new mongoose.Types.ObjectId().toString();

      await deleteCategory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });
});
