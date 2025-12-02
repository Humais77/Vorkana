const mongoose = require('mongoose');
const Gig = require('../../models/gig.model');
const { creatorOrAdmin } = require('../../middleware/gig.middleware');

jest.mock('../../models/gig.model');

describe('creatorOrAdmin middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: { id: '60f6f1f1f1f1f1f1f1f1f1f1' }, user: { _id: 'user1', role: 'user' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('returns 400 for invalid ObjectId', async () => {
    req.params.id = 'bad';
    await creatorOrAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid Gig ID' });
  });

  it('returns 404 when gig not found', async () => {
    Gig.findById.mockResolvedValue(null);
    await creatorOrAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when not creator or admin', async () => {
    Gig.findById.mockResolvedValue({ createdBy: 'otherUser' });
    await creatorOrAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('attaches gig and calls next for creator', async () => {
    const gig = { _id: 'gid', createdBy: 'user1' };
    Gig.findById.mockResolvedValue(gig);
    await creatorOrAdmin(req, res, next);
    expect(req.gig).toBe(gig);
    expect(next).toHaveBeenCalled();
  });

  it('allows admin', async () => {
    req.user.role = 'admin';
    Gig.findById.mockResolvedValue({ createdBy: 'other' });
    await creatorOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
