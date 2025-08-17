#!/usr/bin/env bun
import knex from 'knex';
import config from '../src/knexfile';

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment];

const db = knex(knexConfig);

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    const [batchNo, log] = await db.migrate.latest();
    
    if (log.length === 0) {
      console.log('✅ Database is already up to date');
    } else {
      console.log(`✅ Batch ${batchNo} run: ${log.length} migrations`);
      log.forEach(migration => console.log(`  - ${migration}`));
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

async function rollbackMigrations() {
  try {
    console.log('🔄 Rolling back database migrations...');
    const [batchNo, log] = await db.migrate.rollback(undefined, true); // rollback all
    
    if (log.length === 0) {
      console.log('ℹ️  No migrations to rollback');
    } else {
      console.log(`✅ Rolled back ${log.length} migrations`);
      log.forEach(migration => console.log(`  - ${migration}`));
    }
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

async function runSeeds() {
  try {
    console.log('🌱 Running database seeds...');
    const seedFiles = await db.seed.run();
    console.log(`✅ Ran ${seedFiles[0].length} seed files`);
    seedFiles[0].forEach(file => console.log(`  - ${file}`));
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

async function softReset() {
  try {
    console.log('🔄 Starting soft database reset (rollback + migrate + seed)...');
    
    // Rollback all migrations
    console.log('🔄 Rolling back all migrations...');
    await db.migrate.rollback(undefined, true);
    console.log('✅ All migrations rolled back');
    
    // Run fresh migrations
    console.log('🔄 Running fresh migrations...');
    const [batchNo, log] = await db.migrate.latest();
    console.log(`✅ Batch ${batchNo} run: ${log.length} migrations`);
    
    // Run seeds
    console.log('🌱 Running database seeds...');
    const seedFiles = await db.seed.run();
    console.log(`✅ Ran ${seedFiles[0].length} seed files`);
    
    console.log('\n🎉 Soft reset completed successfully!');
    
  } catch (error) {
    console.error('❌ Soft reset failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

const command = process.argv[2];

switch (command) {
  case 'migrate':
    runMigrations();
    break;
  case 'seed':
    runSeeds();
    break;
  case 'rollback':
    rollbackMigrations();
    break;
  case 'reset':
    softReset();
    break;
  default:
    console.log('Usage: bun scripts/migrate.ts [migrate|seed|rollback|reset]');
    process.exit(1);
} 