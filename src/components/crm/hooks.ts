'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { LeadRow } from '@/components/crm/lead-table'
import type { LeadStatus, LeadPriority, LeadSource } from '@/lib/constants'

export interface LeadsQuery {
  page?: number
  pageSize?: number
  q?: string
  status?: LeadStatus[]
  priority?: LeadPriority[]
  source?: LeadSource[]
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  assignedToId?: string
  partnerId?: string
  origin?: string
  urgent?: boolean
  mine?: boolean
  unassigned?: boolean
  callbacks?: boolean
}

export function useLeads(query: LeadsQuery) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.q) params.set('q', query.q)
  query.status?.forEach((s) => params.append('status', s))
  query.priority?.forEach((p) => params.append('priority', p))
  query.source?.forEach((s) => params.append('source', s))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortDir) params.set('sortDir', query.sortDir)
  if (query.assignedToId) params.set('assignedToId', query.assignedToId)
  if (query.partnerId) params.set('partnerId', query.partnerId)
  if (query.origin) params.set('origin', query.origin)
  if (query.urgent) params.set('urgent', '1')
  if (query.mine) params.set('mine', '1')
  if (query.unassigned) params.set('unassigned', '1')
  if (query.callbacks) params.set('callbacks', '1')

  return useQuery({
    queryKey: ['leads', query],
    queryFn: () =>
      api.get<{ leads: LeadRow[]; total: number; page: number; pageSize: number; totalPages: number }>(
        `/api/leads?${params.toString()}`
      ),
    placeholderData: (prev) => prev,
  })
}

export function useClaimLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (leadId: string) => api.post<{ lead: LeadRow }>(`/api/leads/claim`, { leadId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['callbacks'] })
    },
  })
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<Record<string, unknown>>('/api/stats'),
    refetchInterval: 60_000,
  })
}

export function useCallbacks(onlyMine = false) {
  return useQuery({
    queryKey: ['callbacks', onlyMine],
    queryFn: () => api.get<{ leads: LeadRow[] }>('/api/callbacks' + (onlyMine ? '?mine=1' : '')),
  })
}

export function useUsers(role?: string) {
  return useQuery({
    queryKey: ['users', role],
    queryFn: () =>
      api.get<{ users: Array<Record<string, unknown>> }>('/api/users' + (role ? `?role=${role}` : '')),
  })
}

export function usePartners() {
  return useQuery({
    queryKey: ['partners'],
    queryFn: () => api.get<{ partners: Array<Record<string, unknown>> }>('/api/partners'),
  })
}

export function useWebsiteLeads(opts?: { urgent?: boolean; unprocessed?: boolean }) {
  const params = new URLSearchParams()
  if (opts?.urgent) params.set('urgent', '1')
  if (opts?.unprocessed) params.set('unprocessed', '1')
  return useQuery({
    queryKey: ['website-leads', opts],
    queryFn: () =>
      api.get<{ items: WebsiteLeadRow[]; total: number }>('/api/website-leads?' + params.toString()),
  })
}

export interface WebsiteLeadRow {
  id: string
  source: string
  name: string
  email: string | null
  phone: string
  cibilScore: string | null
  loanAmount: string | null
  loanType: string | null
  city: string | null
  state: string | null
  message: string | null
  preferredCallbackTime: string | null
  isUrgent: boolean
  submittedAt: string
  leadId: string | null
  lead: { id: string; name: string; status: string; assignedToId: string | null } | null
}

export interface SyncWebsiteLeadsResult {
  imported: number
  skipped: number
  leads: Array<{ id: string; name: string }>
}

export function useSyncWebsiteLeads() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.post<SyncWebsiteLeadsResult>('/api/website-leads/sync', { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-leads'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useTransfers(status?: string) {
  return useQuery({
    queryKey: ['transfers', status],
    queryFn: () =>
      api.get<{ transfers: Array<Record<string, unknown>> }>('/api/transfers' + (status ? `?status=${status}` : '')),
  })
}

export function useApproveTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      api.post(`/api/transfers/${id}/approve`, { decision }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useInternalRequests(status?: string[]) {
  const params = new URLSearchParams()
  status?.forEach((s) => params.append('status', s))
  return useQuery({
    queryKey: ['internal-requests', status],
    queryFn: () =>
      api.get<{ items: Array<Record<string, unknown>> }>('/api/internal-requests?' + params.toString()),
  })
}

export function useActivities(page = 1) {
  return useQuery({
    queryKey: ['activities', page],
    queryFn: () =>
      api.get<{ items: Array<Record<string, unknown>>; total: number }>(`/api/activities?page=${page}`),
  })
}

export function useBulkAssign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leadIds, assignedToId }: { leadIds: string[]; assignedToId: string }) =>
      api.post<{ assigned: number }>('/api/leads/bulk-assign', { leadIds, assignedToId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useImportLeads() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/leads/import', { method: 'POST', body: form, credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Import failed')
      return data as { created: number; duplicates: number; skipped: number; errors: string[] }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}
