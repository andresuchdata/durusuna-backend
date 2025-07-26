#!/bin/sh

set -e

echo "🚀 Starting Durusuna Backend (Production)"

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until bun -e "
import db from './src/config/database.ts'; 
db.raw('SELECT 1').then(() => { 
  console.log('✅ Database ready'); 
  process.exit(0); 
}).catch(() => { 
  console.log('❌ Database not ready, retrying...'); 
  process.exit(1); 
});" 2>/dev/null; do
  echo "⏳ Database not ready, waiting 5 seconds..."
  sleep 5
done

# Run database migrations
echo "🔄 Running database migrations..."
if ! bun scripts/migrate.ts migrate; then
  echo "❌ Migration failed, exiting..."
  exit 1
fi

echo "✅ Migrations completed successfully"

# Start the server
echo "🚀 Starting server..."
exec bun src/server.ts 