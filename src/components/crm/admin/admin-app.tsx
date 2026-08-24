'use client'

import * as React from 'react'
import { DashboardShell, type NavItem } from '@/components/crm/dashboard-shell'
import { StatCard } from '@/components/crm/stat-card'
import { LeadsView } from '@/components/crm/leads-view'
import { LeadTable, type LeadRow } from '@/components/crm/lead-table'
import { LeadDetailDrawer } from '@/components/crm/lead-detail-drawer'
import { UsersManager } from '@/components/crm/admin/users-manager'
import { WebsiteLeadsView } from '@/components/crm/admin/website-leads-view'
import {
  useStats,
  useLeads,
  useUsers,
  useTransfers,
  useApproveTransfer,
  useInternalRequests,
  useActivities,
  useBulkAssign,
  useImportLeads,
  usePartners,
  useWebsiteLeads,
} from '@/components/crm/hooks'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  LayoutDashboard,
  Inbox,
  Globe,
  PhoneCall,
  ArrowRightLeft,
  Users,
  Handshake,
  LifeBuoy,
  ScrollText,
  Settings,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Upload,
  Loader2,
  Download,
  UserCheck,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  Bell,
  Shield,
  Monitor,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminApp() {
  const { user } = useAuth()
  const [active, setActive] = React.useState('overview')
  const stats = useStats()
  const transfers = useTransfers('PENDING')
  const requests = useInternalRequests(['OPEN'])
  const website = useWebsiteLeads({ unprocessed: true })

  const pendingTransfers = (transfers.data?.transfers ?? []).length
  const openRequests = (requests.data?.items ?? []).length
  const pendingWebsite = website.data?.total ?? 0

  const s = stats.data as {
    totalLeads?: number
    newLeads?: number
    claimed?: number
    converted?: number
    urgent?: number
    activeEmployees?: number
    totalPartners?: number
    pendingTransfers?: number
    openRequests?: number
    websiteLeadsUnprocessed?: number
    websiteUrgent?: number
    bySource?: Array<{ source: string; count: number }>
    topEmployees?: Array<{ user: { id: string; name: string; email: string } | null; converted: number }>
  } | undefined

  const nav: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'leadbox', label: 'Universal Lead Box', icon: Inbox, badge: s?.totalLeads },
    { key: 'website', label: 'Website Leads', icon: Globe, badge: pendingWebsite, urgent: (s?.websiteUrgent ?? 0) > 0 },
    { key: 'callbacks', label: 'Urgent Callbacks', icon: PhoneCall, badge: s?.urgent, urgent: (s?.urgent ?? 0) > 0 },
    { key: 'transfers', label: 'Transfers', icon: ArrowRightLeft, badge: pendingTransfers, urgent: pendingTransfers > 0 },
    { key: 'users', label: 'Employees', icon: Users, badge: s?.activeEmployees },
    { key: 'partners', label: 'Partners', icon: Handshake, badge: s?.totalPartners },
    { key: 'requests', label: 'Requests', icon: LifeBuoy, badge: openRequests, urgent: openRequests > 0 },
    { key: 'audit', label: 'Audit Log', icon: ScrollText },
    { key: 'settings', label: 'Settings', icon: Settings },
  ]

  const titles: Record<string, { title: string; subtitle: string }> = {
    overview: { title: 'Admin Dashboard', subtitle: 'Complete CRM overview' },
    leadbox: { title: 'Universal Lead Box', subtitle: 'All leads — assign, import, manage' },
    website: { title: 'Website Leads', subtitle: 'Sync leads from velixacapital.in' },
    callbacks: { title: 'Urgent Callbacks', subtitle: 'Leads needing immediate attention' },
    transfers: { title: 'Transfer Approvals', subtitle: 'Pending lead transfer requests' },
    users: { title: 'Employee Management', subtitle: 'Create & manage CRM employees' },
    partners: { title: 'Partners', subtitle: 'Partner performance & lead tracking' },
    requests: { title: 'Internal Requests', subtitle: 'Requests from employees & partners' },
    audit: { title: 'Audit Log', subtitle: 'All activity across the CRM' },
    settings: { title: 'Settings', subtitle: 'CRM configuration' },
  }

  return (
    <DashboardShell
      nav={nav}
      active={active}
      onNavigate={setActive}
      title={titles[active]?.title ?? 'Dashboard'}
      subtitle={titles[active]?.subtitle}
      actions={
        active === 'leadbox' ? <UploadLeadsButton /> : active === 'leadbox-select' ? undefined : undefined
      }
    >
      {active === 'overview' && <AdminOverview onNavigate={setActive} />}
      {active === 'leadbox' && <AdminLeadBox />}
      {active === 'website' && <WebsiteLeadsView />}
      {active === 'callbacks' && <AdminCallbacksView />}
      {active === 'transfers' && <AdminTransfersView />}
      {active === 'users' && <UsersManager />}
      {active === 'partners' && <AdminPartnersView />}
      {active === 'requests' && <AdminRequestsView />}
      {active === 'audit' && <AdminAuditView />}
      {active === 'settings' && <AdminSettingsView />}
    </DashboardShell>
  )
}

