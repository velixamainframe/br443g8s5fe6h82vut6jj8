'use client'

import * as React from 'react'
import { DashboardShell, type NavItem } from '@/components/crm/dashboard-shell'
import { StatCard } from '@/components/crm/stat-card'
import { LeadsView } from '@/components/crm/leads-view'
import { LeadDetailDrawer } from '@/components/crm/lead-detail-drawer'
import { LeadTable, type LeadRow } from '@/components/crm/lead-table'
import {
  useStats,
  useCallbacks,
  useLeads,
  useUsers,
  useTransfers,
  useInternalRequests,
} from '@/components/crm/hooks'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api-client'
import { StatusBadge, PriorityBadge, SourceBadge } from '@/components/crm/badges'
import {
  REQUEST_TYPES,
  REQUEST_PRIORITIES,
  type RequestType,
  type RequestPriority,
  type LeadStatus,
  type LeadPriority,
  type LeadSource,
} from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LayoutDashboard,
  Inbox,
  Users,
  PhoneCall,
  CalendarClock,
  ArrowRightLeft,
  LifeBuoy,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Phone,
  Loader2,
} from 'lucide-react'

export function EmployeeApp() {
  const { user } = useAuth()
  const [active, setActive] = React.useState('overview')
  const stats = useStats()
  const callbacks = useCallbacks(true)

  const urgentCount = (callbacks.data?.leads ?? []).length

  const nav: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'leadbox', label: 'Universal Lead Box', icon: Inbox, badge: (stats.data as { availableInBox?: number })?.availableInBox },
    { key: 'mine', label: 'My Leads', icon: Users, badge: (stats.data as { assigned?: number })?.assigned },
    { key: 'callbacks', label: 'Urgent Callbacks', icon: PhoneCall, badge: urgentCount, urgent: urgentCount > 0 },
    { key: 'followups', label: 'Follow-ups', icon: CalendarClock, badge: (stats.data as { todaysFollowUps?: number })?.todaysFollowUps },
    { key: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
    { key: 'support', label: 'Support', icon: LifeBuoy },
  ]

  const titles: Record<string, { title: string; subtitle: string }> = {
    overview: { title: 'Dashboard', subtitle: `Welcome back, ${user?.name.split(' ')[0]}` },
    leadbox: { title: 'Universal Lead Box', subtitle: 'Claim available leads to work on' },
    mine: { title: 'My Leads', subtitle: 'Leads assigned to you' },
    callbacks: { title: 'Urgent Callbacks', subtitle: 'Leads requiring immediate attention' },
    followups: { title: 'Follow-ups', subtitle: 'Your scheduled follow-ups' },
    transfers: { title: 'Lead Transfers', subtitle: 'Your transfer requests' },
    support: { title: 'Support', subtitle: 'Submit requests to administrators' },
  }

  return (
    <DashboardShell
      nav={nav}
      active={active}
      onNavigate={setActive}
      title={titles[active]?.title ?? 'Dashboard'}
      subtitle={titles[active]?.subtitle}
    >
      {active === 'overview' && <EmployeeOverview onNavigate={setActive} />}
      {active === 'leadbox' && (
        <LeadsView
          variant="leadbox"
          showClaimColumn
          emptyTitle="No leads available"
          emptyDescription="All available leads have been claimed. Check back later."
        />
      )}
      {active === 'mine' && (
        <LeadsView
          variant="mine"
          emptyTitle="No leads assigned to you"
          emptyDescription="Claim leads from the Universal Lead Box to get started."
        />
      )}
      {active === 'callbacks' && <CallbacksView />}
      {active === 'followups' && <FollowUpsView />}
      {active === 'transfers' && <EmployeeTransfersView />}
      {active === 'support' && <SupportView />}
    </DashboardShell>
  )
}

