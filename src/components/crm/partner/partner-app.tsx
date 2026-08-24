'use client'

import * as React from 'react'
import { DashboardShell, type NavItem } from '@/components/crm/dashboard-shell'
import { StatCard } from '@/components/crm/stat-card'
import { LeadsView } from '@/components/crm/leads-view'
import { LeadDetailDrawer } from '@/components/crm/lead-detail-drawer'
import { LeadTable, type LeadRow } from '@/components/crm/lead-table'
import { useStats, useLeads, useImportLeads } from '@/components/crm/hooks'
import { useAuth } from '@/components/auth-provider'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError } from '@/lib/api-client'
import { LOAN_TYPES, EMPLOYMENT_TYPES } from '@/lib/constants'
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
  UserPlus,
  Upload,
  Users,
  Settings,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Loader2,
  Download,
} from 'lucide-react'

export function PartnerApp() {
  const { user } = useAuth()
  const [active, setActive] = React.useState('overview')
  const stats = useStats()

  const nav: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'submit', label: 'Submit Lead', icon: UserPlus },
    { key: 'upload', label: 'Upload Leads', icon: Upload },
    { key: 'leads', label: 'My Leads', icon: Users, badge: (stats.data as { submitted?: number })?.submitted },
    { key: 'profile', label: 'Profile', icon: Settings },
  ]

  const titles: Record<string, { title: string; subtitle: string }> = {
    overview: { title: 'Partner Dashboard', subtitle: `${user?.partner?.companyName ?? user?.name}` },
    submit: { title: 'Submit a Lead', subtitle: 'Add a single lead manually' },
    upload: { title: 'Bulk Upload Leads', subtitle: 'Upload an Excel/CSV file' },
    leads: { title: 'My Leads', subtitle: 'Track submitted leads and statuses' },
    profile: { title: 'Profile & Settings', subtitle: 'Your account details' },
  }

  return (
    <DashboardShell
      nav={nav}
      active={active}
      onNavigate={setActive}
      title={titles[active]?.title ?? 'Dashboard'}
      subtitle={titles[active]?.subtitle}
    >
      {active === 'overview' && <PartnerOverview onNavigate={setActive} />}
      {active === 'submit' && <SubmitLeadView onDone={() => setActive('leads')} />}
      {active === 'upload' && <UploadLeadsView onDone={() => setActive('leads')} />}
      {active === 'leads' && (
        <LeadsView
          variant="partner"
          emptyTitle="No leads submitted yet"
          emptyDescription="Submit your first lead to get started."
        />
      )}
      {active === 'profile' && <ProfileView />}
    </DashboardShell>
  )
}

