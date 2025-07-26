import knex from 'knex';
import knexConfig from '../../knexfile';
import logger from '../utils/logger';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

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