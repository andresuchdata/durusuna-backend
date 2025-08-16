#!/usr/bin/env bun

/**
 * Setup script for FCM topics and parent-student relationships
 * This script should be run after deploying the new notification system
 * 
 * Usage:
 *   bun scripts/setup-fcm-topics.ts [--dry-run] [--sync-topics] [--create-sample-relationships]
 */

import { Knex } from 'knex';
import db from '../src/shared/database/connection';
import { FCMTopicSubscriptionService } from '../src/services/fcmTopicSubscriptionService';
import { v4 as uuidv4 } from 'uuid';
import logger from '../src/shared/utils/logger';

interface SetupOptions {
  dryRun: boolean;
  syncTopics: boolean;
  createSampleRelationships: boolean;
}

class FCMTopicSetup {
  private fcmSubscriptionService: FCMTopicSubscriptionService;

  constructor(private db: Knex) {
    this.fcmSubscriptionService = new FCMTopicSubscriptionService(db);
  }

  /**
   * Main setup function
   */
  async setup(options: SetupOptions): Promise<void> {
    logger.info('🚀 Starting FCM Topic Setup...');
    logger.info(`Options: ${JSON.stringify(options, null, 2)}`);

    try {
      // Step 1: Run migrations if not already done
      await this.checkMigrations();

      // Step 2: Create sample parent-student relationships (if requested)
      if (options.createSampleRelationships) {
        await this.createSampleParentStudentRelationships(options.dryRun);
      }

      // Step 3: Sync FCM topic subscriptions for all users
      if (options.syncTopics) {
        await this.syncFCMTopicSubscriptions(options.dryRun);
      }

      // Step 4: Show statistics
      await this.showStatistics();

      logger.info('✅ FCM Topic Setup completed successfully!');
    } catch (error) {
      logger.error('❌ FCM Topic Setup failed:', error);
      throw error;
    }
  }

  /**
   * Check if required migrations have been run
   */
  private async checkMigrations(): Promise<void> {
    logger.info('📋 Checking migrations...');

    const requiredTables = [
      'parent_student_relationships',
      'fcm_topic_subscriptions'
    ];

    for (const table of requiredTables) {
      const exists = await this.db.schema.hasTable(table);
      if (!exists) {
        throw new Error(`Required table '${table}' does not exist. Please run migrations first.`);
      }
    }

    // Check if FCM token column exists in users table
    const hasToken = await this.db.schema.hasColumn('users', 'fcm_token');
    if (!hasToken) {
      throw new Error('FCM token column does not exist in users table. Please run migration 027_add_fcm_token_to_users.js');
    }

    logger.info('✅ All required migrations are in place');
  }

  /**
   * Create sample parent-student relationships for demo/testing
   */
  private async createSampleParentStudentRelationships(dryRun: boolean): Promise<void> {
    logger.info('👪 Creating sample parent-student relationships...');

    // Get some sample students and parents
    const students = await this.db('users')
      .where('user_type', 'student')
      .where('is_active', true)
      .limit(5)
      .select('id', 'first_name', 'last_name', 'email');

    const parents = await this.db('users')
      .where('user_type', 'parent')
      .where('is_active', true)
      .limit(3)
      .select('id', 'first_name', 'last_name', 'email');

    if (students.length === 0 || parents.length === 0) {
      logger.warn('No students or parents found in the system. Skipping sample relationship creation.');
      return;
    }

    const relationships = [];
    
    // Create relationships: assign first parent to first 2 students, second parent to next 2, etc.
    for (let i = 0; i < students.length; i++) {
      const parentIndex = Math.floor(i / 2) % parents.length;
      const student = students[i];
      const parent = parents[parentIndex];

      relationships.push({
        id: uuidv4(),
        parent_id: parent.id,
        student_id: student.id,
        relationship_type: 'parent',
        can_receive_notifications: true,
        can_view_grades: true,
        can_view_attendance: true,
        is_primary_contact: i % 2 === 0, // Every other relationship is primary
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      logger.info(`  📝 ${parent.first_name} ${parent.last_name} -> ${student.first_name} ${student.last_name}`);
    }

    if (!dryRun) {
      await this.db('parent_student_relationships')
        .insert(relationships)
        .onConflict(['parent_id', 'student_id'])
        .ignore();
      
      logger.info(`✅ Created ${relationships.length} parent-student relationships`);
    } else {
      logger.info(`🔍 [DRY RUN] Would create ${relationships.length} parent-student relationships`);
    }
  }

  /**
   * Sync FCM topic subscriptions for all users
   */
  private async syncFCMTopicSubscriptions(dryRun: boolean): Promise<void> {
    logger.info('🔔 Syncing FCM topic subscriptions...');

    if (dryRun) {
      const usersWithTokens = await this.db('users')
        .where('is_active', true)
        .whereNotNull('fcm_token')
        .count('id as count')
        .first();

      logger.info(`🔍 [DRY RUN] Would sync subscriptions for ${usersWithTokens?.count || 0} users with FCM tokens`);
      return;
    }

    try {
      await this.fcmSubscriptionService.syncAllUserSubscriptions();
      logger.info('✅ FCM topic subscriptions synced successfully');
    } catch (error) {
      logger.error('❌ Failed to sync FCM topic subscriptions:', error);
      throw error;
    }
  }

  /**
   * Show current system statistics
   */
  private async showStatistics(): Promise<void> {
    logger.info('📊 System Statistics:');

    const [
      totalUsers,
      usersWithTokens,
      totalClasses,
      parentStudentRelationships,
      topicSubscriptions
    ] = await Promise.all([
      this.db('users').where('is_active', true).count('id as count').first(),
      this.db('users').where('is_active', true).whereNotNull('fcm_token').count('id as count').first(),
      this.db('classes').where('is_active', true).count('id as count').first(),
      this.db('parent_student_relationships').where('is_active', true).count('id as count').first(),
      this.db('fcm_topic_subscriptions').where('is_subscribed', true).count('id as count').first()
    ]);

    console.log(`
  👥 Total active users: ${totalUsers?.count || 0}
  🔔 Users with FCM tokens: ${usersWithTokens?.count || 0}
  🏫 Total active classes: ${totalClasses?.count || 0}
  👪 Parent-student relationships: ${parentStudentRelationships?.count || 0}
  📱 Active topic subscriptions: ${topicSubscriptions?.count || 0}
    `);

    // Show breakdown by user type
    const usersByType = await this.db('users')
      .where('is_active', true)
      .groupBy('user_type')
      .select('user_type')
      .count('id as count');

    console.log('  User breakdown:');
    for (const type of usersByType) {
      console.log(`    ${type.user_type}: ${type.count}`);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  
  const options: SetupOptions = {
    dryRun: args.includes('--dry-run'),
    syncTopics: args.includes('--sync-topics'),
    createSampleRelationships: args.includes('--create-sample-relationships')
  };

  // Default behavior if no specific flags are provided
  if (!options.syncTopics && !options.createSampleRelationships) {
    options.syncTopics = true;
    options.createSampleRelationships = true;
  }

  const setup = new FCMTopicSetup(db);
  
  try {
    await setup.setup(options);
  } catch (error) {
    logger.error('Setup failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
