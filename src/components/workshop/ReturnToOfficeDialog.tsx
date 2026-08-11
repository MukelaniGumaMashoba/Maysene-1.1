"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { RETURN_TO_OFFICE_REASONS } from "@/lib/line-item-templates";
import { sendWorkshopNotification } from "@/lib/notifications";

interface Props {
  jobId: number;
  currentStatus?: string;
  onSuccess?: () => void;
}

export default function ReturnToOfficeDialog({ jobId, currentStatus, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [notes, setNotes] = useState("");
  const supabase = createClient() as any;

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }
    if (reason === "Other" && !otherReason.trim()) {
      toast.error("Please specify the reason");
      return;
    }
    if (!notes.trim()) {
      toast.error("Notes are mandatory when returning a job to office");
      return;
    }

    const finalReason = reason === "Other" ? `Other: ${otherReason}` : reason;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("workshop_job")
        .update({
          workflow_status: "returned_to_office",
          return_reason: finalReason,
          notes: notes.trim(),
        })
        .eq("id", jobId);

      if (error) throw error;

      await supabase.from("job_status_history").insert({
        job_id: jobId,
        from_status: currentStatus || "unknown",
        to_status: "returned_to_office",
        change_reason: finalReason,
        notes: notes.trim(),
      });

      toast.success("Job returned to office");
      setOpen(false);
      setReason("");
      setOtherReason("");
      setNotes("");

      sendWorkshopNotification({
        eventType: "returned_to_office",
        jobId,
        statusLabel: "Returned to Office",
        reason: finalReason,
      });

      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to return job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-gray-400 text-gray-700 hover:bg-gray-50">
          <RotateCcw className="h-4 w-4 mr-2" />
          Return to Office
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return Job to Office</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={(v) => { setReason(v); setOtherReason(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_TO_OFFICE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reason === "Other" && (
            <div>
              <Label>Please specify *</Label>
              <Input
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Specify reason..."
              />
            </div>
          )}
          <div>
            <Label>Notes *</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide details about why this job is being returned..."
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">Mandatory — explain why this job is being returned</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !reason || (reason === "Other" && !otherReason.trim()) || !notes.trim()}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            {loading ? "Returning..." : "Return to Office"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}