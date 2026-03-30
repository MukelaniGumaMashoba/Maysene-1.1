"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';

const supabase = createClient() as any;

interface Props {
  jobId: number;
  jobDescription: string;
  vehicleReg?: string;
  clientName?: string;
  location?: string;
  jobType?: string;
  priority?: string;
  onSuccess?: () => void;
}

export function SendToWorkshopDialog({ jobId, jobDescription, vehicleReg, clientName, location, jobType, priority, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSend = async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const jobId_workshop =
        'JC-' + year + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

      // Create workshop job linked to fleet job
      const { error: workshopError } = await supabase
        .from('workshop_job')
        .insert({
          // id: undefined,
          registration_no: vehicleReg || '',
          job_type: jobType || 'repair',
          description: jobDescription,
          status: 'Awaiting Approval',
          priority: priority || 'medium',
          client_name: clientName || '',
          location: location || '',
          notes: notes || '',
          fleet_job_id: jobId,
          source: 'fleet',
        });

      if (workshopError) throw workshopError;

      // Update fleet job status to assigned
      const { error: jobError } = await supabase
        .from('job_assignments')
        .update({ status: 'assigned', job_status: 'Onprogress' })
        .eq('id', jobId);

      if (jobError) throw jobError;

      toast.success(`Job sent to internal workshop as ${jobId_workshop}`);
      setOpen(false);
      setNotes('');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send job to workshop');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-orange-400 text-orange-600 hover:bg-orange-50">
          <Wrench className="h-4 w-4 mr-2" />
          Send to Workshop
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send to Internal Workshop</DialogTitle>
          <DialogDescription>
            This will create a workshop job card for: <strong>{jobDescription}</strong>
            {vehicleReg && <span> — Vehicle: <strong>{vehicleReg}</strong></span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any extra instructions for the workshop..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="text-sm text-gray-500 bg-orange-50 border border-orange-200 rounded p-3">
            <p>The workshop will receive this job with status <strong>Awaiting Approval</strong> and follow their own approval and parts process.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? 'Sending...' : 'Send to Workshop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
