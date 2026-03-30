"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function SubcontractorJobAllocationBoard() {
  const supabase = createClient() as any;
  const [jobs, setJobs] = useState<any[]>([]);
  const [allocatedJobs, setAllocatedJobs] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [jobsRes, allocatedRes, subcontractorsRes] = await Promise.all([
      supabase
        .from("workshop_job")
        .select("*")
        .is("subcontractor_id", null)
        .neq("status", "Completed"),
      supabase
        .from("workshop_job")
        .select(`*, subcontractor('*')`)
        .not("subcontractor_id", "is", null),
      supabase
        .from("subcontractor")
        .select("*")
        // .eq("availability", true),
    ]);

    setJobs(jobsRes.data || []);
    setAllocatedJobs(allocatedRes.data || []);
    setSubcontractors(subcontractorsRes.data || []);
  };

  const allocateJob = async (jobId: string) => {
    const subcontractorId = selectedSubcontractor[jobId];

    if (!subcontractorId) {
      toast.error("Select a subcontractor first");
      return;
    }

    const { error } = await supabase
      .from("workshop_job")
      .update({
        subcontractor_id: subcontractorId,
        allocation_status: "allocated",
      })
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to allocate job");
      return;
    }

    toast.success("Job allocated successfully");
    fetchData();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subcontractor Job Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="allocate" className="space-y-4">
          <TabsList>
            <TabsTrigger value="allocate">Allocate Jobs</TabsTrigger>
            <TabsTrigger value="allocated">Allocated Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="allocate">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job No</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.id}</TableCell>
                    <TableCell>{job.registration_no}</TableCell>
                    <TableCell>{job.client_name}</TableCell>
                    <TableCell>
                      <Select
                        value={selectedSubcontractor[job.id] || ""}
                        onValueChange={(value) =>
                          setSelectedSubcontractor((prev) => ({
                            ...prev,
                            [job.id]: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcontractor" />
                        </SelectTrigger>
                        <SelectContent>
                          {subcontractors.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button onClick={() => allocateJob(job.id)}>Allocate</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="allocated">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job No</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Allocated To</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocatedJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.id}</TableCell>
                    <TableCell>{job.registration_no}</TableCell>
                    <TableCell>{job.client_name}</TableCell>
                    <TableCell>{job.subcontractors?.name || "Unknown"}</TableCell>
                    <TableCell>{job.allocation_status || "allocated"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
