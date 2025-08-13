#!/usr/bin/env bun
import knex from 'knex';
import config from '../src/knexfile';

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment];

const db = knex(knexConfig);

async function setupDatabase() {
  try {
    console.log('🔄 Running database migrations...');
    const [batchNo, log] = await db.migrate.latest();
    
    if (log.length === 0) {
      console.log('✅ Database is already up to date');
    } else {
      console.log(`✅ Batch ${batchNo} run: ${log.length} migrations`);
      log.forEach(migration => console.log(`  - ${migration}`));
    }

    // Check if database is empty (no schools exist)
    const schoolCount = await db('schools').count('* as count').first();
    const hasData = parseInt(schoolCount?.count as string) > 0;

    if (!hasData) {
      console.log('🌱 Database is empty, running initial seeds...');
      const seedFiles = await db.seed.run();
      console.log(`✅ Ran ${seedFiles[0].length} seed files`);
      seedFiles[0].forEach(file => console.log(`  - ${file}`));
    } else {
      console.log('📊 Database already has data, skipping seeds');
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

setupDatabase(); 