import * as React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  icon?: React.ReactNode
  hint?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  accent?: 'default' | 'urgent' | 'success' | 'warning'
  className?: string
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  trend,
  trendValue,
  accent = 'default',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden p-5 shadow-card', className)}>
      {accent === 'urgent' && (
        <span className="absolute inset-y-0 left-0 w-1 bg-destructive" aria-hidden />
      )}
      {accent === 'success' && (
        <span className="absolute inset-y-0 left-0 w-1 bg-success" aria-hidden />
      )}
      {accent === 'warning' && (
        <span className="absolute inset-y-0 left-0 w-1 bg-warning" aria-hidden />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {trend && trendValue && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}
            >
              {trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
              {trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
              {trendValue}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
