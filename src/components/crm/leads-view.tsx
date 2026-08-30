'use client'

import * as React from 'react'
import { LeadTable, type LeadRow } from '@/components/crm/lead-table'
import { LeadDetailDrawer } from '@/components/crm/lead-detail-drawer'
import { useLeads, useUsers, useClaimLead } from '@/components/crm/hooks'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Hand, Loader2 } from 'lucide-react'
import type { LeadStatus, LeadPriority, LeadSource } from '@/lib/constants'

export interface LeadsViewProps {
  variant: 'leadbox' | 'mine' | 'all' | 'partner' | 'callbacks'
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  showClaimColumn?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onLeadUpdated?: () => void
  /** extra where overrides */
  fixedStatuses?: LeadStatus[]
}

export function LeadsView({
  variant,
  selectable,
  selectedIds,
  onSelectionChange,
  showClaimColumn,
  emptyTitle,
  emptyDescription,
  onLeadUpdated,
  fixedStatuses,
}: LeadsViewProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const claim = useClaimLead()

  const [query, setQuery] = React.useState('')
  const [cityFilter, setCityFilter] = React.useState('')
  const [cibilMin, setCibilMin] = React.useState('')
  const [cibilMax, setCibilMax] = React.useState('')
  const [loanMin, setLoanMin] = React.useState('')
  const [loanMax, setLoanMax] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [statusFilter, setStatusFilter] = React.useState<LeadStatus[]>(fixedStatuses ?? [])
  const [priorityFilter, setPriorityFilter] = React.useState<LeadPriority[]>([])
  const [sourceFilter, setSourceFilter] = React.useState<LeadSource[]>([])
  const [sortBy, setSortBy] = React.useState('createdAt')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = React.useState<LeadRow | null>(null)
  const [open, setOpen] = React.useState(false)

  const leadsQuery = useLeads({
    page,
    pageSize: 15,
    q: query,
    city: cityFilter,
    cibilMin,
    cibilMax,
    loanMin,
    loanMax,
    status: statusFilter,
    priority: priorityFilter,
    source: sourceFilter,
    sortBy,
    sortDir,
    unassigned: variant === 'leadbox',
    mine: variant === 'mine',
    callbacks: variant === 'callbacks',
    partnerId: variant === 'partner' ? user?.partnerId ?? undefined : undefined,
  })

  const { data: usersData } = useUsers('EMPLOYEE')
  const employees = (usersData?.users as { id: string; name: string; email: string }[]) ?? []

  function onSortChange(field: string, dir: 'asc' | 'desc') {
    setSortBy(field)
    setSortDir(dir)
  }

  function onRowClick(lead: LeadRow) {
    setSelected(lead)
    setOpen(true)
  }

  async function onClaim(lead: LeadRow) {
    try {
      await claim.mutateAsync(lead.id)
      toast({ title: 'Lead claimed', description: `${lead.name} is now assigned to you.` })
    } catch (e) {
      toast({
        title: 'Could not claim lead',
        description: e instanceof Error ? e.message : 'It may have been claimed by another agent.',
        variant: 'destructive',
      })
    }
  }

  function onExport() {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (cityFilter) params.set('city', cityFilter)
    if (cibilMin) params.set('cibilMin', cibilMin)
    if (cibilMax) params.set('cibilMax', cibilMax)
    if (loanMin) params.set('loanMin', loanMin)
    if (loanMax) params.set('loanMax', loanMax)
    statusFilter.forEach((s) => params.append('status', s))
    priorityFilter.forEach((p) => params.append('priority', p))
    sourceFilter.forEach((s) => params.append('source', s))
    window.open(`/api/export?${params.toString()}`, '_blank')
  }

  const showClaim = showClaimColumn ?? variant === 'leadbox'

  return (
    <>
      <LeadTable
        leads={leadsQuery.data?.leads ?? []}
        total={leadsQuery.data?.total ?? 0}
        page={page}
        pageSize={15}
        loading={leadsQuery.isLoading || leadsQuery.isFetching}
        user={user!}
        query={query}
        onQueryChange={(v) => {
          setQuery(v)
          setPage(1)
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => {
          setStatusFilter(v)
          setPage(1)
        }}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={(v) => {
          setPriorityFilter(v)
          setPage(1)
        }}
        sourceFilter={sourceFilter}
        onSourceFilterChange={(v) => {
          setSourceFilter(v)
          setPage(1)
        }}
        cityFilter={cityFilter}
        onCityFilterChange={(v) => {
          setCityFilter(v)
          setPage(1)
        }}
        cibilMin={cibilMin}
        onCibilMinChange={(v) => {
          setCibilMin(v)
          setPage(1)
        }}
        cibilMax={cibilMax}
        onCibilMaxChange={(v) => {
          setCibilMax(v)
          setPage(1)
        }}
        loanMin={loanMin}
        onLoanMinChange={(v) => {
          setLoanMin(v)
          setPage(1)
        }}
        loanMax={loanMax}
        onLoanMaxChange={(v) => {
          setLoanMax(v)
          setPage(1)
        }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={onSortChange}
        onPageChange={setPage}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        onRowClick={onRowClick}
        onClaim={onClaim}
        onExport={onExport}
        showClaimColumn={showClaim}
        emptyTitle={emptyTitle ?? 'No leads here'}
        emptyDescription={emptyDescription ?? 'Try adjusting your filters.'}
      />

      <LeadDetailDrawer
        lead={selected}
        open={open}
        onOpenChange={setOpen}
        user={user!}
        employees={employees}
        onUpdated={() => {
          leadsQuery.refetch()
          onLeadUpdated?.()
        }}
      />
    </>
  )
}

export function ClaimAllBar({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm">
      <Hand className="h-4 w-4 text-brand" />
      <span className="font-medium">{count} leads available to claim</span>
    </div>
  )
}

export function LoadingState() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}
