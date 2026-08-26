// Seed script — creates the bootstrap admin (from env) and a set of sample
// website leads so the CRM has realistic data on first run.
// Run with: bun run db:seed
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const LOAN_TYPES = [
  'Home Loan',
  'Personal Loan',
  'Business Loan',
  'Loan Against Property',
  'Vehicle Loan',
  'Education Loan',
  'Gold Loan',
  'Credit Card',
  'Overdraft',
  'Working Capital',
]

const STATUSES = ['NEW', 'CLAIMED', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'REJECTED'] as const
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

async function main() {
  // ---- Bootstrap admin ----
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@velixacapital.in'
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Velkun@1555'
  const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Vishes Administrator'
  const bootstrapOnly = process.env.BOOTSTRAP_ONLY === 'true'

  const existing = await db.user.findUnique({ where: { email } })
  if (!existing) {
    await db.user.create({
      data: {
        email,
        name,
        role: 'ADMIN',
        passwordHash: await bcrypt.hash(password, 10),
        active: true,
      },
    })
    console.log(`✓ Bootstrap admin created: ${email}`)
  } else {
    console.log(`• Bootstrap admin already exists: ${email}`)
  }

  if (bootstrapOnly) {
    console.log('Seed complete. Demo data skipped (BOOTSTRAP_ONLY=true).')
    return
  }

  // ---- Sample employees (7 total) ----
  const employees = [
    { name: 'Arjun Mehta', email: 'arjun@velixacapital.in', phone: '+91 98200 11223', canViewAllLeads: false },
    { name: 'Priya Nair', email: 'priya@velixacapital.in', phone: '+91 98201 44556', canViewAllLeads: false },
    { name: 'Rahul Verma', email: 'rahul@velixacapital.in', phone: '+91 98202 77889', canViewAllLeads: false },
    { name: 'Neha Sharma', email: 'neha@velixacapital.in', phone: '+91 98203 22334', canViewAllLeads: false },
    { name: 'Amit Patel', email: 'amit@velixacapital.in', phone: '+91 98204 55667', canViewAllLeads: true },
    { name: 'Sneha Kulkarni', email: 'sneha@velixacapital.in', phone: '+91 98205 88990', canViewAllLeads: true },
    { name: 'Rohan Das', email: 'rohan@velixacapital.in', phone: '+91 98206 11223', canViewAllLeads: false },
  ]

  const employeeIds: string[] = []
  for (const e of employees) {
    const exists = await db.user.findUnique({ where: { email: e.email } })
    if (!exists) {
      const user = await db.user.create({
        data: {
          email: e.email,
          name: e.name,
          phone: e.phone,
          role: 'EMPLOYEE',
          passwordHash: await bcrypt.hash('Velixa@Agent2025', 10),
          active: true,
          canTransferLeads: true,
          canViewAllLeads: e.canViewAllLeads,
        },
      })
      employeeIds.push(user.id)
      console.log(`✓ Employee created: ${e.email}`)
    } else {
      employeeIds.push(exists.id)
      console.log(`• Employee already exists: ${e.email}`)
    }
  }

  // ---- Sample partners (5 total) ----
  const partners = [
    { companyName: 'Sterling Wealth Advisors', contactName: 'Vikram Shah', email: 'partner@velixacapapital.in', phone: '+91 98300 55667' },
    { companyName: 'FinGrow Advisory Services', contactName: 'Rajesh Kapoor', email: 'rajesh@fingrow.in', phone: '+91 98301 66778' },
    { companyName: 'WealthBridge Financial', contactName: 'Sanjay Malhotra', email: 'sanjay@wealthbridge.in', phone: '+91 98302 77889' },
    { companyName: 'Nexus Credit Solutions', contactName: 'Divya Menon', email: 'divya@nexuscredit.in', phone: '+91 98303 88990' },
    { companyName: 'Prosperity Partners', contactName: 'Arun Khanna', email: 'arun@prosperitypartners.in', phone: '+91 98304 99112' },
  ]

  const partnerIds: string[] = []
  for (const p of partners) {
    const uExists = await db.user.findUnique({ where: { email: p.email } })
    if (!uExists) {
      const partner = await db.partner.create({
        data: {
          companyName: p.companyName,
          contactName: p.contactName,
          phone: p.phone,
          email: p.email,
        },
      })
      await db.user.create({
        data: {
          email: p.email,
          name: p.contactName,
          role: 'PARTNER',
          passwordHash: await bcrypt.hash('Velixa@Partner2025', 10),
          active: true,
          partnerId: partner.id,
        },
      })
      partnerIds.push(partner.id)
      console.log(`✓ Partner created: ${p.email}`)
    } else {
      const existingPartner = await db.partner.findFirst({ where: { email: p.email } })
      if (existingPartner) partnerIds.push(existingPartner.id)
      console.log(`• Partner already exists: ${p.email}`)
    }
  }

  // ---- Sample website leads (simulating data from main site Supabase) ----
  const wlCount = await db.websiteLead.count()
  if (wlCount === 0) {
    const samples = [
      { name: 'Suresh Kumar', phone: '9876543210', source: 'CALLBACK_REQUEST', isUrgent: true, loanType: 'Home Loan', loanAmount: '4500000', city: 'Mumbai', state: 'Maharashtra', message: 'Need callback urgently about home loan', preferredCallbackTime: 'Today 4-6 PM' },
      { name: 'Anjali Desai', phone: '9876512345', source: 'ENQUIRY_FORM', loanType: 'Personal Loan', loanAmount: '500000', city: 'Pune', state: 'Maharashtra', message: 'Looking for personal loan for wedding' },
      { name: 'Mohammed Iqbal', phone: '9812345678', source: 'CALLBACK_REQUEST', isUrgent: true, loanType: 'Business Loan', loanAmount: '2000000', city: 'Bengaluru', state: 'Karnataka', message: 'Urgent working capital needed', preferredCallbackTime: 'ASAP' },
      { name: 'Lakshmi Iyer', phone: '9001122334', source: 'CHATBOT', loanType: 'Loan Against Property', loanAmount: '8000000', city: 'Chennai', state: 'Tamil Nadu', message: 'Wants LAP details' },
      { name: 'Deepak Joshi', phone: '9005566778', source: 'CONTACT_FORM', loanType: 'Home Loan', loanAmount: '6500000', city: 'Ahmedabad', state: 'Gujarat', message: 'Interested in home loan, salaried' },
      { name: 'Ritu Saxena', phone: '9988776655', source: 'CALLBACK_REQUEST', isUrgent: true, loanType: 'Personal Loan', loanAmount: '800000', city: 'Delhi', state: 'Delhi', message: 'Need quick disbursal', preferredCallbackTime: 'Today evening' },
      { name: 'Karthik Reddy', phone: '9090909090', source: 'ENQUIRY_FORM', loanType: 'Vehicle Loan', loanAmount: '1200000', city: 'Hyderabad', state: 'Telangana', message: 'Car loan enquiry' },
      { name: 'Meera Pillai', phone: '9445566778', source: 'CHATBOT', loanType: 'Education Loan', loanAmount: '1500000', city: 'Kochi', state: 'Kerala', message: 'Education loan for masters' },
      { name: 'Ankit Gupta', phone: '9711223344', source: 'ENQUIRY_FORM', loanType: 'Business Loan', loanAmount: '3000000', city: 'Jaipur', state: 'Rajasthan', message: 'Business expansion loan', cibilScore: '780' },
      { name: 'Fatima Sheikh', phone: '9632587410', source: 'CALLBACK_REQUEST', isUrgent: true, loanType: 'Home Loan', loanAmount: '5500000', city: 'Lucknow', state: 'Uttar Pradesh', message: 'Pre-approved home loan query', preferredCallbackTime: 'Tomorrow morning' },
    ]
    for (const s of samples) {
      await db.websiteLead.create({
        data: {
          name: s.name,
          phone: s.phone,
          source: s.source,
          isUrgent: s.isUrgent ?? false,
          loanType: s.loanType,
          loanAmount: s.loanAmount,
          city: s.city,
          state: s.state,
          message: s.message,
          preferredCallbackTime: s.preferredCallbackTime,
          cibilScore: s.cibilScore,
          submittedAt: new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000)),
        },
      })
    }
    console.log(`✓ Created ${samples.length} sample website leads`)
  }

  // ---- Sample CRM leads assigned to employees (15 leads) ----
  const leadCount = await db.lead.count()
  if (leadCount === 0 && employeeIds.length >= 3) {
    const sampleLeads = [
      { name: 'Vikram Singh', phone: '9920344556', city: 'Mumbai', state: 'Maharashtra', loanType: 'Home Loan', loanAmount: 7500000, status: 'CLAIMED', priority: 'HIGH', source: 'WEBSITE', origin: 'WEBSITE', employeeIdx: 0 },
      { name: 'Pooja Agarwal', phone: '9871234567', city: 'Delhi', state: 'Delhi', loanType: 'Personal Loan', loanAmount: 300000, status: 'CONTACTED', priority: 'MEDIUM', source: 'MANUAL', origin: 'MANUAL', employeeIdx: 1 },
      { name: 'Rajesh Nair', phone: '9443210987', city: 'Kochi', state: 'Kerala', loanType: 'Business Loan', loanAmount: 1500000, status: 'FOLLOW_UP', priority: 'HIGH', source: 'WEBSITE', origin: 'WEBSITE', employeeIdx: 2 },
      { name: 'Sanjana Reddy', phone: '9654321098', city: 'Hyderabad', state: 'Telangana', loanType: 'Vehicle Loan', loanAmount: 900000, status: 'CONVERTED', priority: 'MEDIUM', source: 'CALLBACK_REQUEST', origin: 'WEBSITE', employeeIdx: 0 },
      { name: 'Manish Tiwari', phone: '9765432109', city: 'Lucknow', state: 'Uttar Pradesh', loanType: 'Home Loan', loanAmount: 4000000, status: 'REJECTED', priority: 'LOW', source: 'ENQUIRY_FORM', origin: 'WEBSITE', employeeIdx: 3 },
      { name: 'Divya Krishnan', phone: '9876549101', city: 'Chennai', state: 'Tamil Nadu', loanType: 'Loan Against Property', loanAmount: 12000000, status: 'NEW', priority: 'URGENT', source: 'CALLBACK_REQUEST', origin: 'WEBSITE', employeeIdx: 4 },
      { name: 'Amit Joshi', phone: '9987650123', city: 'Pune', state: 'Maharashtra', loanType: 'Gold Loan', loanAmount: 500000, status: 'CLAIMED', priority: 'MEDIUM', source: 'MANUAL', origin: 'MANUAL', employeeIdx: 5 },
      { name: 'Kavita Sharma', phone: '9012345678', city: 'Jaipur', state: 'Rajasthan', loanType: 'Personal Loan', loanAmount: 200000, status: 'CONTACTED', priority: 'LOW', source: 'PARTNER', origin: 'PARTNER', employeeIdx: 6, partnerIdx: 0 },
      { name: 'Rohit Mehta', phone: '9123456789', city: 'Ahmedabad', state: 'Gujarat', loanType: 'Business Loan', loanAmount: 5000000, status: 'FOLLOW_UP', priority: 'HIGH', source: 'PARTNER', origin: 'PARTNER', employeeIdx: 0, partnerIdx: 1 },
      { name: 'Nisha Verma', phone: '9234567890', city: 'Bengaluru', state: 'Karnataka', loanType: 'Home Loan', loanAmount: 8500000, status: 'NEW', priority: 'URGENT', source: 'WEBSITE', origin: 'WEBSITE', employeeIdx: 1 },
      { name: 'Sunil Gupta', phone: '9345678901', city: 'Kolkata', state: 'West Bengal', loanType: 'Education Loan', loanAmount: 2000000, status: 'CONTACTED', priority: 'MEDIUM', source: 'ENQUIRY_FORM', origin: 'WEBSITE', employeeIdx: 2 },
      { name: 'Priyanka Das', phone: '9456789012', city: 'Bhubaneswar', state: 'Odisha', loanType: 'Personal Loan', loanAmount: 350000, status: 'CONVERTED', priority: 'MEDIUM', source: 'MANUAL', origin: 'MANUAL', employeeIdx: 3 },
      { name: 'Harsh Patel', phone: '9567890123', city: 'Surat', state: 'Gujarat', loanType: 'Home Loan', loanAmount: 6000000, status: 'FOLLOW_UP', priority: 'HIGH', source: 'PARTNER', origin: 'PARTNER', employeeIdx: 4, partnerIdx: 2 },
      { name: 'Anjali Mukherjee', phone: '9678901234', city: 'Kolkata', state: 'West Bengal', loanType: 'Loan Against Property', loanAmount: 10000000, status: 'REJECTED', priority: 'LOW', source: 'WEBSITE', origin: 'WEBSITE', employeeIdx: 5 },
      { name: 'Vivek Chauhan', phone: '9789012345', city: 'Noida', state: 'Uttar Pradesh', loanType: 'Working Capital', loanAmount: 3000000, status: 'NEW', priority: 'HIGH', source: 'PARTNER', origin: 'PARTNER', employeeIdx: 6, partnerIdx: 3 },
    ]

    const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } })

    for (const s of sampleLeads) {
      const assignedToId = employeeIds[s.employeeIdx % employeeIds.length]
      const partnerId = s.partnerIdx !== undefined && partnerIds[s.partnerIdx] ? partnerIds[s.partnerIdx] : null
      const dedupeKey = `MANUAL_${s.phone}_${s.origin}`

      await db.lead.create({
        data: {
          name: s.name,
          phone: s.phone,
          city: s.city,
          state: s.state,
          loanType: s.loanType,
          loanAmount: s.loanAmount,
          status: s.status,
          priority: s.priority,
          source: s.source,
          origin: s.origin,
          dedupeKey,
          assignedToId,
          partnerId,
          createdById: adminUser?.id,
          claimedAt: s.status !== 'NEW' ? new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)) : null,
          lastContactedAt: ['CONTACTED', 'FOLLOW_UP', 'CONVERTED'].includes(s.status) ? new Date(Date.now() - Math.floor(Math.random() * 2 * 24 * 60 * 60 * 1000)) : null,
          nextFollowUpAt: s.status === 'FOLLOW_UP' ? new Date(Date.now() + Math.floor(Math.random() * 24 * 60 * 60 * 1000)) : null,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)),
        },
      })
    }
    console.log(`✓ Created ${sampleLeads.length} sample CRM leads`)
  }

  console.log('\nSeed complete.')
  console.log('Login: admin@velixacapital.in / Velkun@1555')
  console.log(`Employees: ${employees.length} | Partners: ${partners.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
