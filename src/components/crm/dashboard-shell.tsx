'use client'

import * as React from 'react'
import { VelixaLogo } from '@/components/velixa-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { RoleBadge } from '@/components/crm/badges'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth-provider'
import {
  Menu,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { ROLE_META } from '@/lib/constants'

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  badge?: number
  urgent?: boolean
}

export function DashboardShell({
  nav,
  active,
  onNavigate,
  title,
  subtitle,
  actions,
  children,
}: {
  nav: NavItem[]
  active: string
  onNavigate: (key: string) => void
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const SidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <VelixaLogo className="text-sidebar-foreground" />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon
            const isActive = active === item.key
            return (
              <li key={item.key}>
                <button
                  onClick={() => {
                    onNavigate(item.key)
                    setMobileOpen(false)
                  }}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge ? (
                    <span
                      className={cn(
                        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                        item.urgent
                          ? 'bg-destructive text-white animate-pulse-urgent'
                          : isActive
                            ? 'bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground'
                            : 'bg-sidebar-accent text-sidebar-accent-foreground'
                      )}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent">
              <Avatar className="h-9 w-9 border border-sidebar-border">
                <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {user?.email}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-sidebar-foreground/40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span className="truncate">{user?.name}</span>
              {user && (
                <RoleBadge
                  role={user.role}
                  className={cn(
                    'border-transparent',
                    ROLE_META[user.role]?.tone
                  )}
                />
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">{SidebarContent}</div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
          </Sheet>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        <footer className="mt-auto border-t border-border bg-background px-6 py-4">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} Velixa Capital — CRM. Confidential.</p>
            <p className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              All systems operational
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
