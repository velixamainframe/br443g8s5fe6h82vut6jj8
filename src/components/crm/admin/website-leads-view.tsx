'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useWebsiteLeads, useSyncWebsiteLeads } from '@/components/crm/hooks'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowDownToLine,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SOURCE_LABEL: Record<string, string> = {
  ENQUIRY_FORM: 'Enquiry Form',
  CHATBOT: 'Chatbot',
  CALLBACK_REQUEST: 'Callback Request',
  CONTACT_FORM: 'Contact Form',
}

export function WebsiteLeadsView() {
  const { toast } = useToast()
  const [filter, setFilter] = React.useState<'all' | 'urgent' | 'unprocessed'>('all')
  const { data, isLoading, refetch } = useWebsiteLeads({
    urgent: filter === 'urgent',
    unprocessed: filter === 'unprocessed',
  })
  const sync = useSyncWebsiteLeads()
  const [selected, setSelected] = React.useState<string[]>([])

  const items = data?.items ?? []

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }
  function toggleAll() {
    setSelected((s) => (s.length === items.length ? [] : items.map((i) => i.id)))
  }

  async function importSelected() {
    if (selected.length === 0) {
      toast({ title: 'Select at least one lead', variant: 'destructive' })
      return
    }
    try {
      const res = await sync.mutateAsync(selected)
      toast({
        title: `Imported ${res.imported} lead(s)`,
        description: res.skipped ? `${res.skipped} already imported` : undefined,
      })
      setSelected([])
    } catch (e) {
      toast({ title: 'Import failed', variant: 'destructive' })
    }
  }

  async function importAllUrgent() {
    const urgent = items.filter((i) => i.isUrgent && !i.leadId).map((i) => i.id)
    if (!urgent.length) {
      toast({ title: 'No urgent leads to import' })
      return
    }
    try {
      const res = await sync.mutateAsync(urgent)
      toast({ title: `Imported ${res.imported} urgent lead(s)` })
    } catch (e) {
      toast({ title: 'Import failed', variant: 'destructive' })
    }
  }

  const allChecked = items.length > 0 && selected.length === items.length

  return (
    <div className="space-y-4">
      <Card className="border-brand/30 bg-brand/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Website Lead Sync</p>
              <p className="text-xs text-muted-foreground">
                Leads submitted on velixacapital.in appear here. Import them into the Lead Box to assign.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={filter === 'all'} onClick={() => { setFilter('all'); setSelected([]) }}>All</FilterPill>
        <FilterPill active={filter === 'unprocessed'} onClick={() => { setFilter('unprocessed'); setSelected([]) }}>Unprocessed</FilterPill>
        <FilterPill active={filter === 'urgent'} onClick={() => { setFilter('urgent'); setSelected([]) }}>
          <AlertTriangle className="mr-1 h-3 w-3 text-destructive" />
          Urgent
        </FilterPill>
        <div className="ml-auto flex items-center gap-2">
          {selected.length > 0 && (
            <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={importSelected} disabled={sync.isPending}>
              {sync.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ArrowDownToLine className="mr-1.5 h-4 w-4" />}
              Import {selected.length} selected
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={importAllUrgent} disabled={sync.isPending}>
            Import all urgent
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Loan</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">No website leads</TableCell></TableRow>
              ) : (
                items.map((w) => {
                  const urgent = w.isUrgent || w.source === 'CALLBACK_REQUEST'
                  return (
                    <TableRow
                      key={w.id}
                      className={cn('cursor-pointer', urgent && !w.leadId && 'bg-destructive/5')}
                      onClick={() => toggle(w.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.includes(w.id)} onCheckedChange={() => toggle(w.id)} />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{w.name}</p>
                        {w.city && <p className="text-xs text-muted-foreground">{w.city}</p>}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{w.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">{SOURCE_LABEL[w.source] ?? w.source}</Badge>
                        {urgent && <Badge variant="destructive" className="ml-1 animate-pulse-urgent">URGENT</Badge>}
                      </TableCell>
                      <TableCell>
                        {w.loanAmount && <p className="text-sm">₹{Number(w.loanAmount).toLocaleString('en-IN')}</p>}
                        {w.loanType && <p className="text-xs text-muted-foreground">{w.loanType}</p>}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-xs text-muted-foreground">{w.message ?? '—'}</p>
                        {w.preferredCallbackTime && (
                          <p className="text-xs font-medium text-destructive">Callback: {w.preferredCallbackTime}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {w.leadId ? (
                          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Imported
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(w.submittedAt).toLocaleDateString('en-IN')}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-brand bg-brand text-brand-foreground'
          : 'border-border bg-card text-muted-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}
