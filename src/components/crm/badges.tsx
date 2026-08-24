import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  STATUS_META,
  PRIORITY_META,
  SOURCE_META,
  ROLE_META,
  type LeadStatus,
  type LeadPriority,
  type LeadSource,
  type Role,
} from '@/lib/constants'

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const meta = STATUS_META[status]
  if (!meta) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        meta.tone,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

export function PriorityBadge({ priority, className }: { priority: LeadPriority; className?: string }) {
  const meta = PRIORITY_META[priority]
  if (!meta) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        meta.tone,
        priority === 'URGENT' && 'animate-pulse-urgent',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

export function SourceBadge({ source, className }: { source: LeadSource; className?: string }) {
  const meta = SOURCE_META[source]
  if (!meta) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap',
        className
      )}
    >
      {meta.label}
    </span>
  )
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const meta = ROLE_META[role]
  if (!meta) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold capitalize',
        meta.tone,
        className
      )}
    >
      {meta.label}
    </span>
  )
}
