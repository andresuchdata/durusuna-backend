#!/usr/bin/env bun
import knex from 'knex';
import config from '../knexfile';

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment];

const db = knex(knexConfig);

async function resetDatabase() {
  try {
    console.log('🔥 FORCE RESETTING DATABASE...');
    console.log('⚠️  This will destroy ALL data and recreate the database');
    
    // Get all table names
    const tables = await db.raw(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    if (tables.rows.length > 0) {
      console.log(`🗑️  Dropping ${tables.rows.length} tables...`);
      
      // Drop all tables (including knex migration tables)
      for (const table of tables.rows) {
        const tableName = table.tablename;
        console.log(`  - Dropping ${tableName}`);
        await db.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      }
    }
    
    console.log('🔄 Running fresh migrations...');
    const [batchNo, log] = await db.migrate.latest();
    console.log(`✅ Batch ${batchNo} run: ${log.length} migrations`);
    log.forEach(migration => console.log(`  - ${migration}`));

    console.log('🌱 Running initial seeds...');
    const seedFiles = await db.seed.run();
    console.log(`✅ Ran ${seedFiles[0].length} seed files`);
    seedFiles[0].forEach(file => console.log(`  - ${file}`));

    console.log('🎉 Database reset completed successfully!');

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

resetDatabase(); 