'use client'

import * as React from 'react'
import { useAuth } from '@/components/auth-provider'
import { VelixaLogo } from '@/components/velixa-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { ApiError } from '@/lib/api-client'

export function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 401
            ? 'Invalid email or password.'
            : err.message
          : 'Unable to sign in. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
      <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-brand/10 blur-3xl" aria-hidden />
      <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-brand/5 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="text-sidebar [&_*]:text-sidebar-foreground mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-sidebar shadow-card">
            <VelixaLogo variant="mark" className="h-10 w-10 text-sidebar" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Velixa Capital CRM</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Secure agent &amp; partner portal
          </p>
        </div>

        <Card className="border-border/60 p-7 shadow-card backdrop-blur-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@velixacapital.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p>
              Access is restricted. Accounts are provisioned by Velixa Capital
              administrators. No public registration.
            </p>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Velixa Capital. All rights reserved.
        </p>
      </div>
    </div>
  )
}
