const mongoose = require('mongoose');
const Gig = require('../../models/gig.model.js');
const Category = require('../../models/category.model.js');
const {
  createGig,
  updateGig,
  deleteGig,
} = require('../../controllers/gig.controller.js');

jest.mock('../../models/gig.model.js');
jest.mock('../../models/category.model.js');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Gig Controller - Unit Tests', () => {
  afterEach(() => jest.clearAllMocks());

  // CREATE GIG
  describe('createGig', () => {
    it('should create gig and return 201', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const categoryId = '60f1a2b3c4d5e6f7a8b9c0d1';

      const req = {
        user: { _id: userId },
        body: {
          title: 'My awesome gig',
          description: 'Something',
          projectCategory: categoryId,
          budget: 1000,
          timeline: '7 days',
        },
      };

      const res = mockResponse();

      // Category exists
      Category.findById.mockResolvedValue({ _id: categoryId, name: 'Web Dev' });

      // Create a proper gig instance mock
      const populatedGig = {
        _id: 'newgig123',
        title: 'My awesome gig',
        description: 'Something',
        projectCategory: { name: 'Web Dev' },
        budget: 1000,
        timeline: '7 days',
        createdBy: { _id: userId, fullname: 'John Doe', email: 'john@test.com' },
        save: jest.fn().mockResolvedValue(),
      };

      const mockGigInstance = {
        ...req.body,
        createdBy: userId,
        _id: 'newgig123',
        save: jest.fn().mockResolvedValue(),
      };
      mockGigInstance.populate = jest.fn()
        .mockImplementationOnce(() => {
          mockGigInstance.projectCategory = { name: 'Web Dev' };
          return mockGigInstance;
        })
        .mockImplementationOnce(() => {
          mockGigInstance.createdBy = { fullname: 'John Doe', email: 'john@test.com' };
          return mockGigInstance;
        });

      Gig.mockImplementation(() => mockGigInstance);

      await createGig(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        gig: expect.objectContaining({
          title: 'My awesome gig',
          projectCategory: { name: 'Web Dev' },
          createdBy: { fullname: 'John Doe', email: 'john@test.com' },
        }),
      });
    });
  });

  // UPDATE GIG
  describe('updateGig', () => {
    it('should update gig if owner', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const gigId = '60a1b2c3d4e5f67890123456';

      const req = {
        params: { id: gigId },
        body: { timeline: '10 days' },
        user: { _id: userId },
      };

      const res = mockResponse();

      const existingGig = {
        _id: gigId,
        createdBy: userId,
        timeline: '5 days',
        toString: () => userId,
      };

      Gig.findById.mockResolvedValue(existingGig);

      // Create a proper mock query chain for findByIdAndUpdate
      const populatedDoc = {
        _id: gigId,
        timeline: '10 days',
        projectCategory: { name: 'Design' },
        createdBy: { fullname: 'John Doe', email: 'john@test.com' },
      };

      // Create a mock that properly chains populate calls
      const mockPopulate = jest.fn()
        .mockImplementation((field, select) => {
          return {
            populate: jest.fn().mockImplementation((field2, select2) => {
              return Promise.resolve(populatedDoc);
            })
          };
        });
      Gig.findByIdAndUpdate.mockImplementation(() => ({
        populate: mockPopulate
      }));

      await updateGig(req, res);

      expect(Gig.findByIdAndUpdate).toHaveBeenCalledWith(
        gigId,
        { timeline: '10 days' },
        { new: true, runValidators: true }
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        gig: populatedDoc
      });
    });

    it('should return 403 if not owner', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const otherUserId = '507f1f77bcf86cd799439012';
      const gigId = '60a1b2c3d4e5f67890123456';

      const req = {
        params: { id: gigId },
        body: { timeline: '10 days' },
        user: { _id: otherUserId, role: 'user' },
      };

      const res = mockResponse();

      const existingGig = {
        _id: gigId,
        createdBy: userId,
        timeline: '5 days',
        toString: () => userId,
      };

      Gig.findById.mockResolvedValue(existingGig);

      await updateGig(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden'
      });
    });
  });

  // DELETE GIG
  describe('deleteGig', () => {
    it('should delete gig if owner', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const gigId = '60a1b2c3d4e5f67890123456';

      const req = {
        params: { id: gigId },
        user: { _id: userId },
      };

      const res = mockResponse();

      const gigDoc = {
        _id: gigId,
        createdBy: userId,
        toString: () => userId,
        deleteOne: jest.fn().mockResolvedValue(),
      };

      Gig.findById.mockResolvedValue(gigDoc);

      await deleteGig(req, res);

      expect(gigDoc.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Gig deleted successfully',
      });
    });

    it('should return 403 if not owner', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const otherUserId = '507f1f77bcf86cd799439012';
      const gigId = '60a1b2c3d4e5f67890123456';

      const req = {
        params: { id: gigId },
        user: { _id: otherUserId, role: 'user' },
      };

      const res = mockResponse();

      const gigDoc = {
        _id: gigId,
        createdBy: userId,
        toString: () => userId,
      };

      Gig.findById.mockResolvedValue(gigDoc);

      await deleteGig(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden'
      });
    });
  });
});