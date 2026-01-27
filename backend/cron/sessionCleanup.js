const cron = require('node-cron');
const SessionService = require('../services/session.service');
const Session = require('../models/session.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

class SessionCleanup {
  constructor() {
    this.init();
    console.log('🔧 SessionCleanup initialized');
  }

  init() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.runCleanup();
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    console.log('✅ Session cleanup cron job initialized (every 5 minutes)');
  }

  async runCleanup() {
    try {
      console.log('🔄 Running enhanced session cleanup job...');
      
      const now = new Date();
      let totalDeleted = 0;
      
      // 1. FIRST: Fix sessions with invalid userId BEFORE cleaning
      console.log('1. Fixing sessions with invalid userId...');
      try {
        // Update sessions with empty string userId to null
        const fixResult = await Session.updateMany(
          { 
            $or: [
              { userId: "" },
              { userId: { $exists: false } }
            ]
          },
          { 
            $set: { userId: null },
            $unset: { userId: "" } // Remove empty string
          }
        );
        
        if (fixResult.modifiedCount > 0) {
          console.log(`   Fixed ${fixResult.modifiedCount} sessions with invalid userId`);
        }
      } catch (fixError) {
        console.warn('   Could not fix invalid userIds:', fixError.message);
      }
      
      // 2. Cleanup EXPIRED sessions (expiresAt < now)
      console.log('2. Cleaning up expired sessions...');
      try {
        const expiredResult = await Session.deleteMany({
          expiresAt: { $lt: now }
        });
        console.log(`   Deleted ${expiredResult.deletedCount} expired sessions`);
        totalDeleted += expiredResult.deletedCount;
      } catch (expiredError) {
        console.error('   Error deleting expired sessions:', expiredError.message);
      }
      
      // 3. Cleanup IDLE sessions (lastActivity > 3 hours)
      console.log('3. Cleaning up idle sessions...');
      try {
        const idleResult = await Session.deleteMany({
          lastActivity: { $lt: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
          isActive: true
        });
        console.log(`   Deleted ${idleResult.deletedCount} idle sessions`);
        totalDeleted += idleResult.deletedCount;
      } catch (idleError) {
        console.error('   Error deleting idle sessions:', idleError.message);
      }
      
      // 4. Cleanup OLD INACTIVE sessions (isActive: false, older than 1 day)
      console.log('4. Cleaning up old inactive sessions...');
      try {
        const inactiveResult = await Session.deleteMany({
          isActive: false,
          updatedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        });
        console.log(`   Deleted ${inactiveResult.deletedCount} old inactive sessions`);
        totalDeleted += inactiveResult.deletedCount;
      } catch (inactiveError) {
        console.error('   Error deleting inactive sessions:', inactiveError.message);
      }
      
      // 5. Cleanup ORPHANED sessions (userId: null or invalid)
      console.log('5. Cleaning up orphaned sessions...');
      try {
        // Get all valid user IDs
        const validUserIds = await User.find().distinct('_id');
        
        // Delete sessions where userId is not in valid users OR is null/empty
        const orphanedResult = await Session.deleteMany({
          $or: [
            { userId: { $exists: false } },
            { userId: null },
            { userId: { $nin: validUserIds } },
            { userId: "" }
          ]
        });
        console.log(`   Deleted ${orphanedResult.deletedCount} orphaned sessions`);
        totalDeleted += orphanedResult.deletedCount;
      } catch (orphanedError) {
        console.error('   Error deleting orphaned sessions:', orphanedError.message);
      }
      
      // 6. Cleanup sessions with missing required fields
      console.log('6. Cleaning up invalid sessions...');
      try {
        const invalidResult = await Session.deleteMany({
          $or: [
            { token: { $exists: false } },
            { token: null },
            { token: "" },
            { refreshToken: { $exists: false } },
            { refreshToken: null },
            { refreshToken: "" }
          ]
        });
        console.log(`   Deleted ${invalidResult.deletedCount} invalid sessions`);
        totalDeleted += invalidResult.deletedCount;
      } catch (invalidError) {
        console.error('   Error deleting invalid sessions:', invalidError.message);
      }
      
      // Log results
      console.log(`✅ Total sessions deleted in this run: ${totalDeleted}`);
      
      // Get updated stats
      await this.logSessionStats();
      
    } catch (error) {
      console.error('❌ Session cleanup error:', error.message);
      console.error('Error stack:', error.stack);
    }
  }

  async logSessionStats() {
    try {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      
      const stats = {
        total: await Session.countDocuments(),
        active: await Session.countDocuments({
          isActive: true,
          expiresAt: { $gt: now },
          lastActivity: { $gt: threeHoursAgo }
        }),
        expired: await Session.countDocuments({
          expiresAt: { $lt: now }
        }),
        idle: await Session.countDocuments({
          lastActivity: { $lt: threeHoursAgo },
          isActive: true
        }),
        inactive: await Session.countDocuments({
          isActive: false
        }),
        withInvalidUserId: await Session.countDocuments({
          $or: [
            { userId: { $exists: false } },
            { userId: null },
            { userId: "" }
          ]
        })
      };
      
      console.log('📊 Session stats:', {
        total: stats.total,
        active: stats.active,
        expired: stats.expired,
        idle: stats.idle,
        inactive: stats.inactive,
        invalidUserId: stats.withInvalidUserId
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting session stats:', error.message);
      return null;
    }
  }

  // Enhanced manual cleanup for testing
  async manualCleanup(force = false) {
    console.log('🔨 Running manual session cleanup...');
    
    try {
      const now = new Date();
      let totalDeleted = 0;
      
      if (force) {
        // FORCE MODE: Aggressive cleanup
        console.log('⚠️ FORCE MODE: Aggressive cleanup');
        
        // Delete all sessions older than 1 day
        const forceResult = await Session.deleteMany({
          $or: [
            { expiresAt: { $lt: now } },
            { 
              lastActivity: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
            },
            { userId: null },
            { userId: "" }
          ]
        });
        
        totalDeleted = forceResult.deletedCount;
        console.log(`✅ Force cleanup deleted ${totalDeleted} sessions`);
      } else {
        // Normal manual cleanup
        await this.runCleanup();
      }
      
      // Log detailed stats
      const stats = await this.logSessionStats();
      
      return {
        success: true,
        deletedCount: totalDeleted,
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Manual cleanup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Diagnostic function to find problematic sessions
  async diagnoseSessions() {
    console.log('🔍 Diagnosing session issues...');
    
    try {
      const now = new Date();
      
      const issues = {
        expiredSessions: await Session.find({
          expiresAt: { $lt: now }
        }).limit(10).lean(),
        
        idleSessions: await Session.find({
          lastActivity: { $lt: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
          isActive: true
        }).limit(10).lean(),
        
        invalidUserIdSessions: await Session.find({
          $or: [
            { userId: { $exists: false } },
            { userId: null },
            { userId: "" }
          ]
        }).limit(10).lean(),
        
        missingTokenSessions: await Session.find({
          $or: [
            { token: { $exists: false } },
            { token: null },
            { token: "" }
          ]
        }).limit(10).lean(),
        
        oldInactiveSessions: await Session.find({
          isActive: false,
          updatedAt: { $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        }).limit(10).lean()
      };
      
      console.log('📋 Session issues found:');
      console.log(`  - Expired: ${issues.expiredSessions.length}`);
      console.log(`  - Idle: ${issues.idleSessions.length}`);
      console.log(`  - Invalid userId: ${issues.invalidUserIdSessions.length}`);
      console.log(`  - Missing token: ${issues.missingTokenSessions.length}`);
      console.log(`  - Old inactive: ${issues.oldInactiveSessions.length}`);
      
      // Show sample of invalid userId sessions
      if (issues.invalidUserIdSessions.length > 0) {
        console.log('\n📝 Sample invalid userId sessions:');
        issues.invalidUserIdSessions.forEach((session, index) => {
          console.log(`  ${index + 1}. ID: ${session._id}, userId: "${session.userId}", createdAt: ${session.createdAt}`);
        });
      }
      
      return issues;
    } catch (error) {
      console.error('Diagnosis failed:', error);
      return null;
    }
  }
}

module.exports = new SessionCleanup();