function UploadLeadsButton() {
  const { toast } = useToast()
  const importLeads = useImportLeads()
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handle(file: File) {
    try {
      const res = await importLeads.mutateAsync(file)
      toast({ title: `Imported ${res.created} leads`, description: `${res.duplicates} duplicates, ${res.skipped} skipped` })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Import failed', variant: 'destructive' })
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = '' }}
      />
      <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={importLeads.isPending}>
        {importLeads.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
        Import CSV
      </Button>
    </>
  )
}

function ConverterDetailTrigger({ rank, employee }: { rank: number; employee: { user: { id: string; name: string; email: string } | null; converted: number } }) {
  const [open, setOpen] = React.useState(false)
  const [details, setDetails] = React.useState<Array<{
    id: string; name: string; phone: string; loanType: string | null; loanAmount: number | null;
    source: string; createdAt: string; updatedAt: string;
  }> | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function fetchDetails() {
    if (!employee.user?.id) return
    setLoading(true)
    setOpen(true)
    try {
      const res = await api.get<{ conversions: Array<{
        id: string; name: string; phone: string; loanType: string | null; loanAmount: number | null;
        source: string; createdAt: string; updatedAt: string;
      }> }>(`/api/stats/conversions?userId=${employee.user.id}`)
      setDetails(res.conversions ?? [])
    } catch {
      setDetails([])
    } finally {
      setLoading(false)
    }
  }

  function formatDuration(createdAt: string, updatedAt: string) {
    const start = new Date(createdAt).getTime()
    const end = new Date(updatedAt).getTime()
    const diffMs = end - start
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`
    return `${diffMins}m`
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <>
      <button
        onClick={fetchDetails}
        className="flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
          {rank}
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {employee.user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{employee.user?.name ?? 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{employee.converted} converted</p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                {rank}
              </div>
              <div>
                <span>{employee.user?.name ?? 'Unknown'}</span>
                <span className="ml-2 text-sm font-normal text-muted-foreground">— {employee.converted} conversion{employee.converted !== 1 ? 's' : ''}</span>
              </div>
            </DialogTitle>
            <DialogDescription>
              Detailed report of leads converted by {employee.user?.name ?? 'this employee'}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : details && details.length > 0 ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold text-success">{details.length}</p>
                  <p className="text-xs text-muted-foreground">Total Converted</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">
                    {(() => {
                      const totalMs = details.reduce((sum, d) => sum + (new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime()), 0)
                      const avgMs = totalMs / details.length
                      const avgHours = Math.floor(avgMs / 3600000)
                      const avgDays = Math.floor(avgHours / 24)
                      if (avgDays > 0) return `${avgDays}d`
                      return `${avgHours}h`
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg. Time</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">
                    {(() => {
                      const totalMs = details.reduce((sum, d) => sum + (new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime()), 0)
                      const fastest = details.reduce((min, d) => {
                        const ms = new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime()
                        return ms < min ? ms : min
                      }, Infinity)
                      const h = Math.floor(fastest / 3600000)
                      const d = Math.floor(h / 24)
                      if (d > 0) return `${d}d`
                      if (h > 0) return `${h}h`
                      return `${Math.floor(fastest / 60000)}m`
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground">Fastest</p>
                </div>
              </div>

              {/* Conversion table */}
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Lead</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Loan Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Converted</TableHead>
                      <TableHead>Time Taken</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.phone}</TableCell>
                        <TableCell>
                          {d.loanType ? (
                            <Badge variant="secondary" className="text-xs">{d.loanType}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{(d.source ?? 'N/A').replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                        <TableCell className="text-xs text-success font-medium">{formatDate(d.updatedAt)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                            <Clock className="h-3 w-3" />
                            {formatDuration(d.createdAt, d.updatedAt)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No conversion details available.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function AdminOverview({ onNavigate }: { onNavigate: (k: string) => void }) {
  const stats = useStats()
  const s = stats.data as {
    totalLeads?: number
    newLeads?: number
    claimed?: number
    contacted?: number
    converted?: number
    rejected?: number
    followUps?: number
    callbacks?: number
    urgent?: number
    totalUsers?: number
    activeEmployees?: number
    totalPartners?: number
    pendingTransfers?: number
    openRequests?: number
    websiteLeadsUnprocessed?: number
    websiteUrgent?: number
    bySource?: Array<{ source: string; count: number }>
    topEmployees?: Array<{ user: { id: string; name: string; email: string } | null; converted: number }>
  } | undefined

  const sourceColors: Record<string, string> = {
    ENQUIRY_FORM: 'bg-brand',
    CHATBOT: 'bg-sky-500',
    CALLBACK_REQUEST: 'bg-destructive',
    CONTACT_FORM: 'bg-violet-500',
    PARTNER: 'bg-teal-500',
    IMPORT: 'bg-amber-500',
    MANUAL: 'bg-slate-400',
    REFERRAL: 'bg-emerald-500',
  }

  return (
    <div className="space-y-6">
      {/* Critical alerts */}
      {((s?.websiteUrgent ?? 0) > 0 || (s?.urgent ?? 0) > 0 || (s?.openRequests ?? 0) > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {(s?.websiteUrgent ?? 0) > 0 && (
            <Card className="border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-semibold text-destructive">{s?.websiteUrgent} urgent website lead(s)</p>
                  <Button size="sm" variant="link" className="h-auto p-0 text-destructive" onClick={() => onNavigate('website')}>Sync now →</Button>
                </div>
              </div>
            </Card>
          )}
          {(s?.urgent ?? 0) > 0 && (
            <Card className="border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-3">
                <PhoneCall className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-semibold text-destructive">{s?.urgent} urgent callback(s)</p>
                  <Button size="sm" variant="link" className="h-auto p-0 text-destructive" onClick={() => onNavigate('callbacks')}>View →</Button>
                </div>
              </div>
            </Card>
          )}
          {(s?.openRequests ?? 0) > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-3">
                <LifeBuoy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{s?.openRequests} open request(s)</p>
                  <Button size="sm" variant="link" className="h-auto p-0 text-amber-700 dark:text-amber-300" onClick={() => onNavigate('requests')}>Review →</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Key stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={s?.totalLeads ?? 0} icon={<Inbox className="h-5 w-5" />} hint={`${s?.newLeads ?? 0} new`} />
        <StatCard label="Converted" value={s?.converted ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard label="Urgent" value={s?.urgent ?? 0} icon={<AlertTriangle className="h-5 w-5" />} accent="urgent" />
        <StatCard label="Active Employees" value={s?.activeEmployees ?? 0} icon={<Users className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Leads by source */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-brand" />
            Leads by Source
          </h3>
          <div className="space-y-3">
            {(s?.bySource ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              (s?.bySource ?? []).map((row) => {
                const total = s?.totalLeads ?? 1
                const pct = Math.round((row.count / total) * 100)
                return (
                  <div key={row.source}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{row.source.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{row.count} · {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${sourceColors[row.source] ?? 'bg-brand'} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Top employees */}
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <UserCheck className="h-4 w-4 text-brand" />
            Top Converters
          </h3>
          {(s?.topEmployees ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversions yet</p>
          ) : (
            <div className="space-y-3">
              {(s?.topEmployees ?? []).map((t, i) => (
                <ConverterDetailTrigger key={i} rank={i + 1} employee={t} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="New" value={s?.newLeads ?? 0} icon={<Inbox className="h-4 w-4" />} />
        <StatCard label="Claimed" value={s?.claimed ?? 0} icon={<Handshake className="h-4 w-4" />} />
        <StatCard label="Follow-ups" value={s?.followUps ?? 0} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Callbacks" value={s?.callbacks ?? 0} icon={<PhoneCall className="h-4 w-4" />} />
        <StatCard label="Rejected" value={s?.rejected ?? 0} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Partners" value={s?.totalPartners ?? 0} icon={<Handshake className="h-4 w-4" />} />
      </div>
    </div>
  )
}

function AdminLeadBox() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [assignOpen, setAssignOpen] = React.useState(false)
  const [assignTo, setAssignTo] = React.useState('')
  const bulk = useBulkAssign()
  const { data: usersData } = useUsers('EMPLOYEE')
  const employees = (usersData?.users as { id: string; name: string; email: string }[]) ?? []

  async function doAssign() {
    if (!assignTo) {
      toast({ title: 'Select an employee', variant: 'destructive' })
      return
    }
    try {
      const res = await bulk.mutateAsync({ leadIds: selectedIds, assignedToId: assignTo })
      toast({ title: `Assigned ${res.assigned} lead(s)` })
      setSelectedIds([])
      setAssignOpen(false)
      setAssignTo('')
    } catch (e) {
      toast({ title: 'Assignment failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      {selectedIds.length > 0 && (
        <Card className="border-brand/30 bg-brand/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{selectedIds.length} lead(s) selected</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Clear</Button>
              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setAssignOpen(true)}>
                <UserCheck className="mr-1.5 h-4 w-4" />
                Bulk assign
              </Button>
            </div>
          </div>
        </Card>
      )}
      <LeadsView
        variant="all"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyTitle="No leads in the system"
        emptyDescription="Import leads or sync from the website."
      />

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {selectedIds.length} lead(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Assign to employee</Label>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name} · {e.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={doAssign} disabled={bulk.isPending} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {bulk.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdminCallbacksView() {
  const { user } = useAuth()
  const [page, setPage] = React.useState(1)
  const query = useLeads({ callbacks: true, page, pageSize: 20, sortBy: 'priority', sortDir: 'desc' })
  const [selected, setSelected] = React.useState<LeadRow | null>(null)
  const [open, setOpen] = React.useState(false)
  const { data: usersData } = useUsers('EMPLOYEE')
  const employees = (usersData?.users as { id: string; name: string; email: string }[]) ?? []

  return (
    <div className="space-y-4">
      <Card className="border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">{query.data?.total ?? 0} urgent callback(s)</p>
            <p className="text-xs text-muted-foreground">Assign these to employees for immediate action.</p>
          </div>
        </div>
      </Card>
      <LeadTable
        leads={query.data?.leads ?? []}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={20}
        loading={query.isLoading}
        user={user!}
        query=""
        onQueryChange={() => {}}
        statusFilter={[]}
        onStatusFilterChange={() => {}}
        priorityFilter={[]}
        onPriorityFilterChange={() => {}}
        sourceFilter={[]}
        onSourceFilterChange={() => {}}
        sortBy="priority"
        sortDir="desc"
        onSortChange={() => {}}
        onPageChange={setPage}
        onRowClick={(l) => { setSelected(l); setOpen(true) }}
        emptyTitle="No urgent callbacks"
        emptyDescription="All caught up."
      />
      <LeadDetailDrawer lead={selected} open={open} onOpenChange={setOpen} user={user!} employees={employees} onUpdated={() => query.refetch()} />
    </div>
  )
}

function AdminTransfersView() {
  const approve = useApproveTransfer()
  const { toast } = useToast()
  const transfers = useTransfers()
  const items = (transfers.data?.transfers ?? []) as Array<{
    id: string
    status: string
    reason: string | null
    createdAt: string
    lead: { id: string; name: string; phone: string }
    fromUser: { id: string; name: string }
    toUser: { id: string; name: string }
  }>

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    try {
      await approve.mutateAsync({ id, decision })
      toast({ title: `Transfer ${decision.toLowerCase()}` })
    } catch (e) {
      toast({ title: 'Failed', variant: 'destructive' })
    }
  }

  const pending = items.filter((t) => t.status === 'PENDING')
  const resolved = items.filter((t) => t.status !== 'PENDING')

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold">Pending approvals ({pending.length})</h3>
        {pending.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" />
            <p className="text-sm text-muted-foreground">No pending transfer requests</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((t) => (
              <div key={t.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.lead.name} · {t.lead.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{t.fromUser.name}</span> → <span className="font-medium">{t.toUser.name}</span>
                  </p>
                  {t.reason && <p className="mt-1 text-xs italic text-muted-foreground">"{t.reason}"</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => decide(t.id, 'REJECTED')} disabled={approve.isPending}>
                    Reject
                  </Button>
                  <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => decide(t.id, 'APPROVED')} disabled={approve.isPending}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {resolved.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">History</h3>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {resolved.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.lead.name}</p>
                  <p className="text-xs text-muted-foreground">{t.fromUser.name} → {t.toUser.name}</p>
                </div>
                <Badge variant={t.status === 'COMPLETED' ? 'default' : 'secondary'}>{t.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function AdminPartnersView() {
  const { toast } = useToast()
  const { data, isLoading, refetch } = usePartners()
  const [search, setSearch] = React.useState('')
  const [addOpen, setAddOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [selectedPartner, setSelectedPartner] = React.useState<{
    id: string
    companyName: string | null
    contactName: string | null
    phone: string | null
    email: string | null
    user: { id: string; email: string; name: string; active: boolean; lastLoginAt: string | null } | null
  } | null>(null)

  // Add partner form state
  const [newPartner, setNewPartner] = React.useState({
    contactName: '',
    companyName: '',
    email: '',
    phone: '',
    createLogin: true,
    password: '',
  })

  // Edit partner form state
  const [editForm, setEditForm] = React.useState({
    contactName: '',
    companyName: '',
    phone: '',
  })

  const partners = (data?.partners ?? []) as Array<{
    id: string
    companyName: string | null
    contactName: string | null
    phone: string | null
    email: string | null
    user: { id: string; email: string; name: string; active: boolean; lastLoginAt: string | null } | null
    stats: { total: number; converted: number; rejected: number; pending: number }
  }>

  const filtered = partners.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.companyName?.toLowerCase().includes(q) ||
      p.contactName?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.user?.name.toLowerCase().includes(q)
    )
  })

  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    let pw = ''
    for (let i = 0; i < 14; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    return pw
  }

  async function handleAddPartner() {
    if (!newPartner.contactName || !newPartner.companyName || !newPartner.email) {
      toast({ title: 'Fill required fields', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api.post('/api/users', {
        name: newPartner.contactName,
        email: newPartner.email,
        phone: newPartner.phone || undefined,
        role: 'PARTNER',
        companyName: newPartner.companyName,
        password: newPartner.createLogin ? (newPartner.password || generatePassword()) : undefined,
        active: true,
      })
      toast({ title: 'Partner created successfully' })
      setAddOpen(false)
      setNewPartner({ contactName: '', companyName: '', email: '', phone: '', createLogin: true, password: '' })
      refetch()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed to create partner', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(partnerId: string, userId: string, currentActive: boolean) {
    try {
      await api.patch(`/api/users/${userId}`, { active: !currentActive })
      toast({ title: `Partner ${currentActive ? 'deactivated' : 'activated'}` })
      refetch()
    } catch (e) {
      toast({ title: 'Failed to update', variant: 'destructive' })
    }
  }

  function openEdit(partner: typeof selectedPartner) {
    setSelectedPartner(partner)
    setEditForm({
      contactName: partner?.contactName ?? '',
      companyName: partner?.companyName ?? '',
      phone: partner?.phone ?? '',
    })
    setEditOpen(true)
  }

  async function handleEditSave() {
    if (!selectedPartner) return
    setSaving(true)
    try {
      await api.patch(`/api/users/${selectedPartner.user?.id}`, {
        name: editForm.contactName,
        phone: editForm.phone || undefined,
      })
      // Also update partner record
      await api.patch(`/api/partners/${selectedPartner.id}`, {
        companyName: editForm.companyName,
        contactName: editForm.contactName,
        phone: editForm.phone || undefined,
      }).catch(() => {}) // partner endpoint may not exist, that's ok
      toast({ title: 'Partner updated' })
      setEditOpen(false)
      refetch()
    } catch (e) {
      toast({ title: 'Failed to update', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedPartner?.user?.id) return
    setSaving(true)
    try {
      await api.delete(`/api/users/${selectedPartner.user.id}`)
      toast({ title: 'Partner deleted' })
      setDeleteOpen(false)
      setSelectedPartner(null)
      refetch()
    } catch (e) {
      toast({ title: 'Failed to delete', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search partners…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      {isLoading ? (
        <Card className="flex h-48 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <Handshake className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No partners match your search.' : 'No partners yet. Add one to get started.'}
          </p>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Partner</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Company</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Leads</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-brand/15 text-brand text-xs font-semibold">
                              {getInitials(p.contactName ?? p.user?.name ?? 'P')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.contactName ?? p.user?.name ?? '—'}</p>
                            <p className="truncate text-xs text-muted-foreground">{p.email ?? p.user?.email ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.companyName ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.user?.active ? 'default' : 'secondary'}>
                          {p.user?.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{p.stats.total}</span>
                        <span className="ml-1 text-xs text-muted-foreground">({p.stats.converted} converted)</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.user?.lastLoginAt ? new Date(p.user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {p.user && (
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8"
                              onClick={() => handleToggleActive(p.id, p.user!.id, p.user!.active)}
                            >
                              {p.user.active ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          {p.user && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setSelectedPartner(p); setDeleteOpen(true) }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-brand/15 text-brand text-xs font-semibold">
                        {getInitials(p.contactName ?? p.user?.name ?? 'P')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.contactName ?? p.user?.name ?? '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.companyName ?? '—'}</p>
                    </div>
                  </div>
                  <Badge variant={p.user?.active ? 'default' : 'secondary'}>
                    {p.user?.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.email ?? p.user?.email ?? '—'}</span>
                  <span className="font-semibold text-foreground">{p.stats.total} leads</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}>Edit</Button>
                  {p.user && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleToggleActive(p.id, p.user!.id, p.user!.active)}>
                      {p.user.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                  {p.user && (
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setSelectedPartner(p); setDeleteOpen(true) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add Partner Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Partner</DialogTitle>
            <DialogDescription>Create a partner account with optional login credentials.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Contact Name *</Label>
              <Input
                value={newPartner.contactName}
                onChange={(e) => setNewPartner({ ...newPartner, contactName: e.target.value })}
                placeholder="e.g. Rajesh Kapoor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input
                value={newPartner.companyName}
                onChange={(e) => setNewPartner({ ...newPartner, companyName: e.target.value })}
                placeholder="e.g. FinGrow Advisory Services"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newPartner.email}
                onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                placeholder="e.g. rajesh@fingrow.in"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={newPartner.phone}
                onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                placeholder="e.g. +91 98301 66778"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Create login credentials</Label>
                <p className="text-xs text-muted-foreground">Partner can sign in to the portal</p>
              </div>
              <Switch
                checked={newPartner.createLogin}
                onCheckedChange={(v) => setNewPartner({ ...newPartner, createLogin: v })}
              />
            </div>
            {newPartner.createLogin && (
              <div className="space-y-1.5">
                <Label>Password</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newPartner.password}
                    onChange={(e) => setNewPartner({ ...newPartner, password: e.target.value })}
                    placeholder="Auto-generated if left blank"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      const pw = generatePassword()
                      setNewPartner({ ...newPartner, password: pw })
                      navigator.clipboard.writeText(pw).catch(() => {})
                      toast({ title: 'Password generated & copied' })
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={handleAddPartner} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Partner Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Partner</DialogTitle>
            <DialogDescription>Update partner information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Contact Name</Label>
              <Input
                value={editForm.contactName}
                onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input
                value={editForm.companyName}
                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={handleEditSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Partner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedPartner?.companyName ?? selectedPartner?.contactName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdminRequestsView() {
  const { toast } = useToast()
  const requests = useInternalRequests()
  const items = (requests.data?.items ?? []) as Array<{
    id: string
    type: string
    subject: string
    description: string
    status: string
    priority: string
    response: string | null
    createdAt: string
    leadId: string | null
    requestedBy: { id: string; name: string; role: string; email: string }
    assignedTo: { id: string; name: string } | null
  }>

  async function respond(id: string, status: string, response: string) {
    try {
      await api.patch(`/api/internal-requests/${id}`, { status, response })
      toast({ title: 'Response sent' })
      requests.refetch()
    } catch (e) {
      toast({ title: 'Failed', variant: 'destructive' })
    }
  }

  return (
    <Card className="p-5">
      <h3 className="mb-4 text-sm font-semibold">Internal Requests</h3>
      {items.length === 0 ? (
        <div className="py-8 text-center">
          <LifeBuoy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <RequestCard key={r.id} request={r} onRespond={respond} />
          ))}
        </div>
      )}
    </Card>
  )
}

function RequestCard({
  request,
  onRespond,
}: {
  request: {
    id: string
    type: string
    subject: string
    description: string
    status: string
    priority: string
    response: string | null
    createdAt: string
    requestedBy: { id: string; name: string; role: string; email: string }
  }
  onRespond: (id: string, status: string, response: string) => void
}) {
  const [response, setResponse] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const priorityTone = request.priority === 'URGENT' ? 'border-destructive/40 bg-destructive/5' : request.priority === 'HIGH' ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'

  return (
    <div className={cn('rounded-lg border p-4', priorityTone)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{request.type.replace(/_/g, ' ')}</Badge>
            <Badge variant="outline" className="text-[10px]">{request.priority}</Badge>
            <Badge variant={request.status === 'OPEN' ? 'destructive' : request.status === 'RESOLVED' || request.status === 'CLOSED' ? 'default' : 'secondary'} className="text-[10px]">
              {request.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm font-medium">{request.subject}</p>
          <p className="mt-1 text-sm text-muted-foreground">{request.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            From {request.requestedBy.name} ({request.requestedBy.role}) · {new Date(request.createdAt).toLocaleString('en-IN')}
          </p>
          {request.response && (
            <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
              <span className="font-medium">Response: </span>{request.response}
            </div>
          )}
        </div>
        {request.status === 'OPEN' && (
          <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
            Respond
          </Button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <Textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Write a response…" rows={2} />
          <div className="flex gap-2">
            <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => onRespond(request.id, 'RESOLVED', response)}>
              Resolve
            </Button>
            <Button size="sm" variant="outline" onClick={() => onRespond(request.id, 'IN_PROGRESS', response)}>
              Mark in progress
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminAuditView() {
  const [page, setPage] = React.useState(1)
  const { data, isLoading } = useActivities(page)
  const items = (data?.items ?? []) as Array<{
    id: string
    action: string
    details: string | null
    createdAt: string
    user: { id: string; name: string; role: string; email: string }
    lead: { id: string; name: string; phone: string } | null
  }>

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Activity Log</h3>
        <p className="text-xs text-muted-foreground">{data?.total ?? 0} total events</p>
      </div>
      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="max-h-[36rem] space-y-1 overflow-y-auto">
          {items.map((a) => (
            <div key={a.id} className="flex gap-3 border-l-2 border-border py-2 pl-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{a.user.name}</span>
                  <span className="ml-2 inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{a.action.replace(/_/g, ' ')}</span>
                </p>
                {a.details && <p className="text-xs text-muted-foreground">{a.details}</p>}
                {a.lead && <p className="text-xs text-muted-foreground">Lead: {a.lead.name} · {a.lead.phone}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {(data?.total ?? 0) > 50 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-xs text-muted-foreground">Page {page}</span>
          <Button size="sm" variant="outline" disabled={page * 50 >= (data?.total ?? 0)} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </Card>
  )
}

function AdminSettingsView() {
  const { toast } = useToast()
  const [settings, setSettings] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    api.get<{ settings: Record<string, string> }>('/api/settings').then((r) => {
      setSettings(r.settings)
    }).finally(() => setLoading(false))
  }, [])

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function isOn(key: string) {
    return settings[key] === 'true' || settings[key] === '1'
  }

  function toggle(key: string) {
    setSettings((prev) => ({ ...prev, [key]: isOn(key) ? 'false' : 'true' }))
  }

  async function save() {
    setSaving(true)
    try {
      await api.patch('/api/settings', settings)
      toast({ title: 'Settings saved successfully' })
    } catch (e) {
      toast({ title: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>

  return (
    <div className="max-w-3xl space-y-6">
      {/* Card 1: Lead Management */}
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15">
            <Inbox className="h-4 w-4 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Lead Management</h3>
            <p className="text-xs text-muted-foreground">Configure lead handling defaults</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Default lead priority</Label>
            <Select
              value={settings.defaultPriority ?? 'MEDIUM'}
              onValueChange={(v) => update('defaultPriority', v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Lead follow-up reminder</Label>
            <Select
              value={settings.followUpReminder ?? '24h'}
              onValueChange={(v) => update('followUpReminder', v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="3h">3 hours</SelectItem>
                <SelectItem value="6h">6 hours</SelectItem>
                <SelectItem value="12h">12 hours</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Max leads per employee</Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={settings.maxLeadsPerEmployee ?? '50'}
              onChange={(e) => update('maxLeadsPerEmployee', e.target.value)}
                />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <div>
              <Label>Auto-assign leads</Label>
              <p className="text-xs text-muted-foreground">Automatically distribute new leads to employees</p>
            </div>
            <Switch checked={isOn('autoAssignLeads')} onCheckedChange={() => toggle('autoAssignLeads')} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <div>
              <Label>Allow duplicate leads</Label>
              <p className="text-xs text-muted-foreground">Allow leads with the same phone number to be created</p>
            </div>
            <Switch checked={isOn('allowDuplicateLeads')} onCheckedChange={() => toggle('allowDuplicateLeads')} />
          </div>
        </div>
      </Card>

      {/* Card 2: Notifications */}
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15">
            <Bell className="h-4 w-4 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">Control alerts and notification channels</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Email notifications</Label>
              <p className="text-xs text-muted-foreground">Send email alerts for lead updates</p>
            </div>
            <Switch checked={isOn('emailNotifications')} onCheckedChange={() => toggle('emailNotifications')} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Urgent lead alerts</Label>
              <p className="text-xs text-muted-foreground">Instant alerts for urgent priority leads</p>
            </div>
            <Switch checked={isOn('urgentLeadAlerts')} onCheckedChange={() => toggle('urgentLeadAlerts')} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Daily summary report</Label>
              <p className="text-xs text-muted-foreground">Send a daily email summary of all activity</p>
            </div>
            <Switch checked={isOn('dailySummaryReport')} onCheckedChange={() => toggle('dailySummaryReport')} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>New lead notification sound</Label>
              <p className="text-xs text-muted-foreground">Play a sound when a new lead arrives</p>
            </div>
            <Switch checked={isOn('newLeadSound')} onCheckedChange={() => toggle('newLeadSound')} />
          </div>
        </div>
      </Card>

      {/* Card 3: Security */}
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15">
            <Shield className="h-4 w-4 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Security</h3>
            <p className="text-xs text-muted-foreground">Authentication and session policies</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Session timeout</Label>
            <Select
              value={settings.sessionTimeout ?? '30m'}
              onValueChange={(v) => update('sessionTimeout', v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">15 minutes</SelectItem>
                <SelectItem value="30m">30 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="4h">4 hours</SelectItem>
                <SelectItem value="8h">8 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Password expiry (days)</Label>
            <Input
              type="number"
              min={0}
              max={365}
              value={settings.passwordExpiryDays ?? '0'}
              onChange={(e) => update('passwordExpiryDays', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">0 = never expire</p>
          </div>
          <div className="space-y-1.5">
            <Label>Minimum password length</Label>
            <Input
              type="number"
              min={6}
              max={32}
              value={settings.minPasswordLength ?? '8'}
              onChange={(e) => update('minPasswordLength', e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <div>
              <Label>Allow partner self-registration</Label>
              <p className="text-xs text-muted-foreground">Partners can create their own accounts via a public link</p>
            </div>
            <Switch checked={isOn('partnerSelfRegistration')} onCheckedChange={() => toggle('partnerSelfRegistration')} />
          </div>
        </div>
      </Card>

      {/* Card 4: Display */}
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15">
            <Monitor className="h-4 w-4 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Display</h3>
            <p className="text-xs text-muted-foreground">UI preferences and list view settings</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Default view</Label>
            <Select
              value={settings.defaultView ?? 'table'}
              onValueChange={(v) => update('defaultView', v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Leads per page</Label>
            <Select
              value={settings.leadsPerPage ?? '25'}
              onValueChange={(v) => update('leadsPerPage', v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Show lead source column</Label>
              <p className="text-xs text-muted-foreground">Display source column in lead tables</p>
            </div>
            <Switch checked={isOn('showLeadSource')} onCheckedChange={() => toggle('showLeadSource')} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Compact mode</Label>
              <p className="text-xs text-muted-foreground">Reduce spacing for denser data display</p>
            </div>
            <Switch checked={isOn('compactMode')} onCheckedChange={() => toggle('compactMode')} />
          </div>
        </div>
      </Card>

      {/* Global Save */}
      <div className="flex items-center justify-end gap-3">
        <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save All Settings
        </Button>
      </div>

      {/* Deployment info */}
      <Card className="p-6">
        <h3 className="mb-2 text-sm font-semibold">Deployment</h3>
        <p className="text-sm text-muted-foreground">
          This CRM is configured for deployment to Vercel at <code className="rounded bg-muted px-1.5 py-0.5 text-xs">agent.velixacapital.in</code>.
          Set the required environment variables (JWT_SECRET, BOOTSTRAP_ADMIN_*, DATABASE_URL) in your Vercel project settings.
        </p>
      </Card>
    </div>
  )
}
