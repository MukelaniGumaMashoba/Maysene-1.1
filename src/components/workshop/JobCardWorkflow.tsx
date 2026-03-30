"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Printer,
  User,
  AlertTriangle
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface JobCard {
  id: number
  jobId_workshop: string | null
  description: string | null
  registration_no: string | null
  workflow_status: string | null
  status: string | null
  created_at?: string | null
  assigned_technician_id?: string | null
  technician_name?: string | null
  driver_id?: number | null
  estimated_cost?: number | null
  priority?: string | null
}

interface WorkflowAction {
  action: 'approve' | 'reject' | 'print' | 'complete' | 'reopen'
  notes?: string
}

export default function JobCardWorkflow() {
  const [jobs, setJobs] = useState<JobCard[]>([])
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null)
  const [actionNotes, setActionNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [userRole, setUserRole] = useState<string>("")
  const [userPermissions, setUserPermissions] = useState({
    can_approve_jobs: false,
    can_reject_jobs: false,
    can_close_jobs: false
  })
  const supabase = createClient() as any

  useEffect(() => {
    fetchUserProfile()
    fetchJobs()
  }, [])

  const fetchUserProfile = async () => {
    console.log('[JobCardWorkflow] Fetching user profile...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[JobCardWorkflow] getUser failed:', authError)
      toast.error('Failed to resolve current user')
      return
    }
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, can_approve_jobs, can_reject_jobs, can_close_jobs')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        console.error('[JobCardWorkflow] Fetch profile failed:', profileError)
        toast.error('Failed to load user permissions')
      } else if (profile) {
        const profileData: any = profile as any
        setUserRole(profileData.role || "")
        setUserPermissions({
          can_approve_jobs: profileData.can_approve_jobs || false,
          can_reject_jobs: profileData.can_reject_jobs || false,
          can_close_jobs: profileData.can_close_jobs || false
        })
        console.log('[JobCardWorkflow] Loaded profile with permissions:', {
          can_approve_jobs: profileData.can_approve_jobs,
          can_reject_jobs: profileData.can_reject_jobs,
          can_close_jobs: profileData.can_close_jobs
        })
      }
    }
  }

  const fetchJobs = async () => {
    console.log('[JobCardWorkflow] Fetching jobs...')
    const { data, error } = await supabase
      .from('workshop_job')
      .select(`
        id,
        jobId_workshop,
        registration_no,
        description,
        approval_status,
        status,
        workflow_status,
        estimated_cost,
        priority,
        due_date,
        estimated_duration_hours,
        work_notes
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[JobCardWorkflow] Fetch jobs failed:', error)
      toast.error('Failed to load jobs')
      return
    }
    if (data) {
      console.log('[JobCardWorkflow] Jobs loaded:', data.length)
      setJobs(data as any)
    }
  }

  const logWorkflowHistory = async (jobCardId: number, fromStatus: string | null, toStatus: string, notes?: string) => {
    console.log('[JobCardWorkflow] Logging workflow history:', { jobCardId, fromStatus, toStatus })
    const { error } = await (supabase as any)
      .from('job_card_workflow_history')
      .insert([{
        job_card_id: jobCardId,
        from_status: fromStatus,
        to_status: toStatus,
        notes: notes
      }] as any)
    if (error) {
      console.error('[JobCardWorkflow] Failed to log workflow history:', error)
    }
  }

  const handleWorkflowAction = async (job: JobCard, action: WorkflowAction) => {
    setIsProcessing(true)
    console.log('[JobCardWorkflow] Handling workflow action:', { jobId: job.id, action })
    
    try {
      let newStatus = job.workflow_status || 'pending_approval'
      let newJobStatus = job.status || 'pending'

      switch (action.action) {
        case 'approve':
          newStatus = 'approved'
          newJobStatus = 'approved'
          break
        case 'reject':
          newStatus = 'rejected'
          newJobStatus = 'rejected'
          // Store in rejected_jobs table
          {
            const { error } = await (supabase as any)
            .from('rejected_jobs')
            .insert([{
              original_job_card_id: job.id,
              job_data: JSON.stringify(job) as any,
              rejection_reason: action.notes
            }] as any)
            if (error) {
              console.error('[JobCardWorkflow] Failed inserting rejected job:', error)
              throw error
            }
          }
          break
        case 'complete':
          newStatus = 'completed'
          newJobStatus = 'completed'
          break
        case 'reopen':
          newStatus = 'pending_approval'
          newJobStatus = 'pending'
          break
      }

      // Update job card status
      const { error: updateError } = await (supabase as any)
        .from('workshop_job')
        .update({
          workflow_status: newStatus,
          status: newJobStatus,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', job.id)

      if (updateError) {
        console.error('[JobCardWorkflow] Update job card failed:', updateError)
        throw updateError
      }

      // Log workflow history
      await logWorkflowHistory(job.id, job.workflow_status || null, newStatus, action.notes)

      toast.success(`Job ${job.jobId_workshop || job.id} ${action.action}d successfully`)
      console.log('[JobCardWorkflow] Action completed successfully:', { jobId: job.id, newStatus, newJobStatus })
      
      // Refresh jobs list
      fetchJobs()
      setSelectedJob(null)
      setActionNotes("")

    } catch (error) {
      console.error('[JobCardWorkflow] Workflow action failed:', error)
      toast.error(`Failed to ${action.action} job`)
    } finally {
      setIsProcessing(false)
    }
  }

  const printJobCard = (job: JobCard) => {
    // Generate printable job card with notes and signature sections
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Job Card - ${job.jobId_workshop || job.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .section { margin: 20px 0; }
              .field { margin: 10px 0; }
              .signature-box { border: 1px solid #000; height: 60px; margin: 10px 0; }
              .notes-box { border: 1px solid #000; min-height: 100px; margin: 10px 0; padding: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>JOB CARD</h1>
              <h2>${job.jobId_workshop || job.id}</h2>
            </div>
            
            <div class="section">
              <h3>Vehicle Information</h3>
              <div class="field"><strong>Registration:</strong> ${job.registration_no || ''}</div>
              <div class="field"><strong>Job Type:</strong> ${job.description || ''}</div>
              <div class="field"><strong>Priority:</strong> ${job.priority || ''}</div>
            </div>

            <div class="section">
              <h3>Assignment</h3>
              <div class="field"><strong>Technician:</strong> ${job.technician_name || 'Not assigned'}</div>
              <div class="field"><strong>Estimated Cost:</strong> R${job.estimated_cost ?? 0}</div>
            </div>

            <div class="section">
              <h3>Work Notes</h3>
              <div class="notes-box"></div>
            </div>

            <div class="section">
              <h3>Technician Signature</h3>
              <div class="signature-box"></div>
              <div class="field">Date: _______________</div>
            </div>

            <div class="section">
              <h3>Parts Used</h3>
              <div class="notes-box"></div>
            </div>

            <div class="section">
              <h3>Labour Hours</h3>
              <div class="field">Start Time: _______________</div>
              <div class="field">End Time: _______________</div>
              <div class="field">Total Hours: _______________</div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_approval': return <Clock className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const canPerformAction = (action: string, job: JobCard) => {
    switch (action) {
      case 'approve':
        return userPermissions.can_approve_jobs && job.workflow_status === 'pending_approval'
      case 'reject':
        return userPermissions.can_reject_jobs && job.workflow_status === 'pending_approval'
      case 'complete':
        return userPermissions.can_close_jobs && job.workflow_status === 'approved'
      case 'print':
        return job.workflow_status === 'approved'
      default:
        return false
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Card Workflow Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold">{job.jobId_workshop || job.id}</h3>
                      <p className="text-sm text-gray-600">{job.registration_no}</p>
                      <p className="text-sm text-gray-500">{job.description}</p>
                    </div>
                    <Badge className={`${getStatusColor(job.workflow_status || 'pending_approval')} flex items-center space-x-1`}>
                      {getStatusIcon(job.workflow_status || 'pending_approval')}
                      <span>{(job.workflow_status || 'pending_approval').replace('_', ' ').toUpperCase()}</span>
                    </Badge>
                  </div>
                  
                  <div className="flex space-x-2">
                    {canPerformAction('approve', job) && (
                      <Button
                        size="sm"
                        onClick={() => handleWorkflowAction(job, { action: 'approve' })}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    
                    {canPerformAction('reject', job) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setSelectedJob(job)}
                        disabled={isProcessing}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    )}
                    
                    {canPerformAction('print', job) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => printJobCard(job)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                    )}
                    
                    {canPerformAction('complete', job) && (
                      <Button
                        size="sm"
                        onClick={() => handleWorkflowAction(job, { action: 'complete' })}
                        disabled={isProcessing}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Modal */}
      {selectedJob && (
        <Card className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Job Card</h3>
            <p className="text-sm text-gray-600 mb-4">
              Job: {selectedJob.jobId_workshop || selectedJob.id} - {selectedJob.registration_no || ''}
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                <Textarea
                  id="rejection_reason"
                  placeholder="Please provide a reason for rejection..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedJob(null)
                    setActionNotes("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleWorkflowAction(selectedJob, { action: 'reject', notes: actionNotes })}
                  disabled={!actionNotes.trim() || isProcessing}
                >
                  {isProcessing ? "Rejecting..." : "Reject Job"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}