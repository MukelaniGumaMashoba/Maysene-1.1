"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, Clock, Wrench } from "lucide-react";
import { toast } from "sonner";

interface WorkshopJob {
  id: number;
  jobId_workshop: string;
  registration_no: string;
  job_type: string;
  description: string;
  status: string;
  priority: string;
  client_name: string;
  location: string;
  notes: string;
  created_at: string;
  fleet_job_id?: number;
  total_labor_cost?: number;
  total_parts_cost?: number;
  total_sublet_cost?: number;
  source?: string;
}

interface Props {
  supabase: ReturnType<typeof createClient>;
  onRefresh: () => void;
}

export default function PendingFleetApprovalTab({ supabase, onRefresh }: Props) {
  const [pendingJobs, setPendingJobs] = useState<WorkshopJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("workshop_job")
      .select("*")
      .eq("status", "Awaiting Fleet Approval")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPendingJobs(data as WorkshopJob[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingJobs();
  }, []);

  const handleApprove = async (job: WorkshopJob) => {
    const { error } = await supabase
      .from("workshop_job")
      .update({ status: "Approved" })
      .eq("id", job.id);

    if (error) {
      toast.error("Failed to approve job");
      return;
    }

    // If linked to a fleet job, update it too
    if (job.fleet_job_id) {
      await supabase
        .from("job_assignments")
        .update({ status: "approved" })
        .eq("id", job.fleet_job_id);
    }

    toast.success(`Job ${job.jobId_workshop} approved`);
    fetchPendingJobs();
    onRefresh();
  };

  const handleReject = async (job: WorkshopJob) => {
    const { error } = await supabase
      .from("workshop_job")
      .update({ status: "Rejected" })
      .eq("id", job.id);

    if (error) {
      toast.error("Failed to reject job");
      return;
    }

    if (job.fleet_job_id) {
      await supabase
        .from("job_assignments")
        .update({ status: "awaiting-approval" })
        .eq("id", job.fleet_job_id);
    }

    toast.success(`Job ${job.jobId_workshop} rejected`);
    fetchPendingJobs();
    onRefresh();
  };

  if (loading) return <p className="text-gray-500 text-center py-8">Loading pending approvals...</p>;

  if (pendingJobs.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No jobs pending your approval</p>
        <p className="text-sm text-gray-400 mt-1">Jobs sent back from admin will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge className="bg-orange-100 text-orange-800">{pendingJobs.length} pending</Badge>
        <span className="text-sm text-gray-500">Jobs processed by admin awaiting your approval</span>
      </div>

      {pendingJobs.map((job) => {
        const totalCost = (job.total_labor_cost ?? 0) + (job.total_parts_cost ?? 0) + (job.total_sublet_cost ?? 0);
        return (
          <Card key={job.id} className="border-l-4 border-l-orange-400">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-lg">{job.jobId_workshop}</CardTitle>
                  <Badge className="bg-orange-100 text-orange-800">Awaiting Your Approval</Badge>
                  {job.source === "inspection" && (
                    <Badge variant="outline" className="text-xs">From Inspection</Badge>
                  )}
                  {job.source === "fleet" && (
                    <Badge variant="outline" className="text-xs">From Fleet Job</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {new Date(job.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Vehicle</p>
                  <p className="font-medium">{job.registration_no || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Job Type</p>
                  <p className="font-medium capitalize">{job.job_type}</p>
                </div>
                <div>
                  <p className="text-gray-500">Driver / Client</p>
                  <p className="font-medium">{job.client_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Cost</p>
                  <p className="font-medium text-green-700">
                    {totalCost > 0 ? `R ${totalCost.toFixed(2)}` : "Pending"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-sm">Description</p>
                <p className="text-sm">{job.description}</p>
              </div>

              {job.notes && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Admin Notes:</strong> {job.notes}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-sm bg-blue-50 p-3 rounded">
                <div>
                  <p className="text-gray-500">Labour</p>
                  <p className="font-medium">R {(job.total_labor_cost ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Parts</p>
                  <p className="font-medium">R {(job.total_parts_cost ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Sublets</p>
                  <p className="font-medium">R {(job.total_sublet_cost ?? 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleReject(job)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleApprove(job)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
