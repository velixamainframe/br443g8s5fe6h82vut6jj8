'use client'

import * as React from 'react'
import { api } from '@/lib/api-client'
import type { Role } from '@/lib/constants'

export interface CurrentUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: Role
  active: boolean
  canTransferLeads: boolean
  canViewAllLeads: boolean
  partnerId: string | null
  partner?: {
    id: string
    companyName: string | null
    contactName: string | null
    phone: string | null
    email: string | null
  } | null
}

interface AuthCtx {
  user: CurrentUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = React.createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<CurrentUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async () => {
    try {
      const res = await api.get<{ user: CurrentUser }>('/api/auth/me')
      setUser(res.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ user: CurrentUser }>('/api/auth/login', { email, password })
      setUser(res.user)
    },
    []
  )

  const logout = React.useCallback(async () => {
    await api.post('/api/auth/logout')
    setUser(null)
  }, [])

  const value = React.useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
