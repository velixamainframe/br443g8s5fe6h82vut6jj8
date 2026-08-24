import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export function VelixaLogo({
  className,
  variant = 'full',
}: {
  className?: string
  variant?: 'full' | 'mark'
}) {
  if (variant === 'mark') {
    return (
      <Image
        src="/logo.jpg"
        alt="Velixa Capital"
        width={40}
        height={40}
        className={cn('h-10 w-10 rounded-md object-cover', className)}
      />
    )
  }
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/logo.jpg"
        alt="Velixa Capital"
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-md object-cover"
      />
      <div className="leading-none">
        <div className="text-base font-bold tracking-tight">Velixa</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] opacity-60">
          Capital
        </div>
      </div>
    </div>
  )
}