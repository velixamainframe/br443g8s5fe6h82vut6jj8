'use client'

import * as React from 'react'
import Image from 'next/image'
import { useAuth } from '@/components/auth-provider'
import { LoginScreen } from '@/components/crm/login-screen'
import { AdminApp } from '@/components/crm/admin/admin-app'
import { EmployeeApp } from '@/components/crm/employee/employee-app'
import { PartnerApp } from '@/components/crm/partner/partner-app'
import { Loader2 } from 'lucide-react'

export default function CrmApp() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Image
          src="/logo.jpg"
          alt="Velixa Capital"
          width={48}
          height={48}
          className="h-12 w-12 rounded-lg object-cover"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Velixa Capital CRM…
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  if (user.role === 'ADMIN') return <AdminApp />
  if (user.role === 'EMPLOYEE') return <EmployeeApp />
  if (user.role === 'PARTNER') return <PartnerApp />

  return <LoginScreen />
}
