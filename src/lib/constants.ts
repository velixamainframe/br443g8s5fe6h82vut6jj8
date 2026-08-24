// Central domain constants for Velixa Capital CRM.
// All enum-like fields are stored as strings in the DB (SQLite-compatible)
// and validated against these sets via zod on the server.

export const ROLES = ['ADMIN', 'EMPLOYEE', 'PARTNER'] as const
export type Role = (typeof ROLES)[number]

export const LEAD_ORIGINS = ['WEBSITE', 'MANUAL', 'PARTNER', 'IMPORT'] as const
export type LeadOrigin = (typeof LEAD_ORIGINS)[number]

export const LEAD_SOURCES = [
  'ENQUIRY_FORM',
  'CHATBOT',
  'CALLBACK_REQUEST',
  'CONTACT_FORM',
  'MANUAL',
  'PARTNER',
  'IMPORT',
  'REFERRAL',
] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

export const LEAD_STATUSES = [
  'NEW',
  'CLAIMED',
  'CONTACTED',
  'FOLLOW_UP',
  'CALLBACK',
  'QUALIFIED',
  'CONVERTED',
  'REJECTED',
  'CLOSED',
] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export type LeadPriority = (typeof LEAD_PRIORITIES)[number]

export const FOLLOWUP_TYPES = ['CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'VISIT'] as const
export type FollowUpType = (typeof FOLLOWUP_TYPES)[number]

export const TRANSFER_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
] as const
export type TransferStatus = (typeof TRANSFER_STATUSES)[number]

export const REQUEST_TYPES = [
  'LEAD_TRANSFER',
  'ISSUE',
  'ACCESS',
  'LEAD_REQUEST',
  'OTHER',
] as const
export type RequestType = (typeof REQUEST_TYPES)[number]

export const REQUEST_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export const REQUEST_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number]

export const LOAN_TYPES = [
  'Home Loan',
  'Personal Loan',
  'Business Loan',
  'Loan Against Property',
  'Education Loan',
  'Vehicle Loan',
  'Credit Card',
  'Debt Consolidation',
  'Other',
] as const

export const EMPLOYMENT_TYPES = ['Salaried', 'Self-Employed', 'Business', 'Other'] as const

// ---- Display helpers ----

export const STATUS_META: Record<
  LeadStatus,
  { label: string; tone: string; dot: string }
> = {
  NEW: { label: 'New', tone: 'bg-muted text-muted-foreground border-border', dot: 'bg-slate-400' },
  CLAIMED: { label: 'Claimed', tone: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900', dot: 'bg-amber-500' },
  CONTACTED: { label: 'Contacted', tone: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900', dot: 'bg-sky-500' },
  FOLLOW_UP: { label: 'Follow Up', tone: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900', dot: 'bg-violet-500' },
  CALLBACK: { label: 'Callback', tone: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900', dot: 'bg-orange-500' },
  QUALIFIED: { label: 'Qualified', tone: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-900', dot: 'bg-teal-500' },
  CONVERTED: { label: 'Converted', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', tone: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900', dot: 'bg-rose-500' },
  CLOSED: { label: 'Closed', tone: 'bg-muted text-muted-foreground border-border', dot: 'bg-slate-400' },
}

export const PRIORITY_META: Record<
  LeadPriority,
  { label: string; tone: string; dot: string }
> = {
  LOW: { label: 'Low', tone: 'bg-muted text-muted-foreground border-border', dot: 'bg-slate-400' },
  MEDIUM: { label: 'Medium', tone: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', dot: 'bg-slate-500' },
  HIGH: { label: 'High', tone: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900', dot: 'bg-amber-500' },
  URGENT: { label: 'Urgent', tone: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900', dot: 'bg-red-600' },
}

export const SOURCE_META: Record<LeadSource, { label: string }> = {
  ENQUIRY_FORM: { label: 'Enquiry Form' },
  CHATBOT: { label: 'Chatbot' },
  CALLBACK_REQUEST: { label: 'Callback Request' },
  CONTACT_FORM: { label: 'Contact Form' },
  MANUAL: { label: 'Manual' },
  PARTNER: { label: 'Partner' },
  IMPORT: { label: 'Import' },
  REFERRAL: { label: 'Referral' },
}

export const ROLE_META: Record<Role, { label: string; tone: string }> = {
  ADMIN: { label: 'Admin', tone: 'bg-brand/15 text-brand border-brand/30' },
  EMPLOYEE: { label: 'Employee', tone: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900' },
  PARTNER: { label: 'Partner', tone: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-900' },
}

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; tone: string }> = {
  OPEN: { label: 'Open', tone: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900' },
  IN_PROGRESS: { label: 'In Progress', tone: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900' },
  RESOLVED: { label: 'Resolved', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900' },
  CLOSED: { label: 'Closed', tone: 'bg-muted text-muted-foreground border-border' },
}

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v)
}
