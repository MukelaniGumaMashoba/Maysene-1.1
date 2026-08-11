"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Download,
  FileText,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface CompletedJob {
  id: number
  jobId_workshop?: string
  description?: string
  registration_no?: string
  fleet_number?: string
  vehicle_make?: string
  vehicle_model?: string
  technician_name?: string
  assigned_to_type?: string
  subcontractor_name?: string
  completed_at?: string
  quality_check_date?: string
  assigned_at?: string
  workflow_status?: string
  priority?: string
  job_type?: string
  source_type?: string
  line_items?: any[]
  qc_notes?: string
  cancelled_reason?: string
  time_taken_hours?: number
}

interface ReportFilters {
  start_date: string
  end_date: string
  job_type: string
  assigned_to: string
  line_item: string
  priority: string
}

const JOB_TYPES = [
  "Scheduled Maintenance",
  "Unscheduled Repair",
  "Emergency Repair",
  "Inspection",
  "Warranty",
  "Recall",
  "PDI",
]

const PRIORITIES = ["Low", "Medium", "High", "Critical"]
const SOURCE_TYPES = ["Internal", "Subcontractor"]

export default function CompletedJobsReport() {
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([])
  const [filteredJobs, setFilteredJobs] = useState<CompletedJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([])
  const [filters, setFilters] = useState<ReportFilters>({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    job_type: "all",
    assigned_to: "all",
    line_item: "",
    priority: "all",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const supabase = createClient()

  useEffect(() => {
    fetchCompletedJobs()
    fetchTechnicians()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [completedJobs, filters])

  const fetchTechnicians = async () => {
    const { data } = await supabase
      .from("technicians_maysene")
      .select("id, name")
      .order("name")
    if (data) setTechnicians(data)
  }

  const fetchCompletedJobs = async () => {
    setIsLoading(true)
    try {
      // Fetch completed and quality-checked jobs
      const { data: jobs, error } = await supabase
        .from("workshop_job")
        .select("*")
        .in("workflow_status", [
          "job_completed",
          "quality_check_done",
          "returned_to_office",
        ])
        .order("completed_at", { ascending: false })

      if (error) throw error

      // Fetch line items for each job
      const jobsWithDetails = await Promise.all(
        (jobs || []).map(async (job: any) => {
          let lineItems: any[] = []
          let qcNotes = ""

          // Fetch line items
          try {
            const { data: items } = await supabase
              .from("job_line_items")
              .select("*")
              .eq("job_id", job.id)
            lineItems = items || []
          } catch (err) {
            console.error("Error fetching line items:", err)
          }

          // Fetch quality check notes from status history
          try {
            const { data: history } = await supabase
              .from("job_status_history")
              .select("notes, created_at")
              .eq("job_id", job.id)
              .eq("to_status", "quality_check_done")
              .order("created_at", { ascending: false })
              .limit(1)
            if (history && history.length > 0) {
              qcNotes = history[0].notes || ""
            }
          } catch (err) {
            console.error("Error fetching QC history:", err)
          }

          // Calculate time taken
          let timeTakenHours = 0
          if (job.assigned_at && job.completed_at) {
            const assigned = new Date(job.assigned_at)
            const completed = new Date(job.completed_at)
            timeTakenHours = Math.round(
              (completed.getTime() - assigned.getTime()) / (1000 * 60 * 60) * 10
            ) / 10
          }

          // Determine assigned to type
          let assignedToType = "Internal"
          let subcontractorName = ""
          if (job.assigned_to === "subcontractor" || job.subcontractor_id) {
            assignedToType = "Subcontractor"
            if (job.subcontractor_id) {
              try {
                const { data: sub } = await supabase
                  .from("subcontractor")
                  .select("name")
                  .eq("id", job.subcontractor_id)
                  .single()
                subcontractorName = sub?.name || ""
              } catch (err) {}
            }
          }

          // Get technician name
          let technicianName = job.technician_name || "Unassigned"
          if (job.assigned_mechanic_id && !job.technician_name) {
            try {
              const { data: tech } = await supabase
                .from("technicians_maysene")
                .select("name")
                .eq("id", job.assigned_mechanic_id)
                .single()
              if (tech) technicianName = tech.name
            } catch (err) {}
          }

          return {
            ...job,
            technician_name: technicianName,
            assigned_to_type: assignedToType,
            subcontractor_name: subcontractorName,
            line_items: lineItems,
            qc_notes: qcNotes,
            time_taken_hours: timeTakenHours,
            source_type: assignedToType,
          }
        })
      )

      setCompletedJobs(jobsWithDetails)
    } catch (error) {
      console.error("Error fetching completed jobs:", error)
      toast.error("Failed to fetch completed jobs")
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...completedJobs]

    // Date range
    if (filters.start_date) {
      filtered = filtered.filter(
        (job) =>
          job.completed_at &&
          new Date(job.completed_at) >= new Date(filters.start_date)
      )
    }
    if (filters.end_date) {
      const endDate = new Date(filters.end_date)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(
        (job) =>
          job.completed_at && new Date(job.completed_at) <= endDate
      )
    }

    // Job type
    if (filters.job_type && filters.job_type !== "all") {
      filtered = filtered.filter(
        (job) => job.job_type?.toLowerCase() === filters.job_type.toLowerCase()
      )
    }

    // Assigned to (internal/subcontractor)
    if (filters.assigned_to && filters.assigned_to !== "all") {
      filtered = filtered.filter(
        (job) =>
          job.assigned_to_type?.toLowerCase() ===
          filters.assigned_to.toLowerCase()
      )
    }

    // Priority
    if (filters.priority && filters.priority !== "all") {
      filtered = filtered.filter(
        (job) =>
          job.priority?.toLowerCase() === filters.priority.toLowerCase()
      )
    }

    // Line item search
    if (filters.line_item) {
      filtered = filtered.filter((job) =>
        job.line_items?.some((item: any) =>
          (item.description || item.name)?.toLowerCase().includes(filters.line_item.toLowerCase())
        )
      )
    }

    setFilteredJobs(filtered)
    setCurrentPage(1)
  }

  const exportToCSV = () => {
    const headers = [
      "Job Number",
      "Vehicle Reg",
      "Fleet Number",
      "Job Type",
      "Source Type",
      "Line Items",
      "Priority",
      "Technician",
      "Subcontractor",
      "Completion Date",
      "QC Date",
      "QC Notes",
      "Time Taken (hrs)",
      "Status",
    ]

    const rows = filteredJobs.map((job) => [
      job.jobId_workshop || job.id,
      job.registration_no || "",
      job.fleet_number || "",
      job.job_type || "",
      job.source_type || "",
      job.line_items?.map((i: any) => i.name || i.description || "").join("; ") || "",
      job.priority || "",
      job.technician_name || "",
      job.subcontractor_name || "",
      job.completed_at
        ? new Date(job.completed_at).toLocaleDateString("en-ZA")
        : "",
      job.quality_check_date
        ? new Date(job.quality_check_date).toLocaleDateString("en-ZA")
        : "",
      (job.qc_notes || "").replace(/[\r\n]+/g, " "),
      job.time_taken_hours?.toString() || "",
      job.workflow_status === "quality_check_done"
        ? "QC Passed"
        : job.workflow_status === "returned_to_office"
        ? "Returned"
        : "Completed",
    ])

    const csvContent = "\uFEFF" + [headers, ...rows]
      .map((row) =>
        row.map((cell) => {
          const val = String(cell ?? "").replace(/[\r\n]+/g, " ");
          return `"${val.replace(/"/g, '""')}"`;
        }).join(",")
      )
      .join("\r\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `completed-jobs-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    toast.success("CSV exported successfully")
  }

  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "quality_check_done":
        return <Badge className="bg-green-100 text-green-700">QC Passed</Badge>
      case "returned_to_office":
        return <Badge className="bg-red-100 text-red-700">Returned</Badge>
      case "job_completed":
        return <Badge className="bg-blue-100 text-blue-700">Completed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Completed Jobs Report
          </CardTitle>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-xs font-medium">Start Date</Label>
            <Input
              type="date"
              value={filters.start_date}
              onChange={(e) =>
                setFilters({ ...filters, start_date: e.target.value })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">End Date</Label>
            <Input
              type="date"
              value={filters.end_date}
              onChange={(e) =>
                setFilters({ ...filters, end_date: e.target.value })
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Job Type</Label>
            <Select
              value={filters.job_type}
              onValueChange={(v) => setFilters({ ...filters, job_type: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {JOB_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium">Assigned To</Label>
            <Select
              value={filters.assigned_to}
              onValueChange={(v) => setFilters({ ...filters, assigned_to: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="subcontractor">Subcontractor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium">Priority</Label>
            <Select
              value={filters.priority}
              onValueChange={(v) => setFilters({ ...filters, priority: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium">Line Item</Label>
            <Input
              placeholder="Search line items..."
              value={filters.line_item}
              onChange={(e) =>
                setFilters({ ...filters, line_item: e.target.value })
              }
              className="mt-1"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-4 mb-4 text-sm text-gray-600">
          <span>
            Showing {filteredJobs.length} of {completedJobs.length} jobs
          </span>
          <span>|</span>
          <span>
            Total Time:{" "}
            {filteredJobs
              .reduce((sum, j) => sum + (j.time_taken_hours || 0), 0)
              .toFixed(1)}{" "}
            hrs
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-8">Loading completed jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No completed jobs found for the selected filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job #</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Fleet #</TableHead>
                    <TableHead>Job Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Line Items</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Subcontractor</TableHead>
                    <TableHead>QC Details</TableHead>
                    <TableHead>Time (hrs)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        {job.jobId_workshop || job.id}
                      </TableCell>
                      <TableCell>{job.registration_no || "-"}</TableCell>
                      <TableCell>{job.fleet_number || "-"}</TableCell>
                      <TableCell>{job.job_type || "-"}</TableCell>
                      <TableCell>{job.source_type || "-"}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={job.line_items?.map((i: any) => i.name).join(", ")}>
                          {job.line_items?.length || 0} items
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            job.priority === "Critical"
                              ? "destructive"
                              : job.priority === "High"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {job.priority || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.technician_name || "-"}</TableCell>
                      <TableCell>{job.subcontractor_name || "-"}</TableCell>
                      <TableCell>
                        {job.qc_notes ? (
                          <div
                            className="max-w-[150px] truncate text-xs"
                            title={job.qc_notes}
                          >
                            {job.qc_notes}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {job.time_taken_hours
                          ? `${job.time_taken_hours}h`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(job.workflow_status || "")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
