"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  CheckCircle,
  Wrench,
  Package,
  UserCheck,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import ReturnToOfficeDialog from "./ReturnToOfficeDialog";
import QualityCheckDialog from "./QualityCheckDialog";
import CancelJobDialog from "./CancelJobDialog";
import { STATUS_LABELS, STATUS_COLORS, WorkflowStatus } from "@/lib/line-item-templates";
import { sendWorkshopNotification } from "@/lib/notifications";

interface Props {
  jobId: number;
  currentStatus: string;
  registrationNo?: string;
  isOffice?: boolean;
  onSuccess?: () => void;
}

interface Technician {
  id: string;
  name: string;
}

// Role-based permissions per the spec
const PERMISSIONS: Record<string, Record<string, string[]>> = {
  office: {
    canCreateJob: ["*"],
    canAssignJob: ["awaiting_assignment", "returned_to_office", "mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canAcceptJob: ["mechanic_assigned", "subcontractor_assigned"],
    canStartWork: ["mechanic_accepted"],
    canRequestParts: ["job_in_progress"],
    canReceiveParts: ["parts_outstanding"],
    canCompleteLineItems: ["job_in_progress", "parts_received"],
    canCompleteJob: ["job_in_progress", "parts_received"],
    canReturnToOffice: ["mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canQualityCheck: ["job_completed"],
    canUpdateVehicleStatus: ["*"],
    canCancelJob: ["*"],
  },
  "fleet_manager": {
    canCreateJob: ["*"],
    canAssignJob: ["awaiting_assignment", "returned_to_office", "mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canAcceptJob: ["mechanic_assigned", "subcontractor_assigned"],
    canStartWork: ["mechanic_accepted"],
    canRequestParts: ["job_in_progress"],
    canReceiveParts: ["parts_outstanding"],
    canCompleteLineItems: ["job_in_progress", "parts_received"],
    canCompleteJob: ["job_in_progress", "parts_received"],
    canReturnToOffice: ["mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canQualityCheck: ["job_completed"],
    canUpdateVehicleStatus: ["*"],
    canCancelJob: ["*"],
  },
  "fleet-manager": {
    canCreateJob: ["*"],
    canAssignJob: ["awaiting_assignment", "returned_to_office", "mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canAcceptJob: ["mechanic_assigned", "subcontractor_assigned"],
    canStartWork: ["mechanic_accepted"],
    canRequestParts: ["job_in_progress"],
    canReceiveParts: ["parts_outstanding"],
    canCompleteLineItems: ["job_in_progress", "parts_received"],
    canCompleteJob: ["job_in_progress", "parts_received"],
    canReturnToOffice: ["mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canQualityCheck: ["job_completed"],
    canUpdateVehicleStatus: ["*"],
    canCancelJob: ["*"],
  },
  "fleet manager": {
    canCreateJob: ["*"],
    canAssignJob: ["awaiting_assignment", "returned_to_office", "mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canAcceptJob: ["mechanic_assigned", "subcontractor_assigned"],
    canStartWork: ["mechanic_accepted"],
    canRequestParts: ["job_in_progress"],
    canReceiveParts: ["parts_outstanding"],
    canCompleteLineItems: ["job_in_progress", "parts_received"],
    canCompleteJob: ["job_in_progress", "parts_received"],
    canReturnToOffice: ["mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canQualityCheck: ["job_completed"],
    canUpdateVehicleStatus: ["*"],
    canCancelJob: ["*"],
  },
  "senior-mechanic": {
    canCreateJob: ["*"],
    canAssignJob: ["awaiting_assignment", "returned_to_office", "mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canAcceptJob: ["mechanic_assigned", "subcontractor_assigned"],
    canStartWork: ["mechanic_accepted"],
    canRequestParts: ["job_in_progress"],
    canReceiveParts: [],
    canCompleteLineItems: ["job_in_progress", "parts_received"],
    canCompleteJob: ["job_in_progress", "parts_received"],
    canReturnToOffice: ["mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canQualityCheck: ["job_completed"],
    canUpdateVehicleStatus: ["*"],
    canCancelJob: ["*"],
  },
  mechanic: {
    canCreateJob: ["*"],
    canAssignJob: [],
    canAcceptJob: ["mechanic_assigned", "subcontractor_assigned"],
    canStartWork: ["mechanic_accepted"],
    canRequestParts: ["job_in_progress"],
    canReceiveParts: [],
    canCompleteLineItems: ["job_in_progress", "parts_received"],
    canCompleteJob: ["job_in_progress", "parts_received"],
    canReturnToOffice: ["mechanic_assigned", "mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received"],
    canQualityCheck: [],
    canUpdateVehicleStatus: ["*"],
    canCancelJob: [],
  },
};

function hasPermission(role: string, action: string, status: string): boolean {
  const perms = PERMISSIONS[role];
  if (!perms) return false;
  const allowedStatuses = perms[action] || [];
  return allowedStatuses.includes("*") || allowedStatuses.includes(status);
}

export default function WorkflowActions({
  jobId,
  currentStatus,
  registrationNo,
  isOffice = false,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const supabase = createClient() as any;

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };
    const role = decodeURIComponent(getCookie("role") || "");
    setUserRole(role || "mechanic");
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    const { data } = await supabase
      .from("technicians_maysene")
      .select("id, name")
      .order("name");
    if (data) setTechnicians(data);
  };

  const getHumanError = (errorMsg: string): string => {
    if (!errorMsg) return "Something went wrong. Please try again.";
    if (errorMsg.includes("foreign key") || errorMsg.includes("violates foreign key constraint")) {
      return "The assigned technician no longer exists. Please refresh and try again.";
    }
    if (errorMsg.includes("permission denied") || errorMsg.includes("42501")) {
      return "You don't have permission to perform this action. Please contact your administrator.";
    }
    if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }
    if (errorMsg.length < 100 && !errorMsg.includes("error") && !errorMsg.includes("23")) {
      return errorMsg;
    }
    return "Failed to update status. Please try again or contact support.";
  };

  const updateStatus = async (newStatus: string, extraData?: any) => {
    setLoading(true);
    try {
      // Map workflow_status to human-readable status for the legacy status field
      const statusLabels: Record<string, string> = {
        "awaiting_assignment": "Awaiting Assignment",
        "mechanic_assigned": "Mechanic Assigned",
        "subcontractor_assigned": "Subcontractor Assigned",
        "mechanic_accepted": "Mechanic Accepted",
        "job_in_progress": "In Progress",
        "parts_outstanding": "Parts Outstanding",
        "parts_received": "Parts Received",
        "returned_to_office": "Returned to Office",
        "job_completed": "Completed",
        "quality_check_done": "Quality Check Done",
        "job_cancelled": "Cancelled",
      };

      const { error } = await supabase
        .from("workshop_job")
        .update({
          workflow_status: newStatus,
          status: statusLabels[newStatus] || newStatus,
          ...extraData,
        })
        .eq("id", jobId);

      if (error) {
        console.error("Error updating status:", error);
        throw new Error(error.message);
      }

      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift();
        return null;
      };
      const role = decodeURIComponent(getCookie("role") || "unknown");
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("job_status_history").insert({
        job_id: jobId,
        from_status: currentStatus,
        to_status: newStatus,
        notes: `Status changed from ${STATUS_LABELS[currentStatus as WorkflowStatus] || currentStatus} to ${STATUS_LABELS[newStatus as WorkflowStatus] || newStatus}`,
        changed_by: user?.id || null,
        changed_by_role: role,
      });

      toast.success(`Status updated to ${STATUS_LABELS[newStatus as WorkflowStatus]}`);
      onSuccess?.();
    } catch (error: any) {
      console.error("Status update failed:", error);
      toast.error(getHumanError(error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedTechnician) {
      toast.error("Please select a technician or subcontractor");
      return;
    }

    let techName = "";
    if (assignType === "internal") {
      const tech = technicians.find((t) => t.id === selectedTechnician);
      techName = tech?.name || "";
    } else {
      const sub = subcontractors.find((s) => s.id === selectedTechnician);
      techName = sub?.name || "";
    }

    const { data: currentJob } = await supabase
      .from("workshop_job")
      .select("assigned_mechanic_id, technician_name")
      .eq("id", jobId)
      .single();

    const isReassignment = currentJob?.technician_name && 
                           currentJob.technician_name !== techName;

    const newStatus = assignType === "subcontractor" ? "subcontractor_assigned" : "mechanic_assigned";

    await updateStatus(newStatus, {
      assigned_mechanic_id: null,
      technician_name: techName,
      assigned_to: assignType,
      assigned_at: new Date().toISOString(),
    });

    sendWorkshopNotification({
      eventType: "job_assigned",
      jobId,
      technicianName: techName,
      statusLabel: "Job Assigned",
    });

    if (isReassignment) {
      await supabase.from("job_status_history").insert({
        job_id: jobId,
        from_status: currentStatus || "unknown",
        to_status: newStatus,
        notes: `Reassigned from ${currentJob.technician_name || 'Unknown'} to ${techName}`,
      });
    }
  };

  const handleStartWork = async () => {
    await updateStatus("job_in_progress", {
      start_time: new Date().toISOString(),
    });
  };

  const handleAcceptJob = async () => {
    await updateStatus("mechanic_accepted", {
      accepted_at: new Date().toISOString(),
    });

    // Mark vehicle as unavailable
    try {
      const { data: job } = await supabase
        .from("workshop_job")
        .select("registration_no")
        .eq("id", jobId)
        .single();

      if (job?.registration_no) {
        await supabase
          .from("vehiclesc")
          .update({ 
            vehicle_available: false, 
            vehicle_not_available_reason: "Repairs" 
          })
          .eq("registration_number", job.registration_no);
      }
    } catch (err) {
      console.error("Failed to mark vehicle unavailable:", err);
    }
  };

  const handleRequestParts = async () => {
    await updateStatus("parts_outstanding");
    
    // Send notification
    sendWorkshopNotification({
      eventType: "parts_outstanding",
      jobId,
      statusLabel: "Parts Outstanding",
    });
  };

  const handlePartsReceived = async () => {
    await updateStatus("parts_received");
    
    // Send notification
    sendWorkshopNotification({
      eventType: "parts_received",
      jobId,
      statusLabel: "Parts Received",
    });
  };

  const handleCompleteJob = async () => {
    await updateStatus("job_completed", {
      completed_at: new Date().toISOString(),
    });
    
    // Send notification
    sendWorkshopNotification({
      eventType: "job_completed",
      jobId,
      statusLabel: "Job Completed",
    });
  };

  // Determine effective role - all fleet_manager variants map to office
  const effectiveIsOffice = isOffice || 
    userRole === "office" || 
    userRole === "fleet_manager" || 
    userRole === "fleet-manager" || 
    userRole === "fleet manager";
  const effectiveRole = effectiveIsOffice ? "office" : userRole;

  const canAssign = hasPermission(effectiveRole, "canAssignJob", currentStatus);
  const canAccept = hasPermission(effectiveRole, "canAcceptJob", currentStatus);
  const canStart = hasPermission(effectiveRole, "canStartWork", currentStatus);
  const canRequestParts = hasPermission(effectiveRole, "canRequestParts", currentStatus);
  const canReceiveParts = hasPermission(effectiveRole, "canReceiveParts", currentStatus);
  const canComplete = hasPermission(effectiveRole, "canCompleteJob", currentStatus);
  const canReturn = hasPermission(effectiveRole, "canReturnToOffice", currentStatus);
  const canQC = hasPermission(effectiveRole, "canQualityCheck", currentStatus);
  const canCancel = hasPermission(effectiveRole, "canCancelJob", currentStatus);

  // Fetch subcontractors for assign dropdown
  const [subcontractors, setSubcontractors] = useState<{id: string; name: string; skills?: string[]}[]>([]);
  const [assignType, setAssignType] = useState<"internal" | "subcontractor">("internal");

  useEffect(() => {
    if (effectiveIsOffice || effectiveRole === "senior-mechanic") {
      const fetchSubs = async () => {
        const { data } = await supabase
          .from("subcontractor")
          .select("id, name, skills")
          .order("name");
        if (data) setSubcontractors(data);
      };
      fetchSubs();
    }
  }, [effectiveIsOffice, effectiveRole]);

  const renderAssignSection = () => (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={assignType} onValueChange={(v: "internal" | "subcontractor") => { setAssignType(v); setSelectedTechnician(""); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="internal">Internal Tech</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1">
          <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
            <SelectTrigger>
              <SelectValue placeholder={assignType === "internal" ? "Select technician..." : "Select subcontractor..."} />
            </SelectTrigger>
            <SelectContent>
              {assignType === "internal" ? (
                technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))
              ) : (
                subcontractors.length === 0 ? (
                  <SelectItem value="none" disabled>No subcontractors</SelectItem>
                ) : (
                  subcontractors.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}{sub.skills?.length ? ` (${sub.skills.join(", ")})` : ""}
                    </SelectItem>
                  ))
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleAssignTechnician}
          disabled={loading || !selectedTechnician}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserCheck className="h-4 w-4 mr-2" />
          {currentStatus === "awaiting_assignment" ? "Assign" : "Re-Assign"}
        </Button>
      </div>
    </div>
  );

  const renderActions = () => {
    // Office role (includes fleet_manager, fleet-manager, fleet manager)
    if (effectiveIsOffice) {
      return (
        <div className="space-y-3">
          {canAssign && renderAssignSection()}
          <div className="flex gap-2 flex-wrap">
            {canAccept && (
              <Button onClick={handleAcceptJob} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                <CheckCircle className="h-4 w-4 mr-2" /> Accept Job
              </Button>
            )}
            {canStart && (
              <Button onClick={handleStartWork} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                <Play className="h-4 w-4 mr-2" /> Start Work
              </Button>
            )}
            {canRequestParts && (
              <Button onClick={handleRequestParts} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                <Package className="h-4 w-4 mr-2" /> Request Parts
              </Button>
            )}
            {canReceiveParts && (
              <Button onClick={handlePartsReceived} disabled={loading} className="bg-teal-600 hover:bg-teal-700">
                <Package className="h-4 w-4 mr-2" /> Confirm Parts Received
              </Button>
            )}
            {canComplete && (
              <Button onClick={handleCompleteJob} disabled={loading} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" /> Complete Job
              </Button>
            )}
            {canReturn && <ReturnToOfficeDialog jobId={jobId} currentStatus={currentStatus} onSuccess={onSuccess} />}
            {canQC && (
              <QualityCheckDialog jobId={jobId} currentStatus={currentStatus} registrationNo={registrationNo} onSuccess={onSuccess} />
            )}
            {canCancel && <CancelJobDialog jobId={jobId} currentStatus={currentStatus} registrationNo={registrationNo} onSuccess={onSuccess} />}
          </div>
        </div>
      );
    }

    // Senior Mechanic role
    if (effectiveRole === "senior-mechanic") {
      return (
        <div className="space-y-3">
          {canAssign && renderAssignSection()}
          <div className="flex gap-2 flex-wrap">
            {canAccept && (
              <Button onClick={handleAcceptJob} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                <CheckCircle className="h-4 w-4 mr-2" /> Accept Job
              </Button>
            )}
            {canStart && (
              <Button onClick={handleStartWork} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                <Play className="h-4 w-4 mr-2" /> Start Work
              </Button>
            )}
            {canRequestParts && (
              <Button onClick={handleRequestParts} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                <Package className="h-4 w-4 mr-2" /> Request Parts
              </Button>
            )}
            {canComplete && (
              <Button onClick={handleCompleteJob} disabled={loading} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" /> Complete Job
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {canReturn && <ReturnToOfficeDialog jobId={jobId} currentStatus={currentStatus} onSuccess={onSuccess} />}
            {canQC && (
              <QualityCheckDialog jobId={jobId} currentStatus={currentStatus} registrationNo={registrationNo} onSuccess={onSuccess} />
            )}
          </div>
        </div>
      );
    }

    // Mechanic role
    return (
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {canAccept && (
            <Button onClick={handleAcceptJob} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              <CheckCircle className="h-4 w-4 mr-2" /> Accept Job
            </Button>
          )}
          {canStart && (
            <Button onClick={handleStartWork} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              <Play className="h-4 w-4 mr-2" /> Start Work
            </Button>
          )}
          {canRequestParts && (
            <Button onClick={handleRequestParts} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
              <Package className="h-4 w-4 mr-2" /> Request Parts
            </Button>
          )}
          {canComplete && (
            <Button onClick={handleCompleteJob} disabled={loading} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" /> Complete Job
            </Button>
          )}
        </div>
        {canReturn && <ReturnToOfficeDialog jobId={jobId} currentStatus={currentStatus} onSuccess={onSuccess} />}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge className={STATUS_COLORS[currentStatus as WorkflowStatus] || "bg-gray-100"}>
          {STATUS_LABELS[currentStatus as WorkflowStatus] || currentStatus}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {effectiveRole}
        </Badge>
      </div>

      {renderActions()}

      {/* Pending QC Message */}
      {currentStatus === "job_completed" && !canQC && (
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Pending Quality Check</strong> — A Senior Mechanic or Office user must complete the quality check before this job is finalized.
          </p>
        </div>
      )}
    </div>
  );
}
