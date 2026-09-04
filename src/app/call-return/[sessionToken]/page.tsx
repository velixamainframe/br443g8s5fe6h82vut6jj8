'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { PostCallFeedbackModal } from '@/components/crm/post-call-feedback-modal'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'
import { useUsers } from '@/components/crm/hooks'

export default function CallReturnPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const sessionToken = params.sessionToken as string
  
  const [callSession, setCallSession] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const { data: usersData } = useUsers('EMPLOYEE')
  const employees = (usersData?.users as { id: string; name: string; email: string }[]) ?? []

  React.useEffect(() => {
    async function loadCallSession() {
      if (!sessionToken) return
      
      try {
        const res = await api.get<{ callSession: any }>(`/api/calls/${sessionToken}`)
        setCallSession(res.callSession)
        setModalOpen(true)
      } catch (e) {
        toast({
          title: 'Error',
          description: 'Could not load call session. Please try again.',
          variant: 'destructive',
        })
        // Redirect back to app after a short delay
        setTimeout(() => router.push('/'), 2000)
      } finally {
        setLoading(false)
      }
    }

    loadCallSession()
  }, [sessionToken, toast, router])

  const handleCallResultSaved = () => {
    // Wait a moment before redirecting so user can see the success message
    setTimeout(() => {
      router.push('/')
    }, 1500)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading call details...</p>
        </div>
      </div>
    )
  }

  if (!callSession || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">Call session not found or expired.</p>
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <PostCallFeedbackModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            // User dismissed modal, redirect back
            router.push('/')
          }
        }}
        sessionToken={sessionToken}
        leadName={callSession.lead?.name}
        leadPhone={callSession.phone}
        user={user}
        employees={employees}
        onCallResultSaved={handleCallResultSaved}
      />
    </>
  )
}
