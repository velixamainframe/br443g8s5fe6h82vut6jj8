import { z } from 'zod'
import {
  ROLES,
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_ORIGINS,
  FOLLOWUP_TYPES,
  REQUEST_TYPES,
  REQUEST_STATUSES,
  REQUEST_PRIORITIES,
} from './constants'

// ---- Auth ----
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional().nullable(),
  role: z.enum(ROLES as unknown as [string, ...string[]]),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().optional().nullable(),
  canTransferLeads: z.boolean().optional().default(true),
  canViewAllLeads: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
})
export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email('Enter a valid email').optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(ROLES as unknown as [string, ...string[]]).optional(),
  companyName: z.string().optional().nullable(),
  canTransferLeads: z.boolean().optional(),
  canViewAllLeads: z.boolean().optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
})
export type UpdateUserInput = z.infer<typeof updateUserSchema>

// ---- Leads ----
export const leadCreateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().min(6, 'Valid phone is required'),
  altPhone: z.string().optional().nullable().or(z.literal('')),
  cibilScore: z.string().optional().nullable().or(z.literal('')),
  loanAmount: z.coerce.number().optional().nullable(),
  loanType: z.string().optional().nullable().or(z.literal('')),
  employmentType: z.string().optional().nullable().or(z.literal('')),
  monthlyIncome: z.coerce.number().optional().nullable(),
  city: z.string().optional().nullable().or(z.literal('')),
  state: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
  source: z.enum(LEAD_SOURCES as unknown as [string, ...string[]]).optional(),
  priority: z.enum(LEAD_PRIORITIES as unknown as [string, ...string[]]).optional(),
  status: z.enum(LEAD_STATUSES as unknown as [string, ...string[]]).optional(),
  assignedToId: z.string().optional().nullable().or(z.literal('')),
})
export type LeadCreateInput = z.infer<typeof leadCreateSchema>

export const leadUpdateSchema = leadCreateSchema.partial().extend({
  status: z.enum(LEAD_STATUSES as unknown as [string, ...string[]]).optional(),
  priority: z.enum(LEAD_PRIORITIES as unknown as [string, ...string[]]).optional(),
  nextFollowUpAt: z.string().optional().nullable().or(z.literal('')),
})
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>

// ---- Notes / Followups ----
export const noteSchema = z.object({
  leadId: z.string(),
  content: z.string().min(1, 'Note cannot be empty'),
  isPinned: z.boolean().optional(),
})

export const followUpSchema = z.object({
  leadId: z.string(),
  scheduledAt: z.string(),
  type: z.enum(FOLLOWUP_TYPES as unknown as [string, ...string[]]).optional(),
  notes: z.string().optional().nullable().or(z.literal('')),
})

// ---- Transfer ----
export const transferSchema = z.object({
  leadId: z.string(),
  toUserId: z.string(),
  reason: z.string().optional().nullable().or(z.literal('')),
})

// ---- Internal Requests ----
export const internalRequestSchema = z.object({
  type: z.enum(REQUEST_TYPES as unknown as [string, ...string[]]),
  subject: z.string().min(2),
  description: z.string().min(2),
  priority: z.enum(REQUEST_PRIORITIES as unknown as [string, ...string[]]).optional(),
  leadId: z.string().optional().nullable().or(z.literal('')),
})

export const internalRequestUpdateSchema = z.object({
  status: z.enum(REQUEST_STATUSES as unknown as [string, ...string[]]).optional(),
  response: z.string().optional().nullable().or(z.literal('')),
  assignedToId: z.string().optional().nullable().or(z.literal('')),
})

// ---- Website Lead ingest ----
export const websiteLeadSchema = z.object({
  source: z.enum(['ENQUIRY_FORM', 'CHATBOT', 'CALLBACK_REQUEST', 'CONTACT_FORM']).optional(),
  name: z.string().min(2),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().min(6),
  cibilScore: z.string().optional().nullable().or(z.literal('')),
  loanAmount: z.string().optional().nullable().or(z.literal('')),
  loanType: z.string().optional().nullable().or(z.literal('')),
  employmentType: z.string().optional().nullable().or(z.literal('')),
  monthlyIncome: z.string().optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable().or(z.literal('')),
  state: z.string().optional().nullable().or(z.literal('')),
  message: z.string().optional().nullable().or(z.literal('')),
  preferredCallbackTime: z.string().optional().nullable().or(z.literal('')),
  isUrgent: z.boolean().optional(),
  websiteUrl: z.string().optional().nullable().or(z.literal('')),
  userAgent: z.string().optional().nullable().or(z.literal('')),
  referrer: z.string().optional().nullable().or(z.literal('')),
})

export const LEAD_ORIGINS_SET = LEAD_ORIGINS
export const LEAD_STATUSES_SET = LEAD_STATUSES
export const LEAD_PRIORITIES_SET = LEAD_PRIORITIES
export const LEAD_SOURCES_SET = LEAD_SOURCES