function PartnerOverview({ onNavigate }: { onNavigate: (k: string) => void }) {
  const stats = useStats()
  const s = stats.data as {
    submitted?: number
    processed?: number
    approved?: number
    rejected?: number
    pending?: number
  } | undefined

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total submitted" value={s?.submitted ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Pending" value={s?.pending ?? 0} icon={<Clock className="h-5 w-5" />} accent="warning" />
        <StatCard label="Approved" value={s?.approved ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard label="Rejected" value={s?.rejected ?? 0} icon={<XCircle className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Lead pipeline</h3>
          <div className="space-y-3">
            <PipelineBar label="Pending review" value={s?.pending ?? 0} total={s?.submitted ?? 1} tone="bg-amber-500" />
            <PipelineBar label="In process" value={s?.processed ?? 0} total={s?.submitted ?? 1} tone="bg-sky-500" />
            <PipelineBar label="Approved" value={s?.approved ?? 0} total={s?.submitted ?? 1} tone="bg-emerald-500" />
            <PipelineBar label="Rejected" value={s?.rejected ?? 0} total={s?.submitted ?? 1} tone="bg-rose-500" />
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Quick actions</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('submit')}>
              <UserPlus className="mr-2 h-4 w-4" /> Submit a lead
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('upload')}>
              <Upload className="mr-2 h-4 w-4" /> Upload CSV/Excel
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('leads')}>
              <Users className="mr-2 h-4 w-4" /> View my leads
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function PipelineBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} · {pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SubmitLeadView({ onDone }: { onDone: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = React.useState({
    name: '', phone: '', altPhone: '', email: '', cibilScore: '',
    loanAmount: '', loanType: '', employmentType: '', monthlyIncome: '',
    city: '', state: '', notes: '',
  })
  const [loading, setLoading] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: 'Name and phone are required', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await api.post<{ duplicate?: boolean }>('/api/leads', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        altPhone: form.altPhone || undefined,
        email: form.email || undefined,
        cibilScore: form.cibilScore || undefined,
        loanAmount: form.loanAmount ? Number(form.loanAmount) : undefined,
        loanType: form.loanType || undefined,
        employmentType: form.employmentType || undefined,
        monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        notes: form.notes || undefined,
      })
      toast({
        title: res.duplicate ? 'Lead already exists' : 'Lead submitted',
        description: res.duplicate ? 'A lead with this phone was already submitted.' : 'Your lead has been added.',
      })
      setForm({ name: '', phone: '', altPhone: '', email: '', cibilScore: '', loanAmount: '', loanType: '', employmentType: '', monthlyIncome: '', city: '', state: '', notes: '' })
      onDone()
    } catch (e) {
      toast({ title: e instanceof ApiError ? e.message : 'Failed to submit lead', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" required />
          </Field>
          <Field label="Phone" required>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" required />
          </Field>
          <Field label="Alt phone">
            <Input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Loan amount (₹)">
            <Input type="number" value={form.loanAmount} onChange={(e) => setForm({ ...form, loanAmount: e.target.value })} placeholder="e.g. 500000" />
          </Field>
          <Field label="Loan type">
            <Select value={form.loanType} onValueChange={(v) => setForm({ ...form, loanType: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {LOAN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Employment type">
            <Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Monthly income (₹)">
            <Input type="number" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} />
          </Field>
          <Field label="CIBIL score">
            <Input value={form.cibilScore} onChange={(e) => setForm({ ...form, cibilScore: e.target.value })} placeholder="e.g. 750" />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="State">
            <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Any additional context…" />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit lead
          </Button>
          <Button type="button" variant="outline" onClick={() => onDone()}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}{required && <span className="ml-0.5 text-destructive">*</span>}</Label>
      {children}
    </div>
  )
}

interface ImportResult {
  created: number
  duplicates: number
  skipped: number
  errors: string[]
}

function UploadLeadsView({ onDone }: { onDone: () => void }) {
  const { toast } = useToast()
  const importLeads = useImportLeads()
  const [dragOver, setDragOver] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [result, setResult] = React.useState<ImportResult | null>(null)

  async function handleFile(file: File) {
    setResult(null)
    try {
      const res = await importLeads.mutateAsync(file)
      setResult(res)
      toast({
        title: `Imported ${res.created} leads`,
        description: `${res.duplicates} duplicates skipped, ${res.skipped} invalid rows.`,
      })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Import failed', variant: 'destructive' })
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function downloadTemplate() {
    const csv = 'name,phone,email,loanAmount,loanType,city,state,cibilScore,notes\nJohn Doe,9876543210,john@example.com,500000,Personal Loan,Mumbai,Maharashtra,750,Sample note\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'velixa-leads-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-6">
        <div
          className={dragOver ? 'rounded-lg border-2 border-dashed border-brand bg-brand/5 p-10 text-center' : 'rounded-lg border-2 border-dashed border-border p-10 text-center transition-colors hover:border-brand/50 hover:bg-muted/30'}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">Drag &amp; drop your CSV file here</p>
          <p className="mt-1 text-xs text-muted-foreground">or click to browse — CSV supported</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
          <Button type="button" variant="outline" className="mt-4" onClick={() => inputRef.current?.click()} disabled={importLeads.isPending}>
            {importLeads.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Choose file
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-3 text-xs">
          <div>
            <p className="font-medium">Required columns: name, phone</p>
            <p className="text-muted-foreground">Optional: email, loanAmount, loanType, city, state, cibilScore, notes</p>
          </div>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Template
          </Button>
        </div>

        {result && (
          <div className="mt-4 rounded-lg border border-border p-4">
            <p className="mb-2 text-sm font-semibold">Import results</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-success/10 p-3">
                <p className="text-2xl font-bold text-success">{result.created}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{result.duplicates}</p>
                <p className="text-xs text-muted-foreground">Duplicates</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-2xl font-bold text-destructive">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted-foreground">View {result.errors.length} error(s)</summary>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-destructive">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
            <Button variant="outline" size="sm" className="mt-3" onClick={onDone}>View leads</Button>
          </div>
        )}
      </Card>
    </div>
  )
}

function ProfileView() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold">Account details</h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Name" value={user.name} />
          <Detail label="Email" value={user.email} />
          <Detail label="Phone" value={user.phone ?? '—'} />
          <Detail label="Role" value="Partner" />
          <Detail label="Company" value={user.partner?.companyName ?? '—'} />
          <Detail label="Contact" value={user.partner?.contactName ?? '—'} />
        </dl>
      </Card>
      <Card className="p-6">
        <h3 className="mb-2 text-sm font-semibold">Security</h3>
        <p className="text-sm text-muted-foreground">
          To change your password, contact your Velixa Capital administrator.
        </p>
      </Card>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  )
}
