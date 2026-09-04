'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api-client'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { LEAD_STATUSES } from '@/lib/constants'
import type { CurrentUser } from '@/components/auth-provider'

interface PostCallFeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionToken: string
  leadName?: string
  leadPhone?: string
  user: CurrentUser
  employees?: { id: string; name: string; email: string }[]
  onCallResultSaved?: () => void
}

export function PostCallFeedbackModal({
  open,
  onOpenChange,
  sessionToken,
  leadName,
  leadPhone,
  user,
  employees = [],
  onCallResultSaved,
}: PostCallFeedbackModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [step, setStep] = React.useState<'status' | 'details' | 'followup' | 'transfer'>('status')

  // Form state
  const [callStatus, setCallStatus] = React.useState<string>('SUCCESS')
  const [callResult, setCallResult] = React.useState<string>('CLOSED')
  const [feedback, setFeedback] = React.useState('')
  const [wasSuccessful, setWasSuccessful] = React.useState(true)
  const [shouldReschedule, setShouldReschedule] = React.useState(false)
  const [isPendingDocs, setIsPendingDocs] = React.useState(false)
  const [newLeadStatus, setNewLeadStatus] = React.useState('CONTACTED')
  const [transferToId, setTransferToId] = React.useState('')

  const handleSubmit = async () => {
    if (!sessionToken) return

    setLoading(true)
    try {
      await api.patch(`/api/calls/${sessionToken}/result`, {
        callStatus,
        callResult,
        feedback: feedback.trim() || undefined,
        wasSuccessful,
        shouldReschedule,
        isPendingDocs,
        transferredToId: transferToId || undefined,
        newLeadStatus,
      })

      toast({
        title: 'Call recorded successfully',
        description: 'Your call feedback has been saved.',
      })

      setFeedback('')
      onOpenChange(false)
      setStep('status')
      onCallResultSaved?.()
    } catch (e) {
      toast({
        title: 'Failed to save call feedback',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const canTransfer = user.role === 'ADMIN' || user.canTransferLeads
  const filterOtherEmployees = employees.filter((emp) => emp.id !== user.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Call Summary - {leadName || 'Lead'}</DialogTitle>
          <DialogDescription>
            {leadPhone ? `${leadPhone}` : 'Record the details of your call'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Call Status */}
        {step === 'status' && (
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Was the call successful?</Label>
              <RadioGroup value={callStatus} onValueChange={setCallStatus}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="SUCCESS" id="success" />
                  <Label htmlFor="success" className="cursor-pointer font-normal">
                    <CheckCircle2 className="mb-0.5 mr-2 inline h-4 w-4 text-green-600" />
                    Yes, call was successful
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="FAILED" id="failed" />
                  <Label htmlFor="failed" className="cursor-pointer font-normal">
                    <XCircle className="mb-0.5 mr-2 inline h-4 w-4 text-red-600" />
                    No, failed or no response
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="NOT_ATTEMPTED" id="not-attempted" />
                  <Label htmlFor="not-attempted" className="cursor-pointer font-normal">
                    Call not attempted / returned to app
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setWasSuccessful(callStatus === 'SUCCESS')
                setStep('details')
              }}
            >
              Next
            </Button>
          </div>
        )}

        {/* Step 2: Call Details */}
        {step === 'details' && (
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label htmlFor="result" className="text-base font-semibold">
                What was the outcome?
              </Label>
              <Select value={callResult} onValueChange={setCallResult}>
                <SelectTrigger id="result">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLOSED">Deal Closed / Converted</SelectItem>
                  <SelectItem value="SCHEDULED">Meeting/Call Scheduled</SelectItem>
                  <SelectItem value="PENDING_DOCS">Pending Documents</SelectItem>
                  <SelectItem value="TRANSFERRED">Transferred to Another Employee</SelectItem>
                  <SelectItem value="OTHER">Other / Follow-up Later</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="feedback" className="text-base font-semibold">
                Additional Notes
              </Label>
              <Textarea
                id="feedback"
                placeholder="Add any important details about the call, customer concerns, next steps, etc..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-24"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Lead Status</Label>
              <Select value={newLeadStatus} onValueChange={setNewLeadStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('status')} className="flex-1">
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (callResult === 'TRANSFERRED' && canTransfer) {
                    setStep('transfer')
                  } else {
                    setStep('followup')
                  }
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Transfer (if applicable) */}
        {step === 'transfer' && (
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label htmlFor="transfer" className="text-base font-semibold">
                Transfer Lead To
              </Label>
              <Select value={transferToId} onValueChange={setTransferToId}>
                <SelectTrigger id="transfer">
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {filterOtherEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep('followup')}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Follow-up Options */}
        {step === 'followup' && (
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Follow-up Actions</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="reschedule"
                    checked={shouldReschedule}
                    onCheckedChange={(checked) => setShouldReschedule(checked as boolean)}
                  />
                  <Label htmlFor="reschedule" className="cursor-pointer font-normal">
                    Schedule another call/meeting
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pending-docs"
                    checked={isPendingDocs}
                    onCheckedChange={(checked) => setIsPendingDocs(checked as boolean)}
                  />
                  <Label htmlFor="pending-docs" className="cursor-pointer font-normal">
                    Waiting for documents from customer
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => (callResult === 'TRANSFERRED' && canTransfer ? setStep('transfer') : setStep('details'))}
                className="flex-1"
              >
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