function EmployeeOverview({ onNavigate }: { onNavigate: (k: string) => void }) {
  const stats = useStats()
  const callbacks = useCallbacks(true)
  const s = stats.data as {
    assigned?: number
    contacted?: number
    converted?: number
    followUps?: number
    callbacks?: number
    pending?: number
    urgent?: number
    availableInBox?: number
    todaysFollowUps?: number
  } | undefined

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned to me" value={s?.assigned ?? 0} icon={<Users className="h-5 w-5" />} hint="Active leads" />
        <StatCard label="Available to claim" value={s?.availableInBox ?? 0} icon={<Inbox className="h-5 w-5" />} hint="In the Lead Box" accent="warning" />
        <StatCard label="Converted" value={s?.converted ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard label="Urgent callbacks" value={s?.urgent ?? 0} icon={<AlertTriangle className="h-5 w-5" />} accent="urgent" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Contacted" value={s?.contacted ?? 0} icon={<Phone className="h-5 w-5" />} />
        <StatCard label="Follow-ups" value={s?.followUps ?? 0} icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard label="Due today" value={s?.todaysFollowUps ?? 0} icon={<Clock className="h-5 w-5" />} />
      </div>

      {(callbacks.data?.leads ?? []).length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Urgent callbacks requiring attention
            </h3>
            <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onNavigate('callbacks')}>
              View all
            </Button>
          </div>
          <div className="space-y-2">
            {callbacks.data!.leads.slice(0, 3).map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={l.priority} />
                  <a href={`tel:${l.phone}`}>
                    <Button size="sm" variant="ghost" className="h-8 text-success">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Quick actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start" onClick={() => onNavigate('leadbox')}>
              <Inbox className="mr-2 h-4 w-4" /> Claim a lead
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onNavigate('callbacks')}>
              <PhoneCall className="mr-2 h-4 w-4" /> Callbacks
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onNavigate('followups')}>
              <CalendarClock className="mr-2 h-4 w-4" /> Follow-ups
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onNavigate('support')}>
              <LifeBuoy className="mr-2 h-4 w-4" /> Get support
            </Button>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-brand" />
            Your performance
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total assigned</span><span className="font-semibold">{s?.assigned ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Contacted</span><span className="font-semibold">{s?.contacted ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pending action</span><span className="font-semibold">{s?.pending ?? 0}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Conversion rate</span><span className="font-semibold text-success">
              {s && s.assigned ? `${Math.round(((s.converted ?? 0) / s.assigned) * 100)}%` : '—'}
            </span></div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function CallbacksView() {
  const { user } = useAuth()
  const { toast } = useToast()
  const callbacks = useCallbacks(true)
  const [selected, setSelected] = React.useState<LeadRow | null>(null)
  const [open, setOpen] = React.useState(false)
  const { data: usersData } = useUsers('EMPLOYEE')
  const employees = (usersData?.users as { id: string; name: string; email: string }[]) ?? []

  if (callbacks.isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  const leads = callbacks.data?.leads ?? []

  return (
    <div className="space-y-4">
      <Card className="border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive">{leads.length} urgent callback{leads.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-muted-foreground">Highlighted in red. Handle these first.</p>
          </div>
        </div>
      </Card>

      {leads.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-muted-foreground">No urgent callbacks right now.</p>
        </Card>
      ) : (
        <LeadTable
          leads={leads}
          total={leads.length}
          page={1}
          pageSize={leads.length}
          loading={false}
          user={user!}
          query=""
          onQueryChange={() => {}}
          statusFilter={[]}
          onStatusFilterChange={() => {}}
          priorityFilter={[]}
          onPriorityFilterChange={() => {}}
          sourceFilter={[]}
          onSourceFilterChange={() => {}}
          sortBy="createdAt"
          sortDir="asc"
          onSortChange={() => {}}
          onPageChange={() => {}}
          onRowClick={(l) => { setSelected(l); setOpen(true) }}
        />
      )}

      <LeadDetailDrawer
        lead={selected}
        open={open}
        onOpenChange={setOpen}
        user={user!}
        employees={employees}
        onUpdated={() => callbacks.refetch()}
      />
    </div>
  )
}

function FollowUpsView() {
  const { user } = useAuth()
  const [page, setPage] = React.useState(1)
  const query = useLeads({ mine: true, sortBy: 'nextFollowUpAt', sortDir: 'asc', page, pageSize: 15 })
  const [selected, setSelected] = React.useState<LeadRow | null>(null)
  const [open, setOpen] = React.useState(false)
  const { data: usersData } = useUsers('EMPLOYEE')
  const employees = (usersData?.users as { id: string; name: string; email: string }[]) ?? []

  return (
    <>
      <LeadsViewInline
        title="Upcoming follow-ups"
        description="Your leads sorted by next follow-up time"
        leads={query.data?.leads ?? []}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={15}
        loading={query.isLoading}
        onPageChange={setPage}
        onRowClick={(l) => { setSelected(l); setOpen(true) }}
        user={user!}
        emptyTitle="No follow-ups scheduled"
      />
      <LeadDetailDrawer lead={selected} open={open} onOpenChange={setOpen} user={user!} employees={employees} onUpdated={() => query.refetch()} />
    </>
  )
}

function LeadsViewInline({
  title, description, leads, total, page, pageSize, loading, onPageChange, onRowClick, user, emptyTitle,
}: {
  title: string
  description: string
  leads: LeadRow[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  onPageChange: (p: number) => void
  onRowClick: (l: LeadRow) => void
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  emptyTitle: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <LeadTable
        leads={leads}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={loading}
        user={user}
        query=""
        onQueryChange={() => {}}
        statusFilter={[]}
        onStatusFilterChange={() => {}}
        priorityFilter={[]}
        onPriorityFilterChange={() => {}}
        sourceFilter={[]}
        onSourceFilterChange={() => {}}
        sortBy="nextFollowUpAt"
        sortDir="asc"
        onSortChange={() => {}}
        onPageChange={onPageChange}
        onRowClick={onRowClick}
        emptyTitle={emptyTitle}
      />
    </div>
  )
}

function EmployeeTransfersView() {
  const transfers = useTransfers()
  const items = (transfers.data?.transfers ?? []) as Array<{
    id: string
    status: string
    reason: string | null
    createdAt: string
    resolvedAt: string | null
    lead: { id: string; name: string; phone: string }
    fromUser: { id: string; name: string }
    toUser: { id: string; name: string }
  }>

  return (
    <div className="space-y-3">
      <Card className="p-5">
        <h3 className="mb-1 text-sm font-semibold">Your transfer requests</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Transfers require admin approval. You'll see the status here once reviewed.
        </p>
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <ArrowRightLeft className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No transfer requests yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.lead.name} · {t.lead.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    To {t.toUser.name} · {new Date(t.createdAt).toLocaleDateString('en-IN')}
                  </p>
                  {t.reason && <p className="mt-1 text-xs italic text-muted-foreground">"{t.reason}"</p>}
                </div>
                <TransferStatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function TransferStatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900',
    CANCELLED: 'bg-muted text-muted-foreground border-border',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[status] ?? tones.PENDING}`}>
      {status}
    </span>
  )
}

function SupportView() {
  const { toast } = useToast()
  const requests = useInternalRequests()
  const [type, setType] = React.useState<RequestType>('ISSUE')
  const [subject, setSubject] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [priority, setPriority] = React.useState<RequestPriority>('MEDIUM')
  const [submitting, setSubmitting] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    setSubmitting(true)
    try {
      await api.post('/api/internal-requests', { type, subject: subject.trim(), description: description.trim(), priority })
      toast({ title: 'Request submitted', description: 'An administrator will review it shortly.' })
      setSubject('')
      setDescription('')
      requests.refetch()
    } catch (e) {
      toast({ title: 'Failed to submit', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const items = (requests.data?.items ?? []) as Array<{
    id: string
    type: string
    subject: string
    description: string
    status: string
    priority: string
    response: string | null
    createdAt: string
    assignedTo: { id: string; name: string } | null
  }>

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold">Submit a request</h3>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as RequestType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as RequestPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUEST_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary" required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your request in detail…" rows={4} required />
          </div>
          <Button type="submit" disabled={submitting} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LifeBuoy className="mr-2 h-4 w-4" />}
            Submit request
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold">Your requests</h3>
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <LifeBuoy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No requests submitted yet</p>
          </div>
        ) : (
          <div className="max-h-[28rem] space-y-2 overflow-y-auto">
            {items.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{r.subject}</p>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    r.status === 'OPEN' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900' :
                    r.status === 'RESOLVED' || r.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900' :
                    'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900'
                  }`}>{r.status.replace('_', ' ')}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.type.replace('_', ' ')} · {r.priority} · {new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                {r.response && (
                  <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                    <span className="font-medium">Admin response: </span>{r.response}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
