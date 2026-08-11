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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { sendWorkshopNotification } from "@/lib/notifications";

interface Props {
  jobId: number;
  currentStatus?: string;
  registrationNo?: string;
  onSuccess?: () => void;
}

export default function QualityCheckDialog({ jobId, currentStatus, registrationNo, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"pass" | "fail" | "">("");
  const [notes, setNotes] = useState("");
  const [failReason, setFailReason] = useState("");
  const supabase = createClient() as any;

  const handleQualityCheck = async () => {
    if (!result) {
      toast.error("Please select pass or fail");
      return;
    }
    if (result === "fail" && !failReason.trim()) {
      toast.error("Please provide a reason for QC failure");
      return;
    }
    if (!notes.trim()) {
      toast.error("Quality check notes are mandatory");
      return;
    }

    setLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (result === "pass") {
        // Pass: quality_check_done, vehicle available
        const { error: jobError } = await supabase
          .from("workshop_job")
          .update({
            workflow_status: "quality_check_done",
            quality_check_by: userId,
            quality_check_at: new Date().toISOString(),
            end_time: new Date().toISOString(),
            quality_check_passed: true,
            completion_notes: notes.trim(),
          })
          .eq("id", jobId);

        if (jobError) throw jobError;

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
          from_status: currentStatus || "job_completed",
          to_status: "quality_check_done",
          notes: notes.trim(),
        });

        toast.success("Quality check passed - vehicle is now available");
      } else {
        // Fail: returned_to_office, vehicle stays unavailable
        const fullNotes = `QC Failed: ${failReason.trim()}${notes.trim() ? `\n\n${notes.trim()}` : ""}`;

        const { error: jobError } = await supabase
          .from("workshop_job")
          .update({
            workflow_status: "returned_to_office",
            quality_check_by: userId,
            quality_check_at: new Date().toISOString(),
            quality_check_passed: false,
            return_reason: `QC Failed: ${failReason.trim()}`,
            notes: fullNotes,
          })
          .eq("id", jobId);

        if (jobError) throw jobError;

        await supabase.from("job_status_history").insert({
          job_id: jobId,
          from_status: currentStatus || "job_completed",
          to_status: "returned_to_office",
          change_reason: `QC Failed: ${failReason.trim()}`,
          notes: fullNotes,
        });

        toast.success("Quality check failed - job returned to office");
      }

      setOpen(false);
      setResult("");
      setNotes("");
      setFailReason("");

      sendWorkshopNotification({
        eventType: result === "pass" ? "quality_check_completed" : "returned_to_office",
        jobId,
        vehicleReg: registrationNo,
        statusLabel: result === "pass" ? "Quality Check Completed" : "Returned to Office (QC Failed)",
        reason: result === "fail" ? failReason : undefined,
      });

      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to complete quality check");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <ShieldCheck className="h-4 w-4 mr-2" />
          Quality Check
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quality Check</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Result *</Label>
            <Select value={result} onValueChange={(v: "pass" | "fail") => { setResult(v); setFailReason(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass — Vehicle Available</SelectItem>
                <SelectItem value="fail">Fail — Return to Office</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {result === "pass" && registrationNo && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="text-sm text-emerald-800">Vehicle {registrationNo} will be marked as available</span>
            </div>
          )}

          {result === "fail" && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800">Job will be returned to office for rework</span>
            </div>
          )}

          {result === "fail" && (
            <div>
              <Label>Failure Reason *</Label>
              <Textarea
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                placeholder="Describe what failed the quality check..."
                rows={2}
              />
            </div>
          )}

          <div>
            <Label>Notes *</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Quality check notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleQualityCheck}
            disabled={loading || !result || (result === "fail" && !failReason.trim()) || !notes.trim()}
            className={result === "fail" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
          >
            {loading ? "Processing..." : result === "fail" ? "Fail & Return to Office" : "Complete Quality Check"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}