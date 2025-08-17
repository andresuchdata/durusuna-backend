#!/bin/bash

# Seed Reset Script for Durusuna Backend
# This script resets the database and applies all migrations and seeds

set -e  # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting database reset and seeding process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the durusuna-backend directory"
    exit 1
fi

# Load environment variables if .env exists
if [ -f ".env" ]; then
    echo "📄 Loading environment variables from .env"
    source .env
fi

echo "🔄 Step 1: Rolling back all migrations..."
bun run db:rollback:all

echo "🗃️ Step 2: Running all migrations..."
bun knex migrate:latest --knexfile src/knexfile.ts

echo "🌱 Step 3: Running all seeds..."
bun knex seed:run --knexfile src/knexfile.ts

echo "✅ Database reset and seeding completed successfully!"
echo ""
echo "📊 Summary:"
echo "   🏫 2 Schools: SDIT Darel Iman 1, SMP IT Darel Iman"
echo "   📚 12 Classes: 6 SDIT + 6 SMP classes" 
echo "   👥 90 Users: 2 admins + 8 teachers + 60 students + 20 parents"
echo "   👪 ~40 Parent-student relationships"
echo "   📖 21 Subjects: Islamic + General curriculum"
echo "   📝 60 Class updates: 5 per class (1 pinned each)"
echo "   💬 4 Conversations: 2 DM + 2 Groups with messages"
echo "   📅 Attendance: July 1 - Aug 15, 2025 (~32,000 records)"
echo ""
echo "🔐 Default login credentials:"
echo "   Admin SDIT: admin.sdit@dareliman.sch.id / pass123"
echo "   Admin SMP:  admin.smp@dareliman.sch.id / pass123"
echo "   Teachers:   [name]@[school].sch.id / pass123"
echo "   Students:   student.[school].[num]@dareliman.sch.id / pass123"
echo "   Parents:    [name].parent[num]@dareliman.sch.id / pass123"
echo ""
echo "🔔 All users have FCM tokens for notification testing"
echo "📱 Ready for mobile app integration!"
