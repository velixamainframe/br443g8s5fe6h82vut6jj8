#!/bin/bash
# ============================================================================
# Velixa CRM — Supabase Database Setup Script
# ============================================================================
# Run this script from your project root after setting up your .env file.
# Usage: chmod +x scripts/setup-supabase.sh && ./scripts/setup-supabase.sh
# ============================================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          VELIXA CRM — SUPABASE DATABASE SETUP                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ ERROR: .env file not found!"
    echo "   Create a .env file with your Supabase DATABASE_URL and JWT_SECRET."
    echo "   Example:"
    echo "     DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
    echo "     JWT_SECRET=your-super-secret-jwt-key-change-this"
    exit 1
fi

echo "✅ Found .env file"

# Check if prisma is installed
if ! command -v npx &> /dev/null && ! command -v bunx &> /dev/null; then
    echo "❌ ERROR: bun or npx not found!"
    echo "   Install Node.js and run: npm install -g prisma"
    exit 1
fi

echo "Step 1/4: Installing dependencies..."
bun install

echo "Step 2/4: Generating Prisma client..."
bunx prisma generate

echo "Step 3/4: Creating database migration..."
bunx prisma migrate dev --name init

echo "Step 4/4: Seeding database with admin user and demo data..."
bun run prisma/seed.ts

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          ✅ DATABASE SETUP COMPLETE!                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Your Supabase database is now ready."
echo ""
echo "Next steps:"
echo "  1. Test locally:  bun run dev"
echo "  2. Deploy to Vercel (see DEPLOYMENT_GUIDE.md)"
echo ""
