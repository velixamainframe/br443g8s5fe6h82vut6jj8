'use client'

import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  StatusBadge,
  PriorityBadge,
  SourceBadge,
} from '@/components/crm/badges'
import {
  Search,
  Phone,
  ArrowUpDown,
  Inbox,
  Loader2,
  Download,
  Hand,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  type LeadStatus,
  type LeadPriority,
  type LeadSource,
} from '@/lib/constants'
import type { CurrentUser } from '@/components/auth-provider'

export interface LeadRow {
  id: string
  name: string
  phone: string
  altPhone: string | null
  email: string | null
  cibilScore: string | null
  loanAmount: number | null
  loanType: string | null
  city: string | null
  state: string | null
  status: LeadStatus
  priority: LeadPriority
  source: LeadSource
  origin: string
  assignedToId: string | null
  assignedTo: { id: string; name: string; email: string; role: string } | null
  partner: { id: string; companyName: string | null } | null
  nextFollowUpAt: string | null
  lastContactedAt: string | null
  claimedAt: string | null
  createdAt: string
  _count?: { notesRel: number; followups: number; activities: number }
}

export interface LeadTableProps {
  leads: LeadRow[]
  total: number
  page: number
  pageSize: number
  loading?: boolean
  user: CurrentUser
  // controls
  query: string
  onQueryChange: (v: string) => void
  statusFilter: LeadStatus[]
  onStatusFilterChange: (v: LeadStatus[]) => void
  priorityFilter: LeadPriority[]
  onPriorityFilterChange: (v: LeadPriority[]) => void
  sourceFilter: LeadSource[]
  onSourceFilterChange: (v: LeadSource[]) => void
  sortBy: string
  sortDir: 'asc' | 'desc'
  onSortChange: (field: string, dir: 'asc' | 'desc') => void
  onPageChange: (page: number) => void
  // selection
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  // row actions
  onRowClick?: (lead: LeadRow) => void
  onClaim?: (lead: LeadRow) => void
  onExport?: () => void
  showClaimColumn?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

const formatMoney = (n: number | null) =>
  n == null
    ? '—'
    : n >= 10000000
      ? `₹${(n / 10000000).toFixed(2)}Cr`
      : n >= 100000
        ? `₹${(n / 100000).toFixed(2)}L`
        : `₹${n.toLocaleString('en-IN')}`

export function LeadTable(props: LeadTableProps) {
  const {
    leads, total, page, pageSize, loading, user,
    query, onQueryChange,
    statusFilter, onStatusFilterChange,
    priorityFilter, onPriorityFilterChange,
    sourceFilter, onSourceFilterChange,
    sortBy, sortDir, onSortChange,
    onPageChange,
    selectable, selectedIds = [], onSelectionChange,
    onRowClick, onClaim, onExport,
    showClaimColumn,
    emptyTitle = 'No leads found',
    emptyDescription = 'Try adjusting your filters.',
  } = props

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const allChecked = leads.length > 0 && leads.every((l) => selectedIds.includes(l.id))
  const someChecked = leads.some((l) => selectedIds.includes(l.id))

  const toggleAll = () => {
    if (!onSelectionChange) return
    if (allChecked) onSelectionChange([])
    else onSelectionChange(leads.map((l) => l.id))
  }
  const toggleOne = (id: string) => {
    if (!onSelectionChange) return
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter((x) => x !== id))
    else onSelectionChange([...selectedIds, id])
  }

  const toggleStatus = (s: LeadStatus) =>
    onStatusFilterChange(
      statusFilter.includes(s) ? statusFilter.filter((x) => x !== s) : [...statusFilter, s]
    )
  const togglePriority = (p: LeadPriority) =>
    onPriorityFilterChange(
      priorityFilter.includes(p) ? priorityFilter.filter((x) => x !== p) : [...priorityFilter, p]
    )

  const sortBtn = (field: string, label: string) => (
    <button
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() =>
        onSortChange(field, sortBy === field && sortDir === 'desc' ? 'asc' : 'desc')
      }
    >
      {label}
      <ArrowUpDown className={cn('h-3 w-3', sortBy === field && 'text-brand')} />
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, email, city…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter[0] ?? 'ALL'}
            onValueChange={(v) => onStatusFilterChange(v === 'ALL' ? [] : [v as LeadStatus])}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter[0] ?? 'ALL'}
            onValueChange={(v) =>
              onPriorityFilterChange(v === 'ALL' ? [] : [v as LeadPriority])
            }
          >
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              {LEAD_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sourceFilter[0] ?? 'ALL'}
            onValueChange={(v) => onSourceFilterChange(v === 'ALL' ? [] : [v as LeadSource])}
          >
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {onExport && (
            <Button variant="outline" size="sm" className="h-9" onClick={onExport}>
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox checked={allChecked || someChecked} onCheckedChange={toggleAll} aria-label="Select all" />
                  </TableHead>
                )}
                <TableHead className="min-w-[160px]">{sortBtn('name', 'Lead')}</TableHead>
                <TableHead className="min-w-[130px]">Contact</TableHead>
                <TableHead>Loan</TableHead>
                <TableHead className="min-w-[120px]">{sortBtn('status', 'Status')}</TableHead>
                <TableHead className="min-w-[110px]">{sortBtn('priority', 'Priority')}</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assigned</TableHead>
                {showClaimColumn && <TableHead className="w-[90px] text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-40">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Inbox className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">{emptyTitle}</p>
                      <p className="text-xs text-muted-foreground">{emptyDescription}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const isUrgent = lead.priority === 'URGENT' || lead.status === 'CALLBACK'
                  const isSelected = selectedIds.includes(lead.id)
                  return (
                    <TableRow
                      key={lead.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isSelected && 'bg-brand/5',
                        isUrgent && 'bg-destructive/5 hover:bg-destructive/10'
                      )}
                      onClick={() => onRowClick?.(lead)}
                    >
                      {selectable && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(lead.id)}
                            aria-label={`Select ${lead.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{lead.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {lead.city ? `${lead.city}` : '—'}
                              {lead.loanType ? ` · ${lead.loanType}` : ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm tabular-nums">{lead.phone}</span>
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-success transition-colors hover:bg-success/10"
                            aria-label={`Call ${lead.name}`}
                            title="Click to call"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        {lead.email && (
                          <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium tabular-nums">
                          {formatMoney(lead.loanAmount)}
                        </div>
                        {lead.cibilScore && (
                          <p className="text-xs text-muted-foreground">CIBIL {lead.cibilScore}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={lead.priority} />
                      </TableCell>
                      <TableCell>
                        <SourceBadge source={lead.source} />
                      </TableCell>
                      <TableCell>
                        {lead.assignedTo ? (
                          <span className="text-sm">{lead.assignedTo.name}</span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      {showClaimColumn && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {!lead.assignedToId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-brand/40 text-brand hover:bg-brand/10 hover:text-brand"
                              onClick={() => onClaim?.(lead)}
                            >
                              <Hand className="mr-1 h-3.5 w-3.5" />
                              Claim
                            </Button>
                          ) : lead.assignedToId === user.id ? (
                            <span className="text-xs font-medium text-brand">Mine</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Taken</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
