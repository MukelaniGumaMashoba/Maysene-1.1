"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, Wrench, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
  source?: string;
}

interface Props {
  supabase: ReturnType<typeof createClient>;
  onJobUpdated: () => void;
}

export default function FleetJobsForAdmin({ supabase, onJobUpdated }: Props) {
  const [fleetJobs, setFleetJobs] = useState<WorkshopJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFleetJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("workshop_job")
      .select("*")
      .in("status", ["Pending Admin Review"])
      .order("created_at", { ascending: false });

    if (!error && data) setFleetJobs(data as WorkshopJob[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchFleetJobs();
  }, []);

  const handleAccept = async (job: WorkshopJob) => {
    const { error } = await supabase
      .from("workshop_job")
      .update({ status: "Awaiting Approval" })
      .eq("id", job.id);

    if (error) {
      toast.error("Failed to accept job");
      return;
    }
    toast.success(`Job ${job.jobId_workshop} accepted — now in Workshop Jobs`);
    fetchFleetJobs();
    onJobUpdated();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "emergency": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  if (loading) return <p className="text-gray-500 text-center py-8">Loading fleet jobs...</p>;

  if (fleetJobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No jobs from fleet manager</p>
        <p className="text-sm text-gray-400 mt-1">Jobs sent by fleet manager will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge className="bg-blue-100 text-blue-800">{fleetJobs.length} incoming</Badge>
        <span className="text-sm text-gray-500">Jobs sent from fleet manager for admin processing</span>
      </div>

      {fleetJobs.map((job) => (
        <Card key={job.id} className="border-l-4 border-l-blue-400">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">{job.jobId_workshop}</CardTitle>
                <Badge className="bg-blue-100 text-blue-800">Pending Admin Review</Badge>
                <Badge className={getPriorityColor(job.priority)}>{job.priority}</Badge>
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
                <p className="text-gray-500">Location</p>
                <p className="font-medium">{job.location || "N/A"}</p>
              </div>
            </div>

            <div>
              <p className="text-gray-500 text-sm">Description</p>
              <p className="text-sm">{job.description}</p>
            </div>

            {job.notes && (
              <div className="bg-gray-50 p-3 rounded text-sm">
                <strong>Notes:</strong> {job.notes}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t pt-4">
            <Link href={`/jobWorkShop/${job.id}`}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View & Process
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => handleAccept(job)}
            >
              <Wrench className="h-4 w-4 mr-2" />
              Accept & Start Processing
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
