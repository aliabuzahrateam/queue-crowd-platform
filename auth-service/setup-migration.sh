#!/bin/bash

# Auth Service Database Migration Setup Script
# This script sets up the database and migrates data for the auth service

set -e

echo "🚀 Starting Auth Service Database Migration Setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   You can install it from: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating .env.example..."
    echo "Please copy .env.example to .env and update the DATABASE_URL"
    echo "DATABASE_URL=\"postgresql://username:password@localhost:5432/queue_crowd_db\""
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Push schema to database
echo "🗄️  Pushing schema to database..."
npm run db:push

# Seed the database
echo "🌱 Seeding database with initial data..."
npm run db:seed

echo "✅ Database migration completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - Dependencies installed"
echo "   - Prisma client generated"
echo "   - Database schema pushed"
echo "   - Initial data seeded"
echo ""
echo "🔑 Test users created:"
echo "   - Admin: admin@queuecrowd.com / admin123"
echo "   - Test User: test@queuecrowd.com / test123"
echo "   - Staff: staff@queuecrowd.com / staff123"
echo ""
echo "🎉 Auth service is ready to use!" 