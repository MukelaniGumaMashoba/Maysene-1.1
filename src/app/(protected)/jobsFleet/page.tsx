"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Clock,
  MapPin,
  User,
  Truck,
  DollarSign,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Edit,
  MessageSquare,
  FileImage,
  Download,
  RefreshCcw,
  Package,
  AlertTriangle,
  BarChart3,
  TrendingDown,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Modal from "@/components/modals/modal";
import { AllocateSubcontractorDialog } from "@/components/modals/subcontractors";
import { SendToWorkshopDialog } from "@/components/modals/send-to-workshop";
import PendingFleetApprovalTab from "@/components/workshop/PendingFleetApprovalTab";
import JobCardWorkflow from "@/components/ui-personal/job-card-workflow";

interface Job {
  id: number;
  job_id: string;
  title: string;
  description: string;
  status: string;
  priority: "low" | "medium" | "high" | "emergency";
  created_at: string;
  updated_at: string;
  drivers: {
    length: number;
    first_name: string | null;
    surname: string | null;
    cell_number: string | null;
    job_allocated: boolean;
  } | null;
  vehiclesc: {
    length: number;
    registration_number: string | null;
    make: string | null;
    model: string | null;
    fleet_number: string;
  } | null;
  location: string;
  coordinates: { lat: number; lng: number };
  technician_id: number | null;
  technicians?: Technician;
  estimatedCost?: number;
  actualCost?: number;
  clientType: "internal" | "external";
  clientName?: string;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: string;
  notes: string;
  attachments: string[];
  completed_at: string;
  eta: string;
  service: string;
  created: number;
}

interface Technician {
  id: number;
  name: string;
  surname: string;
  phone: string;
  location: string;
  rating: string;
  specialties: string[];
}

export default function FleetJobsPage() {
  // active jobs shown in the List tab
  const [jobs, setJobs] = useState<Job[]>([]);
  // all jobs (including completed/cancelled) used by Kanban & Analytics
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  // filtered list derived from active jobs + search/status filters
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [completed, setCompleted] = useState<Job[]>([]);

  // Workshop jobs state for fleet manager view
  const [workshopJobs, setWorkshopJobs] = useState<any[]>([]);
  const [workshopJobsLoading, setWorkshopJobsLoading] = useState(false);
  const [workshopJobWorkflow, setWorkshopJobWorkflow] = useState<any>(null);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);

  // Stock levels state
  const [stockParts, setStockParts] = useState<any[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [searchTechnicianLocation, setSearchTechnicianLocation] = useState("");
  const [selectedJobForTech, setSelectedJobForTech] = useState<Job | null>(
    null,
  );
  const [isTechDialogOpen, setIsTechDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "inprogress":
        return "bg-orange-100 text-orange-800";
      case "awaiting-approval":
        return "bg-purple-100 text-purple-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "Breakdown Request":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "emergency":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const handleCreatedRequired = async (
    jobId: number,
    status: string,
    notes?: string,
    created?: number,
  ) => {
    try {
      const { error } = await supabase
        .from("job_assignments")
        .update({
          status: status,
          notes: notes || "",
          created: created,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (error) {
        console.error("Error updating job status:", error);
        return;
      }

      alert("Job successful, status updated successfully.");

      setIsUpdateDialogOpen(false);
      setNewStatus("");
      setUpdateNotes("");
      await getJobs(); // refresh after update
    } catch (error) {
      console.error("Error updating job status:", error);
    }
  };

  const handleUpdateJobStatus = async (
    jobId: number,
    status: string,
    notes?: string,
  ) => {
    try {
      const { error } = await supabase
        .from("job_assignments")
        .update({
          status: status,
          notes: notes || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (error) {
        console.error("Error updating job status:", error);
        return;
      }

      setIsUpdateDialogOpen(false);
      setNewStatus("");
      setUpdateNotes("");
      await getJobs(); // refresh after update
    } catch (error) {
      console.error("Error updating job status:", error);
    }
  };

  const canApproveJobs = userRole === "fleet-manager";
  const canUpdateStatus =
    userRole === "call-center" || userRole === "fleet-manager";

  // Sync input when selectedJobForTech changes
  useEffect(() => {
    if (selectedJobForTech?.location) {
      setSearchTechnicianLocation(selectedJobForTech.location);
    } else {
      setSearchTechnicianLocation("");
    }
  }, [selectedJobForTech]);

  // Fetch all jobs (including completed/cancelled). Then derive active and completed.
  const getJobs = async () => {
    const { data: jobsData, error } = await supabase
      .from("job_assignments")
      .select(
        `
          *,
          drivers (*),
          vehiclesc (*),
          technicians:technician_id(*)
        `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }
    const all = (jobsData || []) as unknown as Job[];
    setAllJobs(all);

    // Active jobs for the List tab (exclude completed, cancelled, and rejected)
    const active = all.filter((j) => {
      const statusLower = j.status?.toLowerCase?.() ?? "";
      const isCompleted = statusLower === "completed";
      const isCancelled = statusLower === "cancelled";
      const isRejected = j.created === 1;

      return !isCompleted && !isCancelled && !isRejected;
    });
    setJobs(active);
    setFilteredJobs(active);

    // Completed jobs for analytics/cards that rely on completed
    const completedJobs = all.filter((j) => j.status === "completed");
    setCompleted(completedJobs);
  };

  // Fetch technicians from Supabase
  const fetchTechnicians = async () => {
    const { data, error } = await supabase.from("technicians").select("*");
    if (error) {
      console.error("Error fetching technicians:", error);
      setTechnicians([]); // Optional fallback
    } else {
      const mappedTechnicians = data.map((tech) => ({
        id: tech.id,
        name: tech.name,
      }));
      setTechnicians(mappedTechnicians as unknown as Technician[]);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchWorkshopJobs = async () => {
    setWorkshopJobsLoading(true);
    const { data, error } = await supabase
      .from("workshop_job")
      .select("*")
      .not("fleet_job_id", "is", null)
      .order("created_at", { ascending: false });
    if (!error && data) setWorkshopJobs(data);
    setWorkshopJobsLoading(false);
  };

  const fetchStockLevels = async () => {
    setStockLoading(true);
    const { data, error } = await supabase
      .from("parts")
      .select(`*, categories(name)`)
      .order("description");
    if (!error && data) setStockParts(data);
    setStockLoading(false);
  };

  const getStockStatus = (quantity: number, threshold = 5) => {
    if (quantity === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-800" };
    if (quantity <= threshold) return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800" };
    return { label: "In Stock", color: "bg-green-100 text-green-800" };
  };

  // Assign the selected technician to the job
  const assignTechnicianToJob = async (
    technicianId: number,
    technicianName: string,
  ) => {
    if (!selectedJobForTech) return;

    const { error } = await supabase
      .from("job_assignments")
      .update({
        technician_id: technicianId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedJobForTech.id);

    if (error) {
      toast.error("Failed to assign technician.");
      console.error(error);
    } else {
      toast.success(`Assigned ${technicianName} to job.`);
      setIsTechDialogOpen(false);
      await getJobs();
    }
  };

  useEffect(() => {
    const assignements = supabase
      .channel("public:assignments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments" },
        (payload) => {
          console.log("Change received in assignments table!", payload);
          getJobs();
        },
      )
      .subscribe();

    const jobAssignments = supabase
      .channel("public:job_assignments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_assignments" },
        (payload) => {
          console.log("Change received in job_assignments:", payload);
          getJobs();
        },
      )
      .subscribe();

    const role = localStorage.getItem("userRole") || "call-center";
    setUserRole(role);

    getJobs();

    return () => {
      jobAssignments.unsubscribe();
      assignements.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter active jobs once data is loaded or when search/status/priority changes
  useEffect(() => {
    // operate over active jobs (jobs state)
    let filtered = jobs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((job) => {
        const searchLower = searchTerm.toLowerCase();

        if (
          job.job_id?.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower)
        ) {
          return true;
        }

        if (job.drivers) {
          const driverName = job.drivers?.first_name?.toLowerCase() || "";
          const driverSurname = job.drivers?.surname?.toLowerCase() || "";
          if (
            driverName.includes(searchLower) ||
            driverSurname.includes(searchLower)
          ) {
            return true;
          }
        }

        if (job.vehiclesc) {
          const regNumber = job.vehiclesc.registration_number || "";
          const make = job.vehiclesc.make || "";
          const model = job.vehiclesc.model || "";
          if (
            regNumber.toLowerCase().includes(searchLower) ||
            make.toLowerCase().includes(searchLower) ||
            model.toLowerCase().includes(searchLower)
          ) {
            return true;
          }
        }

        return false;
      });
    }

    // Status filter (only for active jobs)
    if (statusFilter !== "all") {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    // service  filter
    if (serviceFilter !== "all") {
      filtered = filtered.filter((job) => job.service === serviceFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((job) => job.priority === priorityFilter);
    }

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, statusFilter, priorityFilter]);

  const handleRefreshClick = () => {
    getJobs();
  };

  useEffect(() => {
    handleRefreshClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTechnicians = technicians.filter((tech) => {
    if (!selectedJobForTech?.location || !tech.location) return false;

    const jobLocationTerms = selectedJobForTech.location
      .toLowerCase()
      .split(/[\s,]+/);
    const techLocationTerms = tech.location.toLowerCase().split(/[\s,]+/);

    return jobLocationTerms.some((term) => techLocationTerms.includes(term));
  });

  // Close the job
  const closeJob = async (jobId: string) => {
    const { error } = await supabase
      .from("job_assignments")
      .update({ status: "closed" })
      .eq("job_id", jobId);

    if (error) {
      console.error("Error closing job:", error);
    } else {
      console.log("Job closed successfully");
      getJobs();
    }
  };

  const handleCloseJob = (jobId: string) => {
    if (confirm("Are you sure you want to close this job?")) {
      closeJob(jobId);
    }
  };
  const handleChangeDetails = (job: Job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const getDays = (createdDate: string) => {
    const start = new Date(createdDate);
    const end = new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Collate rejected or cancelled jobs for the Rejected tab
  const rejectedJobs = allJobs.filter((job) => {
    const statusLower = job.status?.toLowerCase?.() ?? "";
    return job.created === 1 || statusLower === "cancelled";
  });

  return (
    <>
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">All Jobs</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Breakdown Request">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="inprogress">In Progress</SelectItem>
                <SelectItem value="Breakdown Request">
                  Breakdown Request
                </SelectItem>
                <SelectItem value="Technician on site">
                  Technician On Site
                </SelectItem>
                <SelectItem value="Technician accepted">
                  Technician accepted
                </SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="Mechanical Failure">
                  Mechanical Failure
                </SelectItem>
                <SelectItem value="Electrical Issue">
                  Electrical Issue
                </SelectItem>
                <SelectItem value="Bodywork Repair">Bodywork Repair</SelectItem>
              </SelectContent>
            </Select>

            <div className="mt-4">
              <button onClick={handleRefreshClick}>
                <RefreshCcw />
              </button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Job List</TabsTrigger>
            <TabsTrigger value="pending-approval">Pending Fleet Approval</TabsTrigger>
            <TabsTrigger value="workshop-jobs" onClick={fetchWorkshopJobs}>Workshop Jobs</TabsTrigger>
            <TabsTrigger value="stock-levels" onClick={fetchStockLevels}>Stock Levels</TabsTrigger>
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="calendar">Rejected</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="pending-approval" className="space-y-4">
            <PendingFleetApprovalTab supabase={supabase} onRefresh={getJobs} />
          </TabsContent>

          {/* Workshop Jobs Tab — shows all workshop jobs linked to fleet jobs */}
          <TabsContent value="workshop-jobs" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Workshop Jobs</h3>
              <button onClick={fetchWorkshopJobs} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <RefreshCcw className="h-3 w-3" /> Refresh
              </button>
            </div>
            {workshopJobsLoading ? (
              <p className="text-center text-gray-500 py-8">Loading workshop jobs...</p>
            ) : workshopJobs.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No workshop jobs linked to fleet jobs yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {workshopJobs.map((job) => {
                  const totalCost = (job.total_labor_cost ?? 0) + (job.total_parts_cost ?? 0) + (job.total_sublet_cost ?? 0);
                  const statusColor = (() => {
                    switch (job.status?.toLowerCase()) {
                      case "awaiting approval": return "bg-yellow-100 text-yellow-800";
                      case "approved": return "bg-green-100 text-green-800";
                      case "rejected": return "bg-red-100 text-red-800";
                      case "part assigned": return "bg-purple-100 text-purple-800";
                      case "part ordered": return "bg-orange-100 text-orange-800";
                      case "completed": return "bg-green-100 text-green-800";
                      case "awaiting fleet approval": return "bg-blue-100 text-blue-800";
                      default: return "bg-gray-100 text-gray-800";
                    }
                  })();
                  return (
                    <Card key={job.id} className="border-l-4 border-l-orange-400">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Wrench className="h-5 w-5 text-orange-500" />
                            <CardTitle className="text-base">{job.jobId_workshop}</CardTitle>
                            <Badge className={statusColor}>{job.status}</Badge>
                            <Badge className={job.priority === 'emergency' ? 'bg-red-500 text-white' : job.priority === 'high' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-800'}>
                              {job.priority}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">{new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><p className="text-gray-500">Vehicle</p><p className="font-medium">{job.registration_no || "N/A"}</p></div>
                          <div><p className="text-gray-500">Type</p><p className="font-medium capitalize">{job.job_type}</p></div>
                          <div><p className="text-gray-500">Driver</p><p className="font-medium">{job.client_name || "N/A"}</p></div>
                          <div>
                            <p className="text-gray-500">Total Cost</p>
                            <p className="font-medium text-green-700">{totalCost > 0 ? `R ${totalCost.toFixed(2)}` : "Pending"}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{job.description}</p>
                        {totalCost > 0 && (
                          <div className="grid grid-cols-3 gap-3 text-sm bg-blue-50 p-3 rounded">
                            <div><p className="text-gray-500">Labour</p><p className="font-medium">R {(job.total_labor_cost ?? 0).toFixed(2)}</p></div>
                            <div><p className="text-gray-500">Parts</p><p className="font-medium">R {(job.total_parts_cost ?? 0).toFixed(2)}</p></div>
                            <div><p className="text-gray-500">Sublets</p><p className="font-medium">R {(job.total_sublet_cost ?? 0).toFixed(2)}</p></div>
                          </div>
                        )}
                      </CardContent>
                      <CardContent className="pt-0 flex justify-end gap-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setWorkshopJobWorkflow(job); setIsWorkflowOpen(true); }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Workflow
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Stock Levels Tab — read-only view from workshop parts table */}
          <TabsContent value="stock-levels" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Workshop Stock Levels</h3>
              <button onClick={fetchStockLevels} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <RefreshCcw className="h-3 w-3" /> Refresh
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-sm text-gray-600">Total Items</p><p className="text-2xl font-bold">{stockParts.length}</p></div>
                <Package className="h-8 w-8 text-blue-600" />
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-sm text-gray-600">Low Stock</p><p className="text-2xl font-bold text-yellow-600">{stockParts.filter(p => parseInt(p.quantity || "0") <= (p.stock_threshold || 5) && parseInt(p.quantity || "0") > 0).length}</p></div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-sm text-gray-600">Out of Stock</p><p className="text-2xl font-bold text-red-600">{stockParts.filter(p => parseInt(p.quantity || "0") === 0).length}</p></div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-sm text-gray-600">Total Value</p><p className="text-2xl font-bold text-green-600">R{stockParts.reduce((s, p) => s + parseInt(p.quantity || "0") * (p.price || 0), 0).toFixed(2)}</p></div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search parts..." value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Stock Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="normal">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {stockLoading ? (
              <p className="text-center text-gray-500 py-8">Loading stock levels...</p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-3 text-sm font-medium">Item Code</th>
                          <th className="text-left p-3 text-sm font-medium">Description</th>
                          <th className="text-left p-3 text-sm font-medium">Category</th>
                          <th className="text-center p-3 text-sm font-medium">Qty / Threshold</th>
                          <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                          <th className="text-right p-3 text-sm font-medium">Total Value</th>
                          <th className="text-center p-3 text-sm font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockParts
                          .filter((part) => {
                            const qty = parseInt(part.quantity || "0");
                            const threshold = part.stock_threshold || 5;
                            const matchSearch = (part.description || "").toLowerCase().includes(stockSearch.toLowerCase()) || (part.item_code || "").toLowerCase().includes(stockSearch.toLowerCase());
                            const matchFilter = stockFilter === "all" || (stockFilter === "out" && qty === 0) || (stockFilter === "low" && qty > 0 && qty <= threshold) || (stockFilter === "normal" && qty > threshold);
                            return matchSearch && matchFilter;
                          })
                          .map((part) => {
                            const qty = parseInt(part.quantity || "0");
                            const threshold = part.stock_threshold || 5;
                            const status = getStockStatus(qty, threshold);
                            return (
                              <tr key={part.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono text-sm">{part.item_code || "N/A"}</td>
                                <td className="p-3 text-sm">{part.description}</td>
                                <td className="p-3"><Badge variant="outline" className="text-xs">{part.categories?.name || "N/A"}</Badge></td>
                                <td className="p-3 text-center"><span className={`font-medium text-sm ${qty <= threshold ? "text-red-600" : ""}`}>{qty}/{threshold}</span></td>
                                <td className="p-3 text-right text-sm">R{(part.price || 0).toFixed(2)}</td>
                                <td className="p-3 text-right text-sm font-medium">R{(qty * (part.price || 0)).toFixed(2)}</td>
                                <td className="p-3 text-center"><Badge className={status.color}>{status.label}</Badge></td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    {stockParts.filter(p => (p.description || "").toLowerCase().includes(stockSearch.toLowerCase())).length === 0 && (
                      <div className="text-center py-8"><Package className="mx-auto h-10 w-10 text-gray-300 mb-2" /><p className="text-gray-500">No items found</p></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <div className="grid gap-4">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <Card
                    key={job.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <CardTitle className="text-lg">
                              {job.job_id} :{" "}
                              {/* {job?.vehiclesc?.registration_number ||
                                "No vehicle allocated"}{" "} */}
                              {job?.vehiclesc?.fleet_number}
                            </CardTitle>
                          </div>
                          <Badge className={getPriorityColor(job.priority)}>
                            {job.priority} : {job.service}
                          </Badge>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          {job.clientType === "external" && (
                            <Badge variant="outline">External</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-500">
                            {/* {new Date(job.created_at).toLocaleDateString()}{" "} */}
                            {/* {new Date(job.created_at).toLocaleTimeString()} */}
                            {getDays(job.created_at)} days ago
                          </span>
                        </div>
                      </div>
                      <CardDescription className="text-base font-medium">
                        {job.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        {job.drivers ? (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Driver Information
                            </h4>
                            <p className="text-sm">
                              <strong>Name:</strong> {job.drivers.first_name}{" "}
                              {job.drivers.surname}
                            </p>
                            <p className="text-sm">
                              <strong>Phone:</strong> {job.drivers.cell_number}
                            </p>
                            {job.clientName && (
                              <p className="text-sm">
                                <strong>Client:</strong> {job.clientName}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Driver Information
                            </h4>
                          </div>
                        )}
                        {job.vehiclesc ? (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Vehicle Details
                            </h4>
                            <p className="text-sm">
                              <strong>Reg:</strong>{" "}
                              {job.vehiclesc.registration_number ||
                                "No vehicle allocated"}
                            </p>
                            <p className="text-sm">
                              <strong>Make:</strong>{" "}
                              {job.vehiclesc.make || "No vehicle allocated"}
                            </p>
                            <p className="text-sm">
                              <strong>Model:</strong>{" "}
                              {job.vehiclesc.model || "No vehicle allocated"}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Vehicle Details
                            </h4>
                          </div>
                        )}

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Location
                          </h4>
                          <p className="text-sm text-gray-600">
                            {job.location}
                          </p>
                          {job.technicians ? (
                            <>
                              <p className="text-sm">
                                <strong>Tech:</strong> {job.technicians?.name}
                              </p>
                              <p className="text-sm">
                                <strong>Phone:</strong> {job.technicians?.phone}
                              </p>
                            </>
                          ) : (
                            job.technician_id && (
                              <p className="text-sm">
                                <strong>Tech ID:</strong> {job.technician_id}
                              </p>
                            )
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            Time
                          </h4>
                          <p className="text-sm">
                            <strong>Arrival Est. Time:</strong>{" "}
                            {job.eta || "TBC"}
                          </p>

                          <p className="text-sm">
                            <strong>Job Created Time: </strong>
                            {new Date(job.created_at).toLocaleDateString()}{" "}
                            {new Date(job.created_at).toLocaleTimeString()}
                          </p>
                          <p className="text-sm">
                            <strong>Time Completed:</strong>{" "}
                            {job.completed_at || "TBC"}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          {job.description}
                        </p>
                      </div>
                      {job.notes && job.notes.length > 0 && (
                        <div className="bg-gray-100 p-3 rounded-md flex items-center gap-2 mb-4">
                          <MessageSquare className="h-5 w-5" />
                          <span>
                            {job.notes.length === 1
                              ? "1 new note available"
                              : `+new notes available`}
                          </span>
                        </div>
                      )}

                      {job.attachments && job.attachments.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <FileImage className="h-4 w-4" />
                            Attachments
                          </h4>
                          <div className="flex gap-2 flex-wrap">
                            {job.attachments.map((attachment, index) => {
                              const { data } = supabase.storage
                                .from("images")
                                .getPublicUrl(attachment);
                              const url = data?.publicUrl;
                              const attachments =
                                job.attachments as unknown as string[];
                              console.log(url);
                              return (
                                <div
                                  key={index}
                                  className="flex flex-col items-center gap-1"
                                >
                                  {url && (
                                    <img
                                      src={url}
                                      alt={`Attachment ${index}`}
                                      className="h-20 w-20 object-cover rounded"
                                    />
                                  )}
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="flex flex-row gap-2 w-fit p-2"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span>View Image</span>
                                    </Button>
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {job.attachments &&
                        Array.isArray(job.attachments) &&
                        job.attachments.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <FileImage className="h-4 w-4" />
                              Result Images
                            </h4>
                            <div className="flex gap-2 flex-wrap">
                              {job.attachments.map((imagePath, index) => (
                                <div
                                  key={index}
                                  className="flex flex-col items-center gap-2"
                                >
                                  {imagePath.startsWith("file:///") ? (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs text-red-500"
                                    >
                                      Local image — not viewable in browser
                                    </Badge>
                                  ) : (
                                    <img
                                      src={imagePath}
                                      alt={`Result ${index}`}
                                      className="h-20 w-20 object-cover rounded border"
                                    />
                                  )}
                                  <a
                                    href={imagePath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="outline" size="icon">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Link href={`/jobsFleet/${job.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                        </div>

                        {/* using created field with number 1 or 0 whereby 0 is job appoved but when 1 rejected */}

                        {job.status === "Approved" && (
                          <div className="flex gap-2">
                            <AllocateSubcontractorDialog
                              jobId={job.id}
                              jobDescription={job.description}
                            />
                            <SendToWorkshopDialog
                              jobId={job.id}
                              jobDescription={job.description}
                              vehicleReg={job.vehiclesc?.registration_number || ''}
                              clientName={job.drivers ? `${job.drivers.first_name} ${job.drivers.surname}` : ''}
                              location={job.location}
                              jobType={job.service}
                              priority={job.priority}
                              onSuccess={getJobs}
                            />
                          </div>
                        )}

                        {(job.status === "assigned" ||
                          job.status === "Assigned" ||
                          job.status === "Approved") && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleChangeDetails(job)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Close Job
                          </Button>
                        )}

                        {job.status === "Breakdown Request" && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                handleCreatedRequired(
                                  job.id,
                                  "Approved",
                                  "Job approved by fleet manager",
                                  0,
                                )
                              }
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() =>
                                handleCreatedRequired(
                                  job.id,
                                  "Cancelled",
                                  "Job rejected by fleet manager",
                                  1,
                                )
                              }
                              size="sm"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {job.status === "awaiting-approval" &&
                          canApproveJobs && (
                            <div className="flex gap-2">
                              <Button
                                onClick={() =>
                                  handleUpdateJobStatus(
                                    job.id,
                                    "approved",
                                    "Job approved by fleet manager",
                                  )
                                }
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  handleUpdateJobStatus(
                                    job.id,
                                    "cancelled",
                                    "Job rejected by fleet manager",
                                  )
                                }
                                size="sm"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="flex justify-center items-center h-full">
                  <p className="text-gray-500">No jobs found</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="kanban" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                "Breakdown Request",
                "completed",
                "inprogress",
                "assigned",
                "Technician accepted",
                "Technician on site",
              ].map((status) => (
                <Card key={status}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium capitalize">
                      {status}
                      <Badge className="ml-2" variant="secondary">
                        {allJobs.filter((job) => job.status === status).length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {allJobs
                      .filter((job) => job.status === status)
                      .map((job) => (
                        <Card
                          key={job.id}
                          className="p-3 hover:shadow-sm transition-shadow"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {job.job_id}
                              </p>
                              <Badge className={getPriorityColor(job.priority)}>
                                {job.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {job.description}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              {job.estimatedCost && (
                                <span>R {job.estimatedCost}</span>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

            <TabsContent value="calendar" className="space-y-4">
              <div className="grid gap-4">
                {rejectedJobs.map((job) => (
                  <Card
                    key={job.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-red-500" />
                            <CardTitle className="text-lg">
                              {job.job_id} : {job?.vehiclesc?.fleet_number}
                            </CardTitle>
                          </div>
                          <Badge className={getPriorityColor(job.priority)}>
                            {job.priority} : {job.service}
                          </Badge>
                          <Badge variant="destructive">Rejected</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-500">
                            {getDays(job.created_at)} days ago
                          </span>
                        </div>
                      </div>
                      <CardDescription className="text-base font-medium">
                        {job.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Driver Information
                          </h4>
                          <p className="text-sm">
                            <strong>Name:</strong> {job.drivers?.first_name}{" "}
                            {job.drivers?.surname}
                          </p>
                          <p className="text-sm">
                            <strong>Phone:</strong> {job.drivers?.cell_number}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Vehicle Details
                          </h4>
                          <p className="text-sm">
                            <strong>Reg:</strong> {" "}
                            {job.vehiclesc?.registration_number || "N/A"}
                          </p>
                          <p className="text-sm">
                            <strong>Make:</strong> {job.vehiclesc?.make || "N/A"}
                          </p>
                          <p className="text-sm">
                            <strong>Model:</strong> {" "}
                            {job.vehiclesc?.model || "N/A"}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Location
                          </h4>
                          <p className="text-sm text-gray-600">
                            {job.location}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Rejection Notes
                          </h4>
                          <p className="text-sm text-gray-600">
                            {job.notes || "No rejection notes provided"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Jobs
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allJobs.length}</div>
                  <p className="text-xs text-muted-foreground">All Jobs</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    In Progress
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {
                      allJobs.filter((job) => job.status === "inprogress")
                        .length
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active jobs being worked on
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completed
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {allJobs.filter((job) => job.status === "completed").length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Successfully completed jobs
                  </p>
                </CardContent>
              </Card>
              {/* <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg. Cost
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R304</div>
                  <p className="text-xs text-muted-foreground">
                    Average job cost
                  </p>
                </CardContent>
              </Card> */}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Job Status Distribution</CardTitle>
                <CardDescription>Overview of all job statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    "Breakdown Request",
                    "completed",
                    "assigned",
                    "Technician on site",
                    "Technician accepted",
                    "inprogress",
                    "awaiting-approval",
                    "approved",
                    "cancelled",
                  ].map((status) => {
                    const count = allJobs.filter(
                      (job) => job.status === status,
                    ).length;
                    const percentage =
                      allJobs.length > 0 ? (count / allJobs.length) * 100 : 0;
                    return (
                      <div
                        key={status}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(status)}>
                            {status}
                          </Badge>
                          <span className="text-sm">{count} jobs</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isModalOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-md">
            <div
              className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <Modal
                request={selectedJob}
                onClose={() => setIsModalOpen(false)}
                onUpdateStatus={(status) =>
                  handleUpdateJobStatus(selectedJob.id, status)
                }
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
