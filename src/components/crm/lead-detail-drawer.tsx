'use client'

import * as React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  StatusBadge,
  PriorityBadge,
  SourceBadge,
} from '@/components/crm/badges'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError } from '@/lib/api-client'
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  Clock,
  Calendar,
  Plus,
  Send,
  CheckCircle2,
  RefreshCw,
  ArrowRightLeft,
  MessageSquare,
  StickyNote,
  History,
  Loader2,
  Wallet,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  FOLLOWUP_TYPES,
  type LeadStatus,
  type LeadPriority,
  type FollowUpType,
} from '@/lib/constants'
import type { CurrentUser } from '@/components/auth-provider'
import type { LeadRow } from './lead-table'

interface FullLead extends LeadRow {
  email: string | null
  altPhone: string | null
  employmentType: string | null
  monthlyIncome: number | null
  state: string | null
  notes: string | null
  origin: string
  nextFollowUpAt: string | null
  lastContactedAt: string | null
  claimedAt: string | null
  websiteLead?: {
    id: string
    source: string
    message: string | null
    preferredCallbackTime: string | null
    isUrgent: boolean
    submittedAt: string
  } | null
  notesRel: {
    id: string
    content: string
    isPinned: boolean
    createdAt: string
    author: { id: string; name: string; role: string }
  }[]
  followups: {
    id: string
    scheduledAt: string
    type: string
    notes: string | null
    completed: boolean
    completedAt: string | null
    author: { id: string; name: string }
  }[]
  activities: {
    id: string
    action: string
    details: string | null
    createdAt: string
    user: { id: string; name: string; role: string }
  }[]
}

interface LeadDetailDrawerProps {
  lead: LeadRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  user: CurrentUser
  employees?: { id: string; name: string; email: string }[]
  onUpdated?: () => void
}

