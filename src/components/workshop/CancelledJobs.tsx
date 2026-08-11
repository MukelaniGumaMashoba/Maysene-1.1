"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  XCircle,
  Eye,
  Calendar,
  Search,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface CancelledJob {
  id: number
  jobid_workshop: string
  registration_no: string
  job_type: string
  description: string
  priority: string
  cancelled_reason: string
  notes: string
  created_at: string
  cancelled_at: string
  cancelled_by: string
  cancelled_by_name?: string
  fleet_number?: string
  trailer_registration?: string
  workflow_status: string
}

export default function CancelledJobs() {
  const [cancelledJobs, setCancelledJobs] = useState<CancelledJob[]>([])
  const [filteredJobs, setFilteredJobs] = useState<CancelledJob[]>([])
  const [selectedJob, setSelectedJob] = useState<CancelledJob | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchCancelledJobs()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [cancelledJobs, dateFrom, dateTo, searchTerm])

  const fetchCancelledJobs = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("workshop_job")
        .select("*")
        .eq("workflow_status", "job_cancelled")
        .order("cancelled_at", { ascending: false })

      if (!error && data) {
        const jobsWithNames = await Promise.all(
          data.map(async (job: any) => {
            let cancelledByName = "Unknown"
            if (job.cancelled_by) {
              const { data: userData } = await supabase
                .from("users")
                .select("email")
                .eq("id", job.cancelled_by)
                .single()
              if (userData?.email) {
                cancelledByName = userData.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
              } else {
                const { data: techData } = await supabase
                  .from("technicians_maysene")
                  .select("name")
                  .eq("id", job.cancelled_by)
                  .single()
                if (techData?.name) {
                  cancelledByName = techData.name
                }
              }
            }
            return { ...job, cancelled_by_name: cancelledByName }
          })
        )
        setCancelledJobs(jobsWithNames as CancelledJob[])
      }
    } catch (err) {
      console.error("Error fetching cancelled jobs:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let result = [...cancelledJobs]

    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      result = result.filter((job) => {
        const jobDate = new Date(job.cancelled_at || job.created_at)
        return jobDate >= fromDate
      })
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      result = result.filter((job) => {
        const jobDate = new Date(job.cancelled_at || job.created_at)
        return jobDate <= toDate
      })
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (job) =>
          job.jobid_workshop?.toLowerCase().includes(term) ||
          job.registration_no?.toLowerCase().includes(term) ||
          job.fleet_number?.toLowerCase().includes(term) ||
          job.cancelled_reason?.toLowerCase().includes(term)
      )
    }

    setFilteredJobs(result)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span>Cancelled Jobs</span>
          </CardTitle>
          <CardDescription>
            Jobs that have been cancelled with reasons and details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="dateFrom" className="text-sm font-medium">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="dateTo" className="text-sm font-medium">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm font-medium">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Job #, Registration, Fleet #, Reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom("")
                  setDateTo("")
                  setSearchTerm("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <p>Loading cancelled jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No cancelled jobs found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job #</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Fleet #</TableHead>
                    <TableHead>Cancelled Reason</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date Cancelled</TableHead>
                    <TableHead>Cancelled By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.jobid_workshop || "N/A"}</TableCell>
                      <TableCell>{job.registration_no || "N/A"}</TableCell>
                      <TableCell>{job.fleet_number || "N/A"}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={job.cancelled_reason}>
                        {job.cancelled_reason || "No reason"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={job.notes}>
                        {job.notes || "-"}
                      </TableCell>
                      <TableCell>{formatDate(job.cancelled_at)}</TableCell>
                      <TableCell>{job.cancelled_by_name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedJob(job)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {filteredJobs.length > 0 && (
            <div className="mt-4 text-sm text-gray-500 text-right">
              Showing {filteredJobs.length} of {cancelledJobs.length} cancelled jobs
            </div>
          )}
        </CardContent>
      </Card>

      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cancelled Job Details - {selectedJob.jobid_workshop}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Vehicle Information</h4>
                  <p className="text-sm"><strong>Registration:</strong> {selectedJob.registration_no || "N/A"}</p>
                  {selectedJob.fleet_number && <p className="text-sm"><strong>Fleet #:</strong> {selectedJob.fleet_number}</p>}
                  {selectedJob.trailer_registration && <p className="text-sm"><strong>Trailer:</strong> {selectedJob.trailer_registration}</p>}
                  <p className="text-sm"><strong>Job Type:</strong> {selectedJob.job_type || "N/A"}</p>
                  <p className="text-sm"><strong>Priority:</strong> {selectedJob.priority || "N/A"}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Cancellation Details</h4>
                  <p className="text-sm"><strong>Cancelled At:</strong> {formatDate(selectedJob.cancelled_at)}</p>
                  <p className="text-sm"><strong>Cancelled By:</strong> {selectedJob.cancelled_by_name}</p>
                  <p className="text-sm"><strong>Reason:</strong> {selectedJob.cancelled_reason || "N/A"}</p>
                </div>
              </div>
              {selectedJob.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm p-3 bg-gray-50 rounded-md">{selectedJob.description}</p>
                </div>
              )}
              {selectedJob.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm p-3 bg-gray-50 rounded-md">{selectedJob.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}