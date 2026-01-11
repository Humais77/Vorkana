const cron = require('node-cron');
const SessionService = require('../services/session.service');
const Session = require('../models/session.model');

class SessionCleanup {
  constructor() {
    this.init();
  }

  init() {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('🔄 Running session cleanup job...');
        
        // Cleanup expired sessions
        const cleanedCount = await SessionService.cleanup();
        
        // Additional cleanup: Remove very old inactive sessions (30+ days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const oldSessions = await Session.deleteMany({
          isActive: false,
          logoutAt: { $lt: thirtyDaysAgo }
        });
        
        console.log(`✅ Cleanup complete: ${cleanedCount} expired sessions, ${oldSessions.deletedCount} old sessions`);
        
        // Log stats
        const totalSessions = await Session.countDocuments();
        const activeSessions = await Session.countDocuments({ isActive: true });
        
        console.log(`📊 Session stats: Total: ${totalSessions}, Active: ${activeSessions}`);
        
      } catch (error) {
        console.error('❌ Session cleanup error:', error);
      }
    });

    console.log('✅ Session cleanup cron job initialized');
  }

  // Manual cleanup trigger (for testing)
  async manualCleanup() {
    return await SessionService.cleanup();
  }
}

module.exports = new SessionCleanup();