const formatMoney = (n: number | null) =>
  n == null
    ? '—'
    : n >= 10000000
      ? `₹${(n / 10000000).toFixed(2)} Cr`
      : n >= 100000
        ? `₹${(n / 100000).toFixed(2)} L`
        : `₹${n.toLocaleString('en-IN')}`

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export function LeadDetailDrawer({
  lead,
  open,
  onOpenChange,
  user,
  employees = [],
  onUpdated,
}: LeadDetailDrawerProps) {
  const { toast } = useToast()
  const [full, setFull] = React.useState<FullLead | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [tab, setTab] = React.useState('overview')

  // note form
  const [noteText, setNoteText] = React.useState('')
  // followup form
  const [fuAt, setFuAt] = React.useState('')
  const [fuType, setFuType] = React.useState<FollowUpType>('CALL')
  const [fuNotes, setFuNotes] = React.useState('')
  // transfer dialog
  const [transferOpen, setTransferOpen] = React.useState(false)
  const [transferTo, setTransferTo] = React.useState('')
  const [transferReason, setTransferReason] = React.useState('')

  const loadLead = React.useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await api.get<{ lead: FullLead }>(`/api/leads/${id}`)
      setFull(res.lead)
    } catch (e) {
      toast({ title: 'Failed to load lead', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    if (lead && open) {
      loadLead(lead.id)
      setTab('overview')
    } else if (!open) {
      setFull(null)
      setNoteText('')
      setFuAt('')
      setFuNotes('')
    }
  }, [lead, open, loadLead])

  const canEdit =
    user.role === 'ADMIN' ||
    (user.role === 'EMPLOYEE' && full?.assignedToId === user.id) ||
    (user.role === 'PARTNER' && full?.partner?.id === user.partnerId)

  async function updateStatus(status: LeadStatus) {
    if (!full) return
    try {
      await api.patch(`/api/leads/${full.id}`, { status })
      toast({ title: `Status updated to ${status.replace('_', ' ')}` })
      loadLead(full.id)
      onUpdated?.()
    } catch (e) {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    }
  }

  async function updatePriority(priority: LeadPriority) {
    if (!full) return
    try {
      await api.patch(`/api/leads/${full.id}`, { priority })
      toast({ title: `Priority set to ${priority}` })
      loadLead(full.id)
      onUpdated?.()
    } catch (e) {
      toast({ title: 'Failed to update priority', variant: 'destructive' })
    }
  }

  async function addNote() {
    if (!full || !noteText.trim()) return
    try {
      await api.post(`/api/leads/${full.id}/notes`, { content: noteText.trim() })
      setNoteText('')
      toast({ title: 'Note added' })
      loadLead(full.id)
      onUpdated?.()
    } catch (e) {
      toast({ title: 'Failed to add note', variant: 'destructive' })
    }
  }

  async function scheduleFollowUp() {
    if (!full || !fuAt) {
      toast({ title: 'Pick a date & time', variant: 'destructive' })
      return
    }
    try {
      await api.post(`/api/leads/${full.id}/followups`, {
        scheduledAt: new Date(fuAt).toISOString(),
        type: fuType,
        notes: fuNotes.trim() || undefined,
      })
      setFuAt('')
      setFuNotes('')
      toast({ title: 'Follow-up scheduled' })
      loadLead(full.id)
      onUpdated?.()
    } catch (e) {
      toast({ title: 'Failed to schedule follow-up', variant: 'destructive' })
    }
  }

  async function completeFollowUp(id: string) {
    if (!full) return
    try {
      await api.patch(`/api/leads/${full.id}/followups?followupId=${id}`)
      toast({ title: 'Follow-up completed' })
      loadLead(full.id)
      onUpdated?.()
    } catch (e) {
      toast({ title: 'Failed to update follow-up', variant: 'destructive' })
    }
  }

  async function submitTransfer() {
    if (!full || !transferTo) {
      toast({ title: 'Select a recipient', variant: 'destructive' })
      return
    }
    try {
      const res = await api.post<{ requiresApproval: boolean }>('/api/leads/transfer', {
        leadId: full.id,
        toUserId: transferTo,
        reason: transferReason.trim() || undefined,
      })
      if (res.requiresApproval) {
        toast({
          title: 'Transfer requested',
          description: 'An admin will approve the transfer.',
        })
      } else {
        toast({ title: 'Lead transferred' })
      }
      setTransferOpen(false)
      setTransferTo('')
      setTransferReason('')
      loadLead(full.id)
      onUpdated?.()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Transfer failed'
      toast({ title: msg, variant: 'destructive' })
    }
  }

  const isUrgent = full?.priority === 'URGENT' || full?.status === 'CALLBACK'
  const whatsappNumber = React.useMemo(() => {
    const digits = (full?.phone ?? lead?.phone ?? '').replace(/\D/g, '')
    if (!digits) return ''
    const normalized = digits.startsWith('0') ? digits.slice(1) : digits
    return digits.startsWith('91') ? digits : `91${normalized}`
  }, [full?.phone, lead?.phone])
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi ${full?.name ?? lead?.name}, this is Velixa Capital. We are following up on your loan enquiry. Please connect with us.`)}` : ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-2xl">
        <SheetHeader
          className={cn(
            'border-b border-border px-6 py-4',
            isUrgent && 'bg-destructive/5'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl">{full?.name ?? lead?.name}</SheetTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {full && <StatusBadge status={full.status} />}
                {full && <PriorityBadge priority={full.priority} />}
                {full && <SourceBadge source={full.source} />}
                {isUrgent && (
                  <Badge variant="destructive" className="animate-pulse-urgent">
                    URGENT CALLBACK
                  </Badge>
                )}
              </div>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </SheetHeader>

        {/* Quick actions bar */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-3">
          <Button asChild size="sm" className="bg-success text-white hover:bg-success/90">
            <a href={`tel:${full?.phone ?? lead?.phone}`}>
              <Phone className="mr-1.5 h-4 w-4" />
              Call now
            </a>
          </Button>
          {whatsappNumber && (
            <Button asChild size="sm" variant="outline" className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <MessageSquare className="mr-1.5 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          )}
          {full?.email && (
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${full.email}`}>
                <Mail className="mr-1.5 h-4 w-4" />
                Email
              </a>
            </Button>
          )}
          {canEdit && (user.role === 'EMPLOYEE' || user.role === 'ADMIN') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTransferOpen(true)}
              disabled={user.role === 'EMPLOYEE' && !user.canTransferLeads}
            >
              <ArrowRightLeft className="mr-1.5 h-4 w-4" />
              Transfer
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => full && loadLead(full.id)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">
              Notes
              {full && full.notesRel.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] font-bold">
                  {full.notesRel.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="followups">Follow-ups</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="px-6 pb-8 pt-4">
              {tab === 'overview' && full && (
                <OverviewTab
                  lead={full}
                  canEdit={canEdit}
                  user={user}
                  onStatus={updateStatus}
                  onPriority={updatePriority}
                />
              )}
              {tab === 'notes' && full && (
                <NotesTab
                  lead={full}
                  text={noteText}
                  onText={setNoteText}
                  onAdd={addNote}
                  canEdit={canEdit}
                />
              )}
              {tab === 'followups' && full && (
                <FollowUpsTab
                  lead={full}
                  fuAt={fuAt}
                  onFuAt={setFuAt}
                  fuType={fuType}
                  onFuType={setFuType}
                  fuNotes={fuNotes}
                  onFuNotes={setFuNotes}
                  onSchedule={scheduleFollowUp}
                  onComplete={completeFollowUp}
                  canEdit={canEdit}
                />
              )}
              {tab === 'activity' && full && <ActivityTab lead={full} />}
            </div>
          </ScrollArea>
        </Tabs>

        {/* Transfer dialog */}
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Transfer to</Label>
                <Select value={transferTo} onValueChange={setTransferTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter((e) => e.id !== user.id)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} · {e.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Reason for transfer…"
                  rows={3}
                />
              </div>
              {user.role === 'EMPLOYEE' && (
                <p className="text-xs text-muted-foreground">
                  As an employee, your transfer will be submitted for admin approval.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitTransfer} className="bg-brand text-brand-foreground hover:bg-brand/90">
                {user.role === 'EMPLOYEE' ? 'Request transfer' : 'Transfer now'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  )
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

function OverviewTab({
  lead, canEdit, user, onStatus, onPriority,
}: {
  lead: FullLead
  canEdit: boolean
  user: CurrentUser
  onStatus: (s: LeadStatus) => void
  onPriority: (p: LeadPriority) => void
}) {
  return (
    <div className="space-y-5">
      {/* Status controls */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
          {canEdit ? (
            <Select value={lead.status} onValueChange={(v) => onStatus(v as LeadStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="pt-1"><StatusBadge status={lead.status} /></div>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Priority</Label>
          {canEdit && user.role === 'ADMIN' ? (
            <Select value={lead.priority} onValueChange={(v) => onPriority(v as LeadPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="pt-1"><PriorityBadge priority={lead.priority} /></div>
          )}
        </div>
      </div>

      {/* Lead info grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={
          <a href={`tel:${lead.phone}`} className="text-brand hover:underline">{lead.phone}</a>
        } />
        {lead.altPhone && (
          <Field icon={<Phone className="h-4 w-4" />} label="Alt Phone" value={
            <a href={`tel:${lead.altPhone}`} className="text-brand hover:underline">{lead.altPhone}</a>
          } />
        )}
        {lead.email && <Field icon={<Mail className="h-4 w-4" />} label="Email" value={lead.email} />}
        {lead.city && <Field icon={<MapPin className="h-4 w-4" />} label="City" value={`${lead.city}${lead.state ? ', ' + lead.state : ''}`} />}
        <Field icon={<Wallet className="h-4 w-4" />} label="Loan Amount" value={formatMoney(lead.loanAmount)} />
        {lead.loanType && <Field icon={<Building2 className="h-4 w-4" />} label="Loan Type" value={lead.loanType} />}
        {lead.cibilScore && <Field icon={<FileText className="h-4 w-4" />} label="CIBIL Score" value={lead.cibilScore} />}
        {lead.employmentType && <Field icon={<User className="h-4 w-4" />} label="Employment" value={lead.employmentType} />}
        {lead.monthlyIncome != null && <Field icon={<Wallet className="h-4 w-4" />} label="Monthly Income" value={formatMoney(lead.monthlyIncome)} />}
        <Field icon={<Clock className="h-4 w-4" />} label="Last Contacted" value={fmtDate(lead.lastContactedAt)} />
        <Field icon={<Calendar className="h-4 w-4" />} label="Next Follow-up" value={fmtDate(lead.nextFollowUpAt)} />
        <Field icon={<Clock className="h-4 w-4" />} label="Created" value={fmtDate(lead.createdAt)} />
      </div>

      {/* Assignment */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assignment</p>
        <div className="mt-2 flex items-center gap-3">
          {lead.assignedTo ? (
            <>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-muted text-xs">
                  {lead.assignedTo.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{lead.assignedTo.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{lead.assignedTo.role}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Unassigned — available in the Lead Box</p>
          )}
        </div>
      </div>

      {/* Website source info */}
      {lead.websiteLead && (
        <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-brand">
            <Building2 className="h-4 w-4" />
            From Website — {lead.websiteLead.source.replace('_', ' ')}
          </p>
          {lead.websiteLead.message && (
            <p className="mt-2 text-sm">{lead.websiteLead.message}</p>
          )}
          {lead.websiteLead.preferredCallbackTime && (
            <p className="mt-1 text-sm font-medium">
              Preferred callback: {lead.websiteLead.preferredCallbackTime}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Submitted {fmtDate(lead.websiteLead.submittedAt)}
          </p>
        </div>
      )}

      {/* Notes field */}
      {lead.notes && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <StickyNote className="h-4 w-4" />
            Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{lead.notes}</p>
        </div>
      )}
    </div>
  )
}

function NotesTab({
  lead, text, onText, onAdd, canEdit,
}: {
  lead: FullLead
  text: string
  onText: (v: string) => void
  onAdd: () => void
  canEdit: boolean
}) {
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => onText(e.target.value)}
            placeholder="Add a note about this lead…"
            rows={3}
          />
          <Button onClick={onAdd} disabled={!text.trim()} size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Plus className="mr-1.5 h-4 w-4" />
            Add note
          </Button>
        </div>
      )}
      <div className="space-y-3">
        {lead.notesRel.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </div>
        ) : (
          lead.notesRel.map((n) => (
            <div key={n.id} className={cn('rounded-lg border border-border bg-card p-3', n.isPinned && 'border-brand/40 bg-brand/5')}>
              <p className="whitespace-pre-wrap text-sm">{n.content}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px]">
                    {n.author.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{n.author.name}</span>
                <span>·</span>
                <span>{fmtDate(n.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function FollowUpsTab({
  lead, fuAt, onFuAt, fuType, onFuType, fuNotes, onFuNotes, onSchedule, onComplete, canEdit,
}: {
  lead: FullLead
  fuAt: string
  onFuAt: (v: string) => void
  fuType: FollowUpType
  onFuType: (v: FollowUpType) => void
  fuNotes: string
  onFuNotes: (v: string) => void
  onSchedule: () => void
  onComplete: (id: string) => void
  canEdit: boolean
}) {
  const now = new Date()
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Schedule a follow-up</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date & time</Label>
              <Input type="datetime-local" value={fuAt} onChange={(e) => onFuAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={fuType} onValueChange={(v) => onFuType(v as FollowUpType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOWUP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={fuNotes} onChange={(e) => onFuNotes(e.target.value)} rows={2} placeholder="What's this follow-up about?" />
          </div>
          <Button onClick={onSchedule} size="sm" className="mt-3 bg-brand text-brand-foreground hover:bg-brand/90">
            <Send className="mr-1.5 h-4 w-4" />
            Schedule
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {lead.followups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No follow-ups scheduled</p>
          </div>
        ) : (
          lead.followups.map((f) => {
            const overdue = !f.completed && new Date(f.scheduledAt) < now
            return (
              <div
                key={f.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border bg-card p-3',
                  f.completed ? 'border-border opacity-70' : overdue ? 'border-destructive/40 bg-destructive/5' : 'border-border'
                )}
              >
                <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', f.completed ? 'bg-success/15 text-success' : overdue ? 'bg-destructive/15 text-destructive' : 'bg-brand/15 text-brand')}>
                  {f.completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{f.type.toLowerCase()}</span>
                    {overdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                    {f.completed && <Badge variant="outline" className="text-[10px]">Done</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {fmtDate(f.scheduledAt)} · by {f.author.name}
                  </p>
                  {f.notes && <p className="mt-1 text-sm">{f.notes}</p>}
                </div>
                {!f.completed && canEdit && (
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => onComplete(f.id)}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function ActivityTab({ lead }: { lead: FullLead }) {
  return (
    <div className="space-y-1">
      {lead.activities.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <History className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
        </div>
      ) : (
        lead.activities.map((a) => (
          <div key={a.id} className="flex gap-3 border-l-2 border-border py-2 pl-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{a.action.replace(/_/g, ' ')}</p>
              {a.details && <p className="text-xs text-muted-foreground">{a.details}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {a.user.name} · {fmtDate(a.createdAt)}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
