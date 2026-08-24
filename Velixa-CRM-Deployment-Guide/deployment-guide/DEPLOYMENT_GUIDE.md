# Velixa Capital CRM — Complete Deployment Guide

> **Version:** 1.0  
> **Last Updated:** June 2025  
> **Stack:** Next.js 16 · Prisma · Supabase (PostgreSQL) · Vercel  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Set Up Supabase Database](#3-step-1-set-up-supabase-database)
4. [Step 2: Configure the Project for Supabase](#4-step-2-configure-the-project-for-supabase)
5. [Step 3: Connect Website to CRM](#5-step-3-connect-website-to-crm)
6. [Step 4: Deploy to Vercel](#6-step-4-deploy-to-vercel)
7. [Step 5: Configure Custom Subdomain](#7-step-5-configure-custom-subdomain)
8. [Step 6: Post-Deployment Checklist](#8-step-6-post-deployment-checklist)
9. [Troubleshooting](#9-troubleshooting)
10. [Security Best Practices](#10-security-best-practices)
11. [Maintenance & Backups](#11-maintenance--backups)

---

## 1. Overview

The Velixa Capital CRM is a role-based lead management system with three user types:
- **Admin** — Full control, employee management, approvals, settings
- **Employee** — Lead management, follow-ups, conversions
- **Partner** — Submit leads, track status

### Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌───────────────┐
│  velixacapital.in   │────▶│  Vercel (CRM App)    │────▶│   Supabase    │
│  (Marketing Site)  │ API │  Next.js 16           │     │  PostgreSQL   │
└─────────────────────┘     └──────────────────────┘     └───────────────┘
                                   │
                            crm.velixacapital.in
```

---

## 2. Prerequisites

Create accounts on these platforms (all free tier available):

| Service | URL | Purpose |
|---------|-----|--------|
| **Supabase** | https://supabase.com | PostgreSQL database |
| **Vercel** | https://vercel.com | Hosting & deployment |
| **GitHub** | https://github.com | Code repository (needed for Vercel) |

### Install Tools Locally

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install Vercel CLI
npm i -g vercel

# Install Prisma CLI (comes with project, but good to have globally)
npm i -g prisma
```

---

## 3. Step 1: Set Up Supabase Database

### 3.1 Create a New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name:** `velixa-crm`
   - **Database Password:** Choose a **strong** password (save it!)
   - **Region:** Select closest to your users (e.g., `ap-south-1` Mumbai for India)
   - **Plan:** Free tier is fine to start
4. Click **"Create new project"** and wait 2-3 minutes

### 3.2 Get Your Database Connection String

1. In your Supabase project dashboard, go to **Settings → Database**
2. Scroll to **"Connection string"** section
3. Select **"URI"** tab
4. Copy the connection string — it looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. **Important:** Append these parameters to the URL:
   ```
   ?pgbouncer=true&connect_timeout=15
   ```
   
   Final URL should look like:
   ```
   postgresql://postgres.abc123:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15
   ```

### 3.3 Create the Database Schema

There are **two ways** to do this:

#### Option A: Using the Setup Script (Recommended)

1. Copy the production schema from `deployment-guide/prisma-supabase/schema.prisma` to replace your `prisma/schema.prisma`
2. Create/update your `.env` file:
   ```env
   DATABASE_URL="postgresql://postgres.abc123:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
   JWT_SECRET="your-super-secret-jwt-key-at-least-32-chars-long"
   ```
3. Run the setup script:
   ```bash
   chmod +x deployment-guide/scripts/setup-supabase.sh
   ./deployment-guide/scripts/setup-supabase.sh
   ```

#### Option B: Manual Steps

```bash
# 1. Replace schema (copy the postgres version)
cp deployment-guide/prisma-supabase/schema.prisma prisma/schema.prisma

# 2. Install dependencies
bun install

# 3. Generate Prisma client
bunx prisma generate

# 4. Push schema to Supabase (creates all tables)
bunx prisma db push

# 5. Seed the database with admin user
bun run prisma/seed.ts
```

### 3.4 Verify the Database

1. Go to **Supabase Dashboard → Table Editor**
2. You should see these tables: User, Partner, Setting, Lead, WebsiteLead, Note, FollowUp, ActivityLog, LeadTransfer, InternalRequest
3. Check the **User** table — you should see the admin user created by the seed
4. Go to **SQL Editor** and run a test query:
   ```sql
   SELECT email, name, role FROM "User";
   ```

### 3.5 (Optional) Disable Public API on Supabase

For security, go to:
- **Settings → API** → Set "API URL" to restrict if needed
- **Authentication → Providers** → Disable all providers (CRM uses its own JWT auth, not Supabase Auth)
- **Database → Extensions** → Disable `pg_stat_statements` if not needed

---

## 4. Step 2: Configure the Project for Supabase

### 4.1 Update `.env` File

Create a `.env` file in the project root:

```env
# Supabase PostgreSQL connection
DATABASE_URL="postgresql://postgres.abc123:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"

# JWT secret for CRM authentication (CHANGE THIS!)
JWT_SECRET="velixa-crm-production-secret-change-this-to-something-random-and-long"
```

### 4.2 Update `next.config.ts`

Make sure `output: 'standalone'` is set (for Vercel). Open `next.config.ts` and verify:

```typescript
const nextConfig = {
  output: 'standalone',
  // ... rest of config
}
```

### 4.3 Test Locally Against Supabase

```bash
# Start development server
bun run dev

# Open http://localhost:3000
# Login with the admin credentials from seed.ts
```

---

## 5. Step 3: Connect Website to CRM

The CRM has a built-in **Website Leads** feature that can receive leads from your marketing website (velixacapital.in).

### 5.1 How It Works

```
velixacapital.in (Contact Form)
    │
    ▼ POST request
CRM API: /api/website-leads
    │
    ▼
Stored in WebsiteLead table
    │
    ▼ Admin clicks "Sync"
Imported into Universal Lead Box
```

### 5.2 Website Integration Code

Add this to your marketing website's contact/enquiry form handler (PHP, Node.js, or any backend):

```javascript
// Example: Submit a lead from your website to the CRM
async function submitToCRM(formData) {
  const response = await fetch('https://crm.velixacapital.in/api/website-leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-crm-secret': 'YOUR_WEBSITE_SECRET_KEY', // Set in CRM Settings
    },
    body: JSON.stringify({
      source: 'ENQUIRY_FORM',     // ENQUIRY_FORM | CHATBOT | CALLBACK_REQUEST | CONTACT_FORM
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cibilScore: formData.cibilScore,
      loanAmount: formData.loanAmount,
      loanType: formData.loanType,         // e.g. "Home Loan", "Personal Loan"
      employmentType: formData.employmentType,
      monthlyIncome: formData.monthlyIncome,
      city: formData.city,
      state: formData.state,
      message: formData.message,
      isUrgent: false,
      websiteUrl: window.location.href,
    }),
  });

  if (response.ok) {
    // Lead received by CRM
  } else {
    // Handle error
  }
}
```

### 5.3 For WordPress Sites

If your website is WordPress, use this in your `functions.php` or a custom plugin:

```php
add_action('wpcf7_mail_sent', 'send_to_velixa_crm');

function send_to_velixa_crm($contact_form) {
    $submission = WPCF7_Submission::get_instance();
    if (!$submission) return;

    $data = $submission->get_posted_data();

    wp_remote_post('https://crm.velixacapital.in/api/website-leads', [
        'method' => 'POST',
        'headers' => [
            'Content-Type' => 'application/json',
            'x-crm-secret' => 'YOUR_WEBSITE_SECRET_KEY',
        ],
        'body' => json_encode([
            'source' => 'CONTACT_FORM',
            'name' => $data['your-name'] ?? '',
            'email' => $data['your-email'] ?? '',
            'phone' => $data['phone'] ?? '',
            'loanType' => $data['loan-type'] ?? '',
            'loanAmount' => $data['loan-amount'] ?? '',
            'city' => $data['city'] ?? '',
            'state' => $data['state'] ?? '',
            'message' => $data['your-message'] ?? '',
        ]),
        'timeout' => 10,
    ]);
}
```

### 5.4 For React/Next.js Websites

```typescript
// lib/crm-api.ts
const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || 'https://crm.velixacapital.in'
const CRM_SECRET = process.env.CRM_SECRET_KEY || ''

export async function submitLeadToCRM(data: {
  name: string
  email: string
  phone: string
  loanType?: string
  loanAmount?: string
  city?: string
  message?: string
}) {
  // IMPORTANT: Call this from a SERVER ACTION or API route, NOT from client code!
  // The CRM secret should NEVER be exposed to the browser.
  return fetch(`${CRM_URL}/api/website-leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-crm-secret': CRM_SECRET,
    },
    body: JSON.stringify({
      source: 'ENQUIRY_FORM',
      ...data,
    }),
  })
}
```

### 5.5 CRM Settings for Website Integration

In the CRM, go to **Settings** and configure:
- **Website Secret Key** — A shared secret that the website must send with each lead
- **Auto-sync website leads** — If enabled, website leads are automatically imported
- **Default priority for website leads** — LOW / MEDIUM / HIGH

---

## 6. Step 4: Deploy to Vercel

### 6.1 Push Code to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit: Velixa CRM"

# Create a GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/velixa-crm.git
git branch -M main
git push -u origin main
```

**Important:** Add these to your `.gitignore` (should already be there):
```
node_modules/
.next/
*.db
db/
.env
.env.local
dev.log
server.log
``` 

### 6.2 Deploy via Vercel Dashboard (Easiest)

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your `velixa-crm` repository
4. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `.` (root)
   - **Build Command:** `npx prisma generate && npx prisma db push && next build`
     - Note: `prisma db push` syncs the schema on each deploy. For production, consider using `prisma migrate deploy` instead.
   - **Install Command:** `npm install` (or leave default)
   - **Output Directory:** `.next` (auto-detected)
5. Click **"Deploy"**

### 6.3 Set Environment Variables on Vercel

After the first deploy (it may fail without env vars):

1. Go to your Vercel project → **Settings → Environment Variables**
2. Add these variables:

| Variable | Value | Environments |
|----------|-------|-------------|
| `DATABASE_URL` | Your Supabase connection string | Production, Preview, Development |
| `JWT_SECRET` | Your JWT secret (same as in .env) | Production, Preview, Development |

3. Click **Save**
4. Go to **Deployments** → Click **...** → **Redeploy**

### 6.4 Alternative: Deploy via Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy (follows prompts)
vercel --prod

# Set environment variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production

# Redeploy with new env vars
vercel --prod
```

### 6.5 Verify the Deployment

1. Vercel gives you a URL like `velixa-crm-abc123.vercel.app`
2. Open it in your browser
3. Login with the admin credentials from seed.ts
4. Test:
   - Create a new employee
   - Add a lead
   - Check the dashboard stats

---

## 7. Step 5: Configure Custom Subdomain

### 7.1 Add Custom Domain in Vercel

1. Go to your Vercel project → **Settings → Domains**
2. Click **"Add Domain"**
3. Enter: `crm.velixacapital.in`
4. Vercel will show DNS records you need to add

### 7.2 Configure DNS Records

Go to your **domain registrar** (where you bought velixacapital.in — e.g., GoDaddy, Namecheap, Cloudflare):

Add a **CNAME record**:

| Type | Name | Value |
|------|------|-------|
| CNAME | `crm` | `cname.vercel-dns.com` |

### 7.3 If Using Cloudflare (Recommended for SSL)

1. Go to **Cloudflare Dashboard → DNS**
2. Add record:
   - Type: **CNAME**
   - Name: `crm`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **DNS only** (grey cloud, NOT orange)
     - Why? Vercel handles its own SSL. Cloudflare proxy can cause issues.
3. Go to **SSL/TLS** → Set to **Full (strict)** or **Full**

### 7.4 Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Check status: `dig crm.velixacapital.in` (should show Vercel IPs)
- Vercel automatically provisions an SSL certificate

### 7.5 Redirect www to Non-www (Optional)

In Vercel Domains settings:
1. Add `www.crm.velixacapital.in` as well
2. Vercel will auto-redirect to `crm.velixacapital.in`

---

## 8. Step 6: Post-Deployment Checklist

### 8.1 Security
- [ ] Change the `JWT_SECRET` to a strong, random value (use `openssl rand -hex 32`)
- [ ] Change the admin password after first login (Users → Edit)
- [ ] Remove the seed file or disable auto-seeding in production
- [ ] Set up the website secret key in CRM Settings
- [ ] Enable CORS if your website is on a different domain

### 8.2 Functional Testing
- [ ] Login as Admin
- [ ] Create Employee accounts
- [ ] Create a test lead manually
- [ ] Submit a test lead from the website
- [ ] Assign a lead to an employee
- [ ] Test the follow-up system
- [ ] Test lead transfer and approval
- [ ] Test the conversion flow
- [ ] Check the Audit Log

### 8.3 Performance
- [ ] Verify page load times are under 3 seconds
- [ ] Check Supabase connection pooling is working (the `?pgbouncer=true` in URL)
- [ ] Monitor Vercel function execution times

---

## 9. Troubleshooting

### "Database connection failed"
- Verify the `DATABASE_URL` is correct
- Check if the password has special characters (URL-encode them)
- Ensure `?pgbouncer=true` is in the connection string
- Check Supabase project is not paused (free tier pauses after 7 days of inactivity)

### "Prisma Client could not be generated"
- Add `npx prisma generate` to the Vercel build command
- Or add it as a `postinstall` script in package.json:
  ```json
  "scripts": {
    "postinstall": "prisma generate"
  }
  ```

### "Module not found" errors on Vercel
- Make sure all dependencies are in `dependencies` (not `devDependencies`)
- Check the `output: 'standalone'` in `next.config.ts`

### CORS errors from website
- Add CORS middleware or headers to your API routes
- Or use a server-side proxy on your website to forward leads

### Subdomain not working
- Check DNS propagation: `nslookup crm.velixacapital.in`
- Ensure CNAME points to `cname.vercel-dns.com`
- If using Cloudflare, turn off proxy (grey cloud)
- Wait up to 48 hours for full propagation

### Supabase connection pool exhausted
- Free tier has limited connection pool
- Ensure `?pgbouncer=true` is in the DATABASE_URL
- Consider upgrading the Supabase plan for more connections

### Admin can't login after deployment
- Make sure `JWT_SECRET` matches between Vercel env vars and what was used to seed the database
- If the secret changed, you need to re-seed or manually update the admin password
- Use the API to reset: `POST /api/auth/login` with admin credentials

---

## 10. Security Best Practices

### 10.1 Environment Variables
- **NEVER** commit `.env` files to git
- Use Vercel's environment variable manager
- Use different secrets for development and production

### 10.2 Database
- Supabase free tier includes automatic backups (7-day point-in-time recovery)
- Enable Row Level Security (RLS) if exposing Supabase directly (not needed if only accessed via API)
- Restrict Supabase API access: Settings → API → disable public anon key if not needed

### 10.3 Authentication
- The CRM uses JWT tokens with configurable expiry
- Tokens are stored in localStorage (consider httpOnly cookies for extra security)
- Always use HTTPS (Vercel provides this automatically)

### 10.4 Regular Maintenance
- Update dependencies regularly: `bun update`
- Monitor Vercel logs for errors
- Review Supabase usage dashboard
- Set up uptime monitoring (e.g., UptimeRobot)

---

## 11. Maintenance & Backups

### 11.1 Database Backups

Supabase handles automatic daily backups on the **Pro plan**.
On the **Free plan**, manually export your database regularly:

```bash
# Export the database
pg_dump "postgresql://postgres.abc123:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" > backup-$(date +%Y%m%d).sql

# Import a backup (if needed)
psql "postgresql://postgres.abc123:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" < backup-20250615.sql
```

Or use the Supabase Dashboard → **Database → Backups** to create manual backups.

### 11.2 Monitoring

- **Vercel:** Dashboard → Logs (real-time), Analytics (traffic, performance)
- **Supabase:** Dashboard → Database → Monitoring (connections, query performance)
- Set up **UptimeRobot** (free) to monitor `https://crm.velixacapital.in`

### 11.3 Updating the CRM

```bash
git pull origin main
vercel --prod
```

For schema changes:
```bash
# After pulling code with schema changes
npx prisma migrate dev
# Then redeploy
vercel --prod
```

---

## Quick Reference Card

| What | Where |
|------|-------|
| Database | Supabase Dashboard → [your-project] → Table Editor |
| Hosting | Vercel Dashboard → [your-project] |
| DNS | Cloudflare / Domain Registrar → DNS Records |
| Env Vars | Vercel → Settings → Environment Variables |
| Logs | Vercel → Logs tab |
| API Testing | Use Postman or curl against your CRM URL |

### Useful API Endpoints

```
POST   /api/auth/login          — Login
GET    /api/auth/me             — Current user info
POST   /api/auth/logout         — Logout
GET    /api/stats               — Dashboard statistics
GET    /api/leads               — List leads
POST   /api/leads               — Create lead
POST   /api/users               — Create user (admin)
PATCH  /api/users/:id           — Update user (admin)
POST   /api/website-leads       — Receive website lead
POST   /api/website-leads/sync  — Import website leads to lead box
GET    /api/partners            — List partners
POST   /api/partners            — Create partner
```

---

**Need help?** Contact your developer or open an issue in the project repository.
