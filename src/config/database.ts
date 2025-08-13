import knex from 'knex';
import knexConfig from '../knexfile';
import logger from '../shared/utils/logger';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

if (!config) {
  throw new Error(`Database configuration not found for environment: ${environment}`);
}

const db = knex(config);

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    logger.info('Database connected successfully');
  })
  .catch((err) => {
    logger.error('Database connection failed:', err);
    process.exit(1);
  });

export default db; 