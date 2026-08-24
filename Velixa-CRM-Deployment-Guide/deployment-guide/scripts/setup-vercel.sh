#!/bin/bash
# ============================================================================
# Velixa CRM — Vercel Deployment Helper
# ============================================================================
# This script helps you deploy to Vercel using the Vercel CLI.
# Prerequisites: npm i -g vercel
# ============================================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          VELIXA CRM — VERCEL DEPLOYMENT HELPER                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

echo "✅ Vercel CLI found"
echo ""
echo "Step 1/3: Building the project..."
bun run build

echo ""
echo "Step 2/3: Deploying to Vercel..."
echo "   (Follow the prompts to link to your Vercel project)"
vercel --prod

echo ""
echo "Step 3/3: Setting up environment variables on Vercel..."
echo ""
echo "   Run these commands to set your environment variables:"
echo ""
echo '   vercel env add DATABASE_URL production'
echo '   vercel env add JWT_SECRET production'
echo ""
echo "   Paste the values when prompted."
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          ✅ DEPLOYMENT HELPER COMPLETE                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
