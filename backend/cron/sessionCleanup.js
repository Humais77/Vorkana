const cron = require('node-cron');
const SessionService = require('../services/session.service');
const Session = require('../models/session.model');

class SessionCleanup {
  constructor() {
    this.init();
  }

  init() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('🔄 Running session cleanup job...');
        
        const now = new Date();
        
        // 1. Logout expired sessions (expiresAt < now)
        const expiredSessions = await Session.updateMany(
          {
            expiresAt: { $lt: now },
            isActive: true
          },
          {
            $set: {
              isActive: false,
              logoutAt: now,
              logoutReason: 'expired'
            }
          }
        );
        
        // 2. Logout idle sessions (lastActivity > 3 hours for users, 1 hour for admins)
        const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        // Find admin users
        const adminUsers = await User.find({ role: 'admin' }).select('_id');
        const adminUserIds = adminUsers.map(user => user._id);
        
        // Logout idle user sessions
        const idleUserSessions = await Session.updateMany(
          {
            userId: { $nin: adminUserIds },
            lastActivity: { $lt: threeHoursAgo },
            isActive: true
          },
          {
            $set: {
              isActive: false,
              logoutAt: now,
              logoutReason: 'idle'
            }
          }
        );
        
        // Logout idle admin sessions
        const idleAdminSessions = await Session.updateMany(
          {
            userId: { $in: adminUserIds },
            lastActivity: { $lt: oneHourAgo },
            isActive: true
          },
          {
            $set: {
              isActive: false,
              logoutAt: now,
              logoutReason: 'idle'
            }
          }
        );
        
        // 3. Delete very old inactive sessions (older than 7 days)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oldSessions = await Session.deleteMany({
          isActive: false,
          logoutAt: { $lt: sevenDaysAgo }
        });
        
        // Log cleanup results
        if (expiredSessions.modifiedCount > 0 || idleUserSessions.modifiedCount > 0 || 
            idleAdminSessions.modifiedCount > 0 || oldSessions.deletedCount > 0) {
          console.log(`✅ Cleanup complete:`, {
            expired: expiredSessions.modifiedCount,
            idleUsers: idleUserSessions.modifiedCount,
            idleAdmins: idleAdminSessions.modifiedCount,
            oldDeleted: oldSessions.deletedCount
          });
        }
        
        // Log stats
        const totalSessions = await Session.countDocuments();
        const activeSessions = await Session.countDocuments({ isActive: true });
        
        console.log(`📊 Session stats: Total: ${totalSessions}, Active: ${activeSessions}`);
        
      } catch (error) {
        console.error('❌ Session cleanup error:', error);
      }
    });

    console.log('✅ Enhanced session cleanup cron job initialized');
  }
}

module.exports = new SessionCleanup();