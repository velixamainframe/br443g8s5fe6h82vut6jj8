'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { RoleBadge } from '@/components/crm/badges'
import { useUsers } from '@/components/crm/hooks'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError } from '@/lib/api-client'
import { ROLES } from '@/lib/constants'
import type { Role } from '@/lib/constants'
import {
  UserPlus,
  MoreVertical,
  Power,
  KeyRound,
  Search,
  Loader2,
  ShieldCheck,
  Copy,
  Check,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: Role
  active: boolean
  canTransferLeads: boolean
  canViewAllLeads: boolean
  partnerId: string | null
  lastLoginAt: string | null
  createdAt: string
  partner: { id: string; companyName: string | null } | null
}

export function UsersManager() {
  const { toast } = useToast()
  const { data, isLoading, refetch } = useUsers()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<AdminUser | null>(null)
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL')

  const users = ((data?.users ?? []) as unknown as AdminUser[]).filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    }
    return true
  })

  async function toggleActive(u: AdminUser) {
    try {
      await api.patch(`/api/users/${u.id}`, { active: !u.active })
      toast({ title: u.active ? 'User deactivated' : 'User activated' })
      refetch()
    } catch (e) {
      toast({ title: e instanceof ApiError ? e.message : 'Failed', variant: 'destructive' })
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">CRM Employees</h3>
          <p className="text-xs text-muted-foreground">Manage employees, partners, and admins</p>
        </div>
        <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Create user
        </Button>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Employee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">No users found</TableCell></TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-muted text-xs">
                          {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><RoleBadge role={u.role} /></TableCell>
                  <TableCell>
                    {u.active ? (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditUser(u)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(u)}>
                          <Power className="mr-2 h-4 w-4" />
                          {u.active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(u.email); toast({ title: 'Email copied' }) }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => {
                          if (confirm(`Permanently deactivate ${u.name}? They will lose all access.`)) {
                            api.del(`/api/users/${u.id}`).then(() => { toast({ title: 'User deleted' }); refetch() }).catch((e) => toast({ title: e.message, variant: 'destructive' }))
                          }
                        }}>
                          Delete account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { refetch(); setCreateOpen(false) }} />
      <EditUserDialog user={editUser} open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null) }} onUpdated={() => { refetch(); setEditUser(null) }} />
    </Card>
  )
}

function EditUserDialog({ user, open, onOpenChange, onUpdated }: { user: AdminUser | null; open: boolean; onOpenChange: (o: boolean) => void; onUpdated: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = React.useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (user && open) {
      setForm({ name: user.name, email: user.email, password: '' })
    }
  }, [user, open])

  if (!user) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: Record<string, string> = { name: form.name, email: form.email }
      if (form.password.length >= 8) {
        payload.password = form.password
      } else if (form.password.length > 0) {
        toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
        setLoading(false)
        return
      }
      await api.patch(`/api/users/${user.id}`, payload)
      toast({ title: 'Employee updated', description: `${form.name} has been updated.` })
      onUpdated()
    } catch (e) {
      toast({ title: e instanceof ApiError ? e.message : 'Failed to update', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>Update name, email, or password for {user.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank to keep current password"
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">Minimum 8 characters. Leave empty to keep the existing password.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreateUserDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = React.useState({
    name: '', email: '', phone: '', role: 'EMPLOYEE' as Role, password: '',
    companyName: '', canTransferLeads: true, canViewAllLeads: false,
  })
  const [loading, setLoading] = React.useState(false)
  const [created, setCreated] = React.useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setCreated(null)
      setCopied(false)
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/users', form)
      setCreated({ email: form.email, password: form.password })
      toast({ title: 'User created', description: `${form.email} can now sign in.` })
      setForm({ name: '', email: '', phone: '', role: 'EMPLOYEE', password: '', companyName: '', canTransferLeads: true, canViewAllLeads: false })
    } catch (e) {
      toast({ title: e instanceof ApiError ? e.message : 'Failed to create user', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function copyCreds() {
    navigator.clipboard.writeText(`Email: ${created!.email}\nPassword: ${created!.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{created ? 'User created' : 'Create new user'}</DialogTitle>
        </DialogHeader>
        {created ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-success">
                <ShieldCheck className="h-4 w-4" />
                Credentials generated
              </div>
              <p className="text-sm"><span className="text-muted-foreground">Email:</span> {created.email}</p>
              <p className="text-sm"><span className="text-muted-foreground">Password:</span> {created.password}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Share these credentials securely with the user. They will be required to sign in at the CRM URL.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyCreds}>
                {copied ? <Check className="mr-2 h-4 w-4 text-success" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy credentials'}
              </Button>
              <Button className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90" onClick={onCreated}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars" required minLength={8} />
              </div>
            </div>
            {form.role === 'PARTNER' && (
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
            )}
            {form.role === 'EMPLOYEE' && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.canTransferLeads} onCheckedChange={(v) => setForm({ ...form, canTransferLeads: !!v })} />
                  Can transfer leads to other employees
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.canViewAllLeads} onCheckedChange={(v) => setForm({ ...form, canViewAllLeads: !!v })} />
                  Can view all leads (not just assigned)
                </label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-brand text-brand-foreground hover:bg-brand/90">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Create user
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
