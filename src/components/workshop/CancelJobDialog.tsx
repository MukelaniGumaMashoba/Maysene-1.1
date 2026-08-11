"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { sendWorkshopNotification } from "@/lib/notifications";

interface Props {
  jobId: number;
  currentStatus?: string;
  registrationNo?: string;
  onSuccess?: () => void;
}

export default function CancelJobDialog({ jobId, currentStatus, registrationNo, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const supabase = createClient() as any;

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { error } = await supabase
        .from("workshop_job")
        .update({
          workflow_status: "job_cancelled",
          cancelled_reason: reason.trim(),
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
        })
        .eq("id", jobId);

      if (error) throw error;

      // Restore vehicle availability if it was marked unavailable
      if (registrationNo) {
        const { data: vehicle } = await supabase
          .from("vehiclesc")
          .select("id")
          .eq("registration_number", registrationNo)
          .single();

        if (vehicle) {
          await supabase
            .from("vehiclesc")
            .update({
              vehicle_available: true,
              vehicle_not_available_reason: null,
            })
            .eq("id", vehicle.id);
        }
      }

      await supabase.from("job_status_history").insert({
        job_id: jobId,
        from_status: currentStatus || "unknown",
        to_status: "job_cancelled",
        change_reason: reason.trim(),
        notes: reason.trim(),
      });

      toast.success("Job cancelled");

      sendWorkshopNotification({
        eventType: "job_cancelled",
        jobId,
        vehicleReg: registrationNo,
        statusLabel: "Job Cancelled",
        reason: reason.trim(),
      });

      setOpen(false);
      setReason("");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="h-4 w-4 mr-2" />
          Cancel Job
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Job</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Reason for Cancellation *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for cancelling this job..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep Job
          </Button>
          <Button
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
            variant="destructive"
          >
            {loading ? "Cancelling..." : "Cancel Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}