import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    console.log('[API][maintenance/workflow][POST] Incoming request')
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[API][maintenance/workflow] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { job_card_id, action, notes } = body
    console.log('[API][maintenance/workflow] Parsed body:', { job_card_id, action, hasNotes: Boolean(notes) })

    // Verify user permissions
    const { data: profile } = await supabase
      .from('users')
      .select('can_approve_jobs, can_reject_jobs, can_close_jobs')
      .eq('id', user.id)
      .single()

    if (!profile) {
      console.error('[API][maintenance/workflow] User profile not found for:', user.id)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get current job card
    const { data: jobCard, error: jobError } = await supabase
      .from('workshop_job')
      .select('*')
      .eq('id', job_card_id)
      .single()

    if (jobError || !jobCard) {
      console.error('[API][maintenance/workflow] Job card not found:', { job_card_id, jobError })
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 })
    }

    let newStatus = jobCard.approval_status
    let newJobStatus = jobCard.approval_status

    // Process workflow action
    switch (action) {
      case 'approve':
        if (!profile.can_approve_jobs) {
          console.warn('[API][maintenance/workflow] Insufficient permissions to approve:', { userId: user.id })
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }
        newStatus = 'approved'
        newJobStatus = 'approved'
        break

      case 'reject':
        if (!profile.can_reject_jobs) {
          console.warn('[API][maintenance/workflow] Insufficient permissions to reject:', { userId: user.id })
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }
        newStatus = 'rejected'
        newJobStatus = 'rejected'
        
        // Store in rejected_jobs table
        {
          const { error: insertError } = await supabase
          .from('rejected_jobs')
          .insert({
            original_job_card_id: job_card_id,
            job_data: jobCard,
            rejection_reason: notes,
            rejected_by: user.id
          })
          if (insertError) {
            console.error('[API][maintenance/workflow] Failed to insert rejected job:', insertError)
            return NextResponse.json({ error: 'Failed to log rejection' }, { status: 500 })
          }
        }
        break

      case 'complete':
        if (!profile.can_close_jobs) {
          console.warn('[API][maintenance/workflow] Insufficient permissions to complete:', { userId: user.id })
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }
        newStatus = 'completed'
        newJobStatus = 'completed'
        break

      default:
        console.warn('[API][maintenance/workflow] Invalid action:', action)
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update job card (workshop_job table)
    const { error: updateError } = await supabase
      .from('workshop_job')
      .update({
        workflow_status: newStatus,
        status: newJobStatus,
        completion_date: action === 'complete' ? new Date().toISOString() : jobCard.completion_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_card_id)

    if (updateError) {
      console.error('[API][maintenance/workflow] Update job card failed:', updateError)
      return NextResponse.json({ error: 'Failed to update job card' }, { status: 500 })
    }

    // Log workflow history
    const { error: historyError } = await supabase
      .from('job_card_workflow_history')
      .insert({
        job_card_id,
        from_status: jobCard.workflow_status,
        to_status: newStatus,
        action_by: user.id,
        notes
      })
    if (historyError) {
      console.error('[API][maintenance/workflow] Failed to insert workflow history:', historyError)
      // Non-fatal: the main update succeeded, but logging failed
    }

    console.log('[API][maintenance/workflow] Action succeeded:', { job_card_id, action, newStatus })
    return NextResponse.json({ 
      success: true, 
      message: `Job ${action}d successfully`,
      new_status: newStatus 
    })

  } catch (error) {
    console.error('Workflow action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}