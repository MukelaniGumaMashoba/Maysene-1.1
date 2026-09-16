"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
  ThumbsDown,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { nullable } from "zod";
import { toast } from "sonner";
import JobCardWorkflow from "@/components/ui-personal/job-card-workflow";
import RequestedParts from "@/components/RequestedParts";
import CancelledJobs from "@/components/workshop/CancelledJobs";
import CompletedJobsReport from "@/components/workshop/CompletedJobsReport";
import CreateJobCardDialog from "@/components/workshop/CreateJobCardDialog";
import JobCardPrinter from "@/components/ui-personal/job-card-printer";
import FleetJobsForAdmin from "@/components/workshop/FleetJobsForAdmin";
import { useCurrentTechnician } from "@/hooks/useCurrentTechnician";

function UnavailableDropdown({ vehicleId, onSuccess }: { vehicleId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const supabase = createClient() as any;
  const reasons = ['Repairs', 'Servicing', 'Breakdown'];

  const handleSelect = async (reason: string) => {
    const { error } = await supabase
      .from('vehiclesc')
      .update({ vehicle_available: false, vehicle_not_available_reason: reason })
      .eq('id', vehicleId);
    if (!error) {
      setOpen(false);
      onSuccess();
    }
  };

  return (
    <div className="relative inline-block text-left">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
        onClick={() => setOpen(!open)}
      >
        Make Unavailable
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {reasons.map((reason) => (
              <button
                key={reason}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => handleSelect(reason)}
              >
                {reason}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
    first_name: string | null;
    surname: string | null;
    cell_number: string | null;
    job_allocated: boolean;
  }[];
  vehiclesc: {
    registration_number: string | null;
    make: string | null;
    model: string | null;
  }[];
  location: string;
  coordinates: { lat: number; lng: number };
  technician_id: number | null;
  technicians: {
    name: string;
    phone: string;
  } | null;
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
  technician: boolean;
}

// Form interface for creating new workshop jobs
interface CreateWorkshopJobForm {
  registration_number: string;
  job_type: string;
  description: string;
  estimated_cost?: number;
  client_name?: string;
  client_phone?: string;
  location?: string;
  notes?: string;
  selected_workshop_id?: string;
  due_date?: string;
  priority: "low" | "medium" | "high" | "emergency";
}
interface WorkshopJob {
  id: number;
  registration_no: string;
  job_type: string;
  description: string;
  estimated_cost?: number;
  client_name: string;
  client_phone: string;
  location: string;
  notes: string;
  selected_workshop_id: string;
  created_at: Date;
  jobId_workshop: string;
  status: string;
  workflow_status?: string;
  technician?: boolean;
  priority: "A" | "B" | "B#";
  completed_at?: Date;
  due_date?: string;
  total_labor_cost?: number;
  total_parts_cost?: number;
  total_sublet_cost?: number;
  edited_after_approval?: boolean;
  requires_reapproval?: boolean;
  edit_count?: number;
  last_edited_by_name?: string;
  last_edited_date?: string;
}

export default function FleetJobsPage() {
  const { technician: currentTechnician, loading: techLoading } = useCurrentTechnician();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<WorkshopJob[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const supabase = createClient() as any;
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [isWorkshopDialogOpen, setIsWorkshopDialogOpen] = useState(false);
  const [selectedJobForWorkshop, setSelectedJobForWorkshop] =
    useState<Job | null>(null);
  const [searchWorkshop, setSearchWorkshop] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [partName, setPartName] = useState("");
  const [parts, setParts] = useState([]);
  const [selectedJobForWorkflow, setSelectedJobForWorkflow] =
    useState<WorkshopJob | null>(null);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);

  // Form state for creating new workshop jobs
  const [isCreateJobDialogOpen, setIsCreateJobDialogOpen] = useState(false);
  const [createJobForm, setCreateJobForm] = useState<CreateWorkshopJobForm>({
    registration_number: "",
    job_type: "",
    description: "",
    estimated_cost: undefined,
    client_name: "",
    client_phone: "",
    location: "",
    notes: "",
    selected_workshop_id: "",
    due_date: "",
    priority: "medium",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleExists, setVehicleExists] = useState<boolean | null>(null);
  const [workshopJob, setWorkshopsJob] = useState<WorkshopJob[]>([]);

  const fetchWorkshops = async () => {
    const { data, error } = await supabase.from("workshop").select(`
      *,
      workshop_assign (
        workshop_id,
        created_at
      )
    `);
    if (error) {
      console.error("Error fetching workshops:", error);
    } else {
      // Map the database response to match your schema
      const mappedWorkshops = data.map((workshop: any) => ({
        id: workshop.id,
        work_name: workshop.work_name,
        trading_name: workshop.trading_name,
        city: workshop.city,
        town: workshop.town,
        province: workshop.province,
        street: workshop.street,
        labour_rate: workshop.labour_rate,
        fleet_rate: workshop.fleet_rate,
        created_at: workshop.created_at,
      }));
      setWorkshops(mappedWorkshops);
    }
  };

  const formatStatusDisplay = (status: string) => {
    // Map workflow_status values to human-readable labels
    const statusLabels: Record<string, string> = {
      "awaiting_assignment": "Awaiting Assignment",
      "mechanic_assigned": "Mechanic Assigned",
      "subcontractor_assigned": "Subcontractor Assigned",
      "mechanic_accepted": "Mechanic Accepted",
      "job_in_progress": "Job In Progress",
      "parts_outstanding": "Parts Outstanding",
      "parts_received": "Parts Received",
      "returned_to_office": "Returned to Office",
      "job_completed": "Job Completed",
      "quality_check_done": "Quality Check Done",
      "job_cancelled": "Job Cancelled",
    };
    
    if (statusLabels[status]) {
      return statusLabels[status];
    }
    
    return (
      status
        ?.split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ") || "Unknown"
    );
  };

  // Check if vehicle exists by registration number
  const checkVehicleExists = async (registrationNumber: string) => {
    if (!registrationNumber) {
      setVehicleExists(null);
      return null;
    }

    try {
      const vehicle = await getVehicleByRegistrationNumber(registrationNumber);
      setVehicleExists(!!vehicle);
      return vehicle;
    } catch (error) {
      console.error("Error checking vehicle:", error);
      setVehicleExists(false);
      return null;
    }
  };

  useEffect(() => {
    fetchWorkshops();

    const fetchFleetVehicles = async () => {
      const { data, error } = await supabase
        .from('vehiclesc')
        .select('id, registration_number, fleet_number, vehicle_available, vehicle_not_available_reason')
        .order('registration_number', { ascending: true });
      if (!error && data) setFleetVehicles(data);
    };
    fetchFleetVehicles();

    // Check vehicle when registration number changes
    if (createJobForm.registration_number) {
      checkVehicleExists(createJobForm.registration_number);
    } else {
      setVehicleExists(null);
    }

    const assignements = supabase
      .channel("workshop-job-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workshop_job" },
        (payload: any) => {
          console.log("Change received!", payload);
        }
      )
      .subscribe();

    const jobAssignments = supabase
      .channel("workshop-job-assignments-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workshop_job" },
        (payload: any) => {
          console.log("Change received!", payload);
        }
      )
      .subscribe();
    // Get user role from cookie (set during login)
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };
    const role = decodeURIComponent(getCookie("role") || "");
    setUserRole(role || "call-center");

    // const getJobs = async () => {
    //   const { data: jobs, error } = await supabase
    //     .from('job_assignments')
    //     .select(`*, vehiclesc(*)`)
    //     .neq('status', 'completed')
    //     .neq('status', 'cancelled')
    //     .order('created_at', { ascending: false });
    //   if (error) {
    //     console.error(error)
    //   } else {
    //     setJobs(jobs as unknown as Job[])
    //     console.log(jobs)
    //   }
    // }
    // getJobs()
    // setFilteredJobs(jobs)

    return () => {
      assignements.unsubscribe();
      jobAssignments.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const getWorkshopJob = async () => {
      const { data: WorkJ, error: workError } = await supabase
        .from("workshop_job")
        .select("*")
        .order("created_at", { ascending: false });

      if (!workError && WorkJ) {
        // move completed jobs to the end while preserving the relative order
        const isCompleted = (j: any) =>
          String(j.status || "").toLowerCase() === "completed";
        const notCompleted = (WorkJ || []).filter((j: any) => !isCompleted(j));
        const completed = (WorkJ || []).filter((j: any) => isCompleted(j));
        setWorkshopsJob([
          ...notCompleted,
          ...completed,
        ] as unknown as WorkshopJob[]);

        // Check which jobs have parts assigned
        const jobIds = WorkJ.map((j: any) => j.id);
        if (jobIds.length > 0) {
          const { data: partsData } = await supabase
            .from("workshop_jobpart")
            .select("job_id, given_parts")
            .in("job_id", jobIds);

          if (partsData) {
            const jobsWithAssignedParts = new Set<number>();
            partsData.forEach((part: any) => {
              if (
                part.given_parts &&
                Array.isArray(part.given_parts) &&
                part.given_parts.length > 0
              ) {
                jobsWithAssignedParts.add(part.job_id);
              }
            });
            setJobsWithParts(jobsWithAssignedParts);
          }
        }
      } else {
        console.error("Error fetching workshop jobs:", workError);
      }
    };
    getWorkshopJob();
  }, []);

  useEffect(() => {
    // Use workshopJob (fetched from workshop_job table) as the source
    let filtered = workshopJob || [];

    // Filter out completed and rejected jobs from "all jobs" tab
    filtered = filtered.filter(
      (job) => 
        (job.status || "").toLowerCase() !== "completed" &&
        (job.status || "").toLowerCase() !== "rejected"
    );

    // OWNERSHIP FILTER: Mechanics only see their assigned jobs
    if (userRole === "mechanic" && currentTechnician) {
      filtered = filtered.filter(
        (job) => (job as any).technician_name === currentTechnician.name
      );
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((job) => {
        // check commonly available fields on workshop_job rows
        if (
          (job.jobId_workshop || "")
            .toString()
            .toLowerCase()
            .includes(searchLower)
        )
          return true;
        if ((job.description || "").toLowerCase().includes(searchLower))
          return true;
        if ((job.registration_no || "").toLowerCase().includes(searchLower))
          return true;
        if ((job.client_name || "").toLowerCase().includes(searchLower))
          return true;
        if ((job.client_phone || "").toLowerCase().includes(searchLower))
          return true;
        return false;
      });
    }

    // Apply status filter. Special-case "requires-technician" (not a status column)
    if (statusFilter === "requires-reapproval") {
      filtered = filtered.filter(
        (job) => (job as any).requires_reapproval || (job as any).edited_after_approval
      );
    } else if (statusFilter === "requires-technician") {
      // Any job where technician !== true needs a technician (covers false/null/undefined)
      filtered = filtered.filter((job) => (job as any).technician !== true);
    } else if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(
        (job) => ((job as any).workflow_status || (job.status || "")).toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // workshop_job may or may not have a priority field; check defensively
    if (priorityFilter !== "all") {
      filtered = filtered.filter(
        (job) => ((job as any).priority || "").toString() === priorityFilter
      );
    }

    // Sort by created date (newest first)
    filtered.sort(
      (a, b) =>
        new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime()
    );

    // cast to the component's expected filteredJobs shape
    setFilteredJobs(filtered as unknown as WorkshopJob[]);
  }, [workshopJob, searchTerm, statusFilter, priorityFilter, userRole, currentTechnician]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "awaiting_assignment":
      case "awaiting approval":
        return "bg-yellow-100 text-yellow-800";
      case "mechanic_assigned":
      case "subcontractor_assigned":
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "mechanic_accepted":
        return "bg-indigo-100 text-indigo-800";
      case "job_in_progress":
      case "in progress":
        return "bg-orange-100 text-orange-800";
      case "parts_outstanding":
        return "bg-amber-100 text-amber-800";
      case "parts_received":
        return "bg-teal-100 text-teal-800";
      case "returned_to_office":
        return "bg-gray-100 text-gray-800";
      case "job_completed":
      case "completed":
        return "bg-green-100 text-green-800";
      case "quality_check_done":
        return "bg-emerald-100 text-emerald-800";
      case "job_cancelled":
      case "cancelled":
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "A":
        return "bg-red-500 text-white";
      case "B":
        return "bg-orange-500 text-white";
      case "B#":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const changeJobs = (workshopJob || [])
    .filter(
      (job) =>
        ((job as any).requires_reapproval || (job as any).edited_after_approval) &&
        (job.status || "").toLowerCase() !== "completed" &&
        (job.status || "").toLowerCase() !== "rejected"
    )
    .sort(
      (a, b) =>
        new Date((b as any).created_at).getTime() -
        new Date((a as any).created_at).getTime()
    );

  // Update job status
  const handleUpdateJobStatus = async (
    jobId: number,
    status: string,
    notes?: string
  ) => {
    try {
      const { error } = await supabase
        .from("workshop_job")
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
    } catch (error) {
      console.error("Error updating job status:", error);
    }
  };

  async function getVehicleByRegistrationNumber(registrationNumber: string) {
    if (!registrationNumber) {
      console.error("Registration number is required");
      return null;
    }
    const { data, error } = await supabase
      .from("vehiclesc")
      .select()
      .eq("registration_number", registrationNumber)
      .single();

    if (error) {
      console.error("Error fetching vehicle by registration number:", error);
      return null;
    }
    return data;
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    };
    return (
      <Badge className={colors[priority as keyof typeof colors]}>
        {priority}
      </Badge>
    );
  };

  // Create new workshop job and assign to workshop
  const createWorkshopJob = async () => {
    if (
      !createJobForm.registration_number ||
      !createJobForm.job_type ||
      !createJobForm.description
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!createJobForm.selected_workshop_id) {
      toast.error("Please select a workshop");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if vehicle exists and get vehicle data
      const vehicleData = await checkVehicleExists(
        createJobForm.registration_number
      );

      if (!vehicleData) {
        toast.error(
          "Vehicle not found in database. Please enter a valid registration number."
        );
        return;
      }

      // Workshop-2025-034
      const year = new Date()
        .setFullYear(new Date().getFullYear() + 1)
        .toString()
        .slice(0, 4);
      const job_id =
        "Workshop-" +
        year +
        "-" +
        Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");
      console.log("Generated workshop ID:", job_id);
      // First, create the job in workshop_job table
      const { data: newJob, error: jobError } = await (supabase as any)
        .from("workshop_job")
        .insert({
          registration_no: createJobForm.registration_number,
          job_type: createJobForm.job_type,
          description: createJobForm.description,
          jobId_workshop: job_id,
          notes: createJobForm.notes,
          location: createJobForm.location,
          client_name: createJobForm.client_name,
          client_phone: createJobForm.client_phone,
          status: "Awaiting Approval",
          due_date: createJobForm.due_date,
          priority: createJobForm.priority || "medium",
        })
        .select()
        .single();

      if (jobError) {
        console.error("Job creation failed:", jobError);
        toast.error("Failed to create job");
        return;
      }

      // Then assign the job to the selected workshop
      const { error: assignError } = await (supabase as any)
        .from("workshop_assign")
        .insert({
          job_id: newJob.id,
          workshop_id: createJobForm.selected_workshop_id,
        });

      if (assignError) {
        console.error("Assignment failed:", assignError);
        toast.error("Failed to assign job to workshop");
        return;
      }
      // Update lastAssigned so that workshop moves to last in sorting
      setLastAssigned((prev) => ({
        ...prev,
        [String(createJobForm.selected_workshop_id)]: Date.now(),
      }));
      // Get selected workshop name for success message
      const selectedWorkshop = workshops.find(
        (w) => String(w.id) === String(createJobForm.selected_workshop_id)
      );
      const workshopName = selectedWorkshop?.work_name || "Unknown Workshop";

      toast.success(
        `Job created successfully! Vehicle: ${vehicleData.make} ${vehicleData.model} (${createJobForm.registration_number}) assigned to ${workshopName}`
      );
      setIsCreateJobDialogOpen(false);

      // Reset form
      setCreateJobForm({
        registration_number: "",
        job_type: "",
        description: "",
        client_name: "",
        client_phone: "",
        selected_workshop_id: "",
        due_date: "",
        priority: "medium",
      });

      // Empty jobs after creating a new one
      setWorkshopsJob([]);
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("An error occurred while creating the job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleView = (job: WorkshopJob) => {
    alert(
      `Viewing details for job:\n\n` +
      `Job Type: ${job.job_type}\n` +
      `Vehicle Reg: ${job.registration_no}\n` +
      `Description: ${job.description}`
    );
  };

  const handleDelete = async (job: WorkshopJob) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete job for vehicle ${job.registration_no}?`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("workshop_job").delete();
      // .eq('id', job?.id); // Make sure your `WorkshopJob` type includes `id`

      if (error) {
        throw error;
      }

      alert("Job deleted successfully.");

      // Optionally refetch the jobs to update the UI:
      const { data, error: fetchError } = await supabase
        .from("workshop_job")
        .select("*");

      if (!fetchError && data) {
        setWorkshopsJob(data as unknown as WorkshopJob[]);
      } else {
        console.error("Error refetching jobs:", fetchError);
      }
    } catch (err: any) {
      alert(`Failed to delete job: ${err.message}`);
    }
  };

  const handleEdit = (job: WorkshopJob) => {
    alert(`Editing job for vehicle: ${job.registration_no}`);
    // TODO: Replace with modal or navigate to edit page
  };

  const extractLocationKeywords = (input: string): string[] => {
    return input
      .toLowerCase()
      .split(/[\s,]+/) // split by spaces or commas
      .filter(Boolean); // remove empty strings
  };

  const [lastAssigned, setLastAssigned] = useState<{ [key: string]: number }>(
    {}
  );
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [selectedJobForPrint, setSelectedJobForPrint] = useState<WorkshopJob | null>(null);
  const [jobsWithParts, setJobsWithParts] = useState<Set<number>>(new Set());
  const [fleetVehicles, setFleetVehicles] = useState<any[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const normalizedSearch = searchWorkshop?.toLowerCase() || "";

  const availableWorkshops = useMemo(() => {
    return workshops
      .filter((w) => {
        const city = w.city?.toLowerCase() || "";
        const town = w.town?.toLowerCase() || "";
        const province = w.province?.toLowerCase() || "";
        return (
          normalizedSearch.includes(city) ||
          normalizedSearch.includes(town) ||
          normalizedSearch.includes(province)
        );
      })
      .sort((a, b) => {
        const aLast = lastAssigned[a.id] || 0;
        const bLast = lastAssigned[b.id] || 0;

        if (aLast === 0 && bLast !== 0) return -1;
        if (aLast !== 0 && bLast === 0) return 1;

        return aLast - bLast;
      });
  }, [workshops, normalizedSearch, lastAssigned]);

  useEffect(() => {
    if (availableWorkshops.length === 0) return;

    // Find first workshop without recent job assigned
    const noRecentJobWorkshop = availableWorkshops.find(
      (w) => !lastAssigned[w.id]
    );

    if (noRecentJobWorkshop) {
      setCreateJobForm((prev) => ({
        ...prev,
        selected_workshop_id: noRecentJobWorkshop.id,
      }));
    } else {
      // All have recent jobs, select the one with the oldest lastAssigned timestamp
      const sortedByOldest = [...availableWorkshops].sort((a, b) => {
        const aLast = lastAssigned[a.id] || 0;
        const bLast = lastAssigned[b.id] || 0;
        return aLast - bLast;
      });
      setCreateJobForm((prev) => ({
        ...prev,
        selected_workshop_id: sortedByOldest[0].id,
      }));
    }
  }, [availableWorkshops, lastAssigned]);

  return (
    // <div className="flex-1 space-y-4 p-4 pt-6 bg-amber-500">
    <div className="flex-1 space-y-4 p-2 sm:p-4 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">All Jobs</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="awaiting_assignment">Awaiting Assignment</SelectItem>
              <SelectItem value="mechanic_assigned">Mechanic Assigned</SelectItem>
              <SelectItem value="subcontractor_assigned">Subcontractor Assigned</SelectItem>
              <SelectItem value="mechanic_accepted">Mechanic Accepted</SelectItem>
              <SelectItem value="job_in_progress">Job In Progress</SelectItem>
              <SelectItem value="parts_outstanding">Parts Outstanding</SelectItem>
              <SelectItem value="parts_received">Parts Received</SelectItem>
              <SelectItem value="returned_to_office">Returned to Office</SelectItem>
              <SelectItem value="job_completed">Job Completed</SelectItem>
              <SelectItem value="quality_check_done">Quality Check Done</SelectItem>
              <SelectItem value="job_cancelled">Job Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="workshopJobs" className="space-y-6">
        <div className="overflow-x-auto -mx-2 px-2">
          <TabsList className="bg-white shadow rounded-lg border flex flex-wrap gap-1 p-1 w-full">
            {(userRole === "mechanic" || userRole === "senior-mechanic" || userRole === "technician"
              ? ["workshopJobs"]
              : ["workshopJobs", "fleetJobs", "vehicles", "changes", "kanban", "efficiency", "cancelled", "completed"]
            ).map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md text-xs px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap"
              >
              {tab === "workshopJobs"
                ? "Workshop Jobs"
                : tab === "fleetJobs"
                  ? "Fleet Jobs"
                : tab === "vehicles"
                  ? "Vehicles"
                : tab === "changes"
                  ? "Changes"
                : tab === "kanban"
                  ? "Kanban"
                  : tab === "efficiency"
                    ? "Efficiency"
                    : tab === "cancelled"
                      ? "Cancelled"
                      : "Completed"}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent
          value="workshopJobs"
          className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-gray-50 min-h-screen"
        >
          <div className="flex flex-col space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-gray-300 pb-3">
              <h2 className="text-2xl font-semibold text-gray-800">
                Workshop Jobs
              </h2>
              <div className="flex items-center gap-2">
                <CreateJobCardDialog onSuccess={() => {
                  // Refresh jobs list
                  supabase.from("workshop_job").select("*").order("created_at", { ascending: false }).then(({ data }: { data: any }) => {
                    if (data) setWorkshopsJob(data as unknown as WorkshopJob[]);
                  });
                }} />
                <FileText className="h-5 w-5 text-gray-500" />
              </div>
            </div>

            {/* Jobs List */}
            {filteredJobs.length === 0 ? (
              <p className="text-center text-gray-500 mt-6">
                No workshop jobs found.
              </p>
            ) : (
              <div className="grid gap-4">
                {filteredJobs.map((job) => (
                  <Card
                    key={job.id || job.jobId_workshop}
                    className="hover:shadow-md transition-shadow rounded-lg border border-gray-200 p-3 sm:p-6 bg-white"
                  >
                    <CardHeader className="pb-3 flex justify-between items-start sm:items-center gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
                        <CardTitle className="text-base sm:text-lg">
                          {job.jobId_workshop}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={getStatusColor((job as any).workflow_status || job.status)}>
                            {formatStatusDisplay((job as any).workflow_status || job.status)}
                            {(job as any).workflow_status === "awaiting_assignment" && (
                              <AlertCircle className="h-4 w-4 text-red-500 animate-ping" />
                            )}
                            {(job as any).workflow_status === "job_completed" && (
                              <>
                                <span className="sr-only">Job Completed</span>
                                <CheckCircle className="h-4 w-4 text-green-500 animate-none" />
                              </>
                            )}
                          </Badge>
                          <Badge className={getPriorityColor(job.priority)}>
                            {job.priority}
                          </Badge>
                          {(job as any).requires_reapproval && (
                            <Badge className="bg-orange-100 text-orange-800">
                              Needs Re-Approval
                            </Badge>
                          )}
                          {!(job as any).requires_reapproval && (job as any).edited_after_approval && (
                            <Badge className="bg-blue-100 text-blue-800">
                              Edited{(job as any).edit_count ? ` (${(job as any).edit_count})` : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                        <div>
                          <p>
                            <strong>Vehicle Reg:</strong>{" "}
                            {job.registration_no || "N/A"}
                          </p>
                          <p className="truncate">
                            <strong>Description:</strong>{" "}
                            {job.description || "No description"}
                          </p>
                          <p>
                            <strong>Cost:</strong>{" "}
                            {(job.total_labor_cost ?? 0) +
                              (job.total_parts_cost ?? 0) >
                              0
                              ? `R ${(
                                (job.total_labor_cost ?? 0) +
                                (job.total_parts_cost ?? 0)
                              ).toFixed(2)}`
                              : "Pending"}
                          </p>
                        </div>
                        <div>
                          <p>
                            <strong>Driver Name:</strong>{" "}
                            {job.client_name || "N/A"}
                          </p>
                          <p>
                            <strong>Driver Phone:</strong>{" "}
                            {job.client_phone || "N/A"}
                          </p>
                          <p>
                            <strong>Technician:</strong>{" "}
                            {(job as any).technician_name || "Not Assigned"}
                          </p>
                          <p className="truncate">
                            <strong>Location:</strong>{" "}
                            {job.location || "Unknown"}
                          </p>
                          <p className="truncate">
                            <strong>Notes:</strong> {job.notes || "-"}
                          </p>
                        </div>

                        <div>
                          <p>
                            <strong>Created At:</strong>{" "}
                            {new Date(job.created_at).toLocaleDateString()}
                          </p>
                          <p>
                            <span className="text-sm text-gray-600">
                              Due Date:{" "}
                            </span>
                            <span className="font-medium">
                              {job.due_date
                                ? new Date(job.due_date).toLocaleDateString()
                                : "NOT SET"}
                            </span>
                          </p>

                          {job.completed_at ? (
                            <div>
                              <p className="text-sm text-gray-600 mt-2">
                                Completed
                              </p>

                              <p className="font-medium">
                                {new Date(
                                  job.completed_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          ) : null}
                        </div>

                        {!job.technician_name && !job.assigned_mechanic_id && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
                            <p className="text-sm font-medium text-red-700">
                              Technician needs to be assigned to this job
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Requested Parts Section */}
                      <RequestedParts jobId={job.id} />
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                      {/* Accept/Reject buttons for assigned jobs */}
                      {((job as any).workflow_status === "mechanic_assigned" || (job as any).workflow_status === "subcontractor_assigned") && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("workshop_job")
                                .update({
                                  workflow_status: "mechanic_accepted",
                                  accepted_at: new Date().toISOString(),
                                })
                                .eq("id", job.id);
                              if (error) {
                                toast.error("Failed to accept job");
                              } else {
                                toast.success(`Job ${job.jobId_workshop} accepted`);
                                const { data: WorkJ } = await supabase.from("workshop_job").select("*").order("created_at", { ascending: false });
                                if (WorkJ) setWorkshopsJob(WorkJ as unknown as WorkshopJob[]);
                              }
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full sm:w-auto"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("workshop_job")
                                .update({
                                  workflow_status: "returned_to_office",
                                  assigned_mechanic_id: null,
                                  technician_name: null,
                                })
                                .eq("id", job.id);
                              if (error) {
                                toast.error("Failed to reject job");
                              } else {
                                toast.success(`Job ${job.jobId_workshop} rejected and returned to office`);
                                const { data: WorkJ } = await supabase.from("workshop_job").select("*").order("created_at", { ascending: false });
                                if (WorkJ) setWorkshopsJob(WorkJ as unknown as WorkshopJob[]);
                              }
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {/* View Details - only show after job is accepted */}
                      {["mechanic_accepted", "job_in_progress", "parts_outstanding", "parts_received", "returned_to_office", "job_completed", "quality_check_done"].includes((job as any).workflow_status) && (
                        <Link href={`/workshop/jobWorkShop/${job.id}`} className="w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="fleetJobs" className="space-y-6 p-6 bg-gray-50 min-h-screen">
          <FleetJobsForAdmin supabase={supabase} onJobUpdated={() => {
            supabase.from("workshop_job").select("*").order("created_at", { ascending: false }).then(({ data }: { data: any }) => {
              if (data) setWorkshopsJob(data as unknown as WorkshopJob[]);
            });
          }} />
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-6 p-6 bg-gray-50 min-h-screen">
          <div className="flex items-center justify-between border-b border-gray-300 pb-3">
            <h2 className="text-2xl font-semibold text-gray-800">Fleet Vehicles</h2>
            <Truck className="h-5 w-5 text-gray-500" />
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by registration or fleet number..."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Registration</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fleet Number</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {fleetVehicles
                  .filter((v) => {
                    if (!vehicleSearch) return true;
                    const q = vehicleSearch.toLowerCase();
                    return (
                      (v.registration_number || '').toLowerCase().includes(q) ||
                      (v.fleet_number || '').toLowerCase().includes(q)
                    );
                  })
                  .map((vehicle) => (
                    <tr key={vehicle.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{vehicle.registration_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{vehicle.fleet_number || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          vehicle.vehicle_available !== false
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {vehicle.vehicle_available !== false ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {vehicle.vehicle_available === false && vehicle.vehicle_not_available_reason && vehicle.vehicle_not_available_reason !== '--'
                          ? vehicle.vehicle_not_available_reason
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {vehicle.vehicle_available !== false ? (
                          <UnavailableDropdown
                            vehicleId={vehicle.id}
                            onSuccess={async () => {
                              const { data } = await supabase
                                .from('vehiclesc')
                                .select('id, registration_number, fleet_number, vehicle_available, vehicle_not_available_reason')
                                .order('registration_number', { ascending: true });
                              if (data) setFleetVehicles(data);
                            }}
                          />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('vehiclesc')
                                .update({ vehicle_available: true, vehicle_not_available_reason: '--' })
                                .eq('id', vehicle.id);
                              if (!error) {
                                setFleetVehicles((prev) =>
                                  prev.map((v) =>
                                    v.id === vehicle.id
                                      ? { ...v, vehicle_available: true, vehicle_not_available_reason: '--' }
                                      : v
                                  )
                                );
                              }
                            }}
                          >
                            Make Available
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                {fleetVehicles.filter((v) => {
                  if (!vehicleSearch) return true;
                  const q = vehicleSearch.toLowerCase();
                  return (
                    (v.registration_number || '').toLowerCase().includes(q) ||
                    (v.fleet_number || '').toLowerCase().includes(q)
                  );
                }).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No vehicles found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="changes" className="space-y-6 p-6 bg-gray-50 min-h-screen">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-gray-300 pb-3">
              <h2 className="text-2xl font-semibold text-gray-800">
                Changed Job Cards
              </h2>
              <FileText className="h-5 w-5 text-gray-500" />
            </div>

            {changeJobs.length === 0 ? (
              <p className="text-center text-gray-500 mt-6">
                No changed job cards found.
              </p>
            ) : (
              <div className="grid gap-4">
                {changeJobs.map((job) => (
                  <Card
                    key={job.id || job.jobId_workshop}
                    className="hover:shadow-md transition-shadow rounded-lg border border-gray-200 p-6 bg-white"
                  >
                    <CardHeader className="pb-3 flex justify-between items-center">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <CardTitle className="text-lg">
                          {job.jobId_workshop}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(job.status)}>
                            {formatStatusDisplay(job.status)}
                          </Badge>
                          {(job as any).requires_reapproval && (
                            <Badge className="bg-orange-100 text-orange-800">
                              Needs Re-Approval
                            </Badge>
                          )}
                          {!(job as any).requires_reapproval && (job as any).edited_after_approval && (
                            <Badge className="bg-blue-100 text-blue-800">
                              Edited{(job as any).edit_count ? ` (${(job as any).edit_count})` : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {(job as any).last_edited_date
                          ? `Last edit: ${new Date((job as any).last_edited_date).toLocaleDateString()}`
                          : ""}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-gray-700">
                      <p>
                        <strong>Vehicle Reg:</strong> {job.registration_no || "N/A"}
                      </p>
                      <p className="truncate">
                        <strong>Description:</strong> {job.description || "No description"}
                      </p>
                      <p>
                        <strong>Last Edited By:</strong> {(job as any).last_edited_by_name || "Unknown"}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <Link href={`/workshop/jobWorkShop/${job.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="kanban" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              "awaiting_assignment",
              "mechanic_assigned",
              "subcontractor_assigned",
              "mechanic_accepted",
              "job_in_progress",
              "parts_outstanding",
              "parts_received",
              "returned_to_office",
              "job_completed",
              "quality_check_done",
            ].map((status) => (
              <Card key={status}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {status.replace(/_/g, " ")}
                    <Badge className="ml-2" variant="secondary">
                      {
                        workshopJob
                          .filter((job) => {
                            // Apply ownership filter for mechanics
                          if (userRole === "mechanic" && currentTechnician) {
                            return job.workflow_status === status && 
                                   (job as any).technician_name === currentTechnician.name;
                            }
                            return job.workflow_status === status;
                          })
                          .length
                      }
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {workshopJob
                    .filter((job) => {
                      // Apply ownership filter for mechanics
                       if (userRole === "mechanic" && currentTechnician) {
                        return job.workflow_status === status && 
                               (job as any).technician_name === currentTechnician.name;
                      }
                      return job.workflow_status === status;
                    })
                    .map((job) => (
                      <Link key={job.id} href={`/workshop/jobWorkShop/${job.id}`}>
                        <Card className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {job.jobId_workshop}
                              </p>
                              <div className="flex items-center gap-1">
                                <Badge className={getPriorityColor(job.priority)}>
                                  {job.priority}
                                </Badge>
                                <Badge className={getStatusColor((job as any).workflow_status || job.status)}>
                                  {formatStatusDisplay((job as any).workflow_status || job.status)}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600">
                              {job.registration_no}
                            </p>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {job.description}
                            </p>
                            {(job as any).technician_name && (
                              <p className="text-xs text-blue-600">
                                Tech: {(job as any).technician_name}
                              </p>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Efficiency Overview</CardTitle>
              <CardDescription>
                Number of jobs and percentage by status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { status: "awaiting_assignment", label: "Awaiting Assignment" },
                  { status: "mechanic_assigned", label: "Mechanic Assigned" },
                  { status: "subcontractor_assigned", label: "Subcontractor Assigned" },
                  { status: "mechanic_accepted", label: "Mechanic Accepted" },
                  { status: "job_in_progress", label: "Job In Progress" },
                  { status: "parts_outstanding", label: "Parts Outstanding" },
                  { status: "parts_received", label: "Parts Received" },
                  { status: "returned_to_office", label: "Returned to Office" },
                  { status: "job_completed", label: "Job Completed" },
                  { status: "quality_check_done", label: "Quality Check Done" },
                  { status: "job_cancelled", label: "Cancelled Jobs" },
                ].map(({ status, label }) => {
                  const count = workshopJob.filter(
                    (job) => job.workflow_status === status
                  ).length;
                  const percentage =
                    workshopJob.length > 0
                      ? (count / workshopJob.length) * 100
                      : 0;
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(status)}>
                          {label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold w-16 text-right">{count} jobs</span>
                        <div className="w-32 bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600 w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Jobs</span>
                  <span className="text-lg font-bold">{workshopJob.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          <CancelledJobs />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <CompletedJobsReport />
        </TabsContent>

        <Dialog
          open={isWorkshopDialogOpen}
          onOpenChange={setIsWorkshopDialogOpen}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Assign Workshop to Job: {selectedJobForWorkshop?.job_id}
              </DialogTitle>
              <DialogDescription>
                Search and select a workshop based on location, type, or
                capability.
              </DialogDescription>
            </DialogHeader>

            <div className="mb-3">
              <Input
                placeholder="Search by name, location, type, capability..."
                value={searchWorkshop}
                onChange={(e) => setSearchWorkshop(e.target.value)}
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {workshops
                .filter(
                  (w) =>
                    w.name
                      ?.toLowerCase()
                      .includes(searchWorkshop.toLowerCase()) ||
                    w.type
                      ?.toLowerCase()
                      .includes(searchWorkshop.toLowerCase()) ||
                    w.location
                      ?.toLowerCase()
                      .includes(searchWorkshop.toLowerCase()) ||
                    w.capabilities
                      ?.toLowerCase()
                      .includes(searchWorkshop.toLowerCase())
                )
                .map((workshop) => (
                  <div
                    key={workshop.id}
                    className="p-3 border rounded hover:bg-gray-100 flex justify-between items-start"
                  >
                    <div>
                      <p className="font-bold">{workshop.name}</p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Type:</strong> {workshop.type}
                        <br />
                        <strong>Location:</strong> {workshop.location}
                        <br />
                        <strong>Capabilities:</strong> {workshop.capabilities}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!selectedJobForWorkshop) return;

                        const { error } = await supabase
                          .from("job_assignments")
                          .update({
                            workshop_id: workshop.id,
                            updated_at: new Date().toISOString(),
                          })
                          .eq("id", selectedJobForWorkshop.id);

                        if (error) {
                          toast.error("Failed to assign workshop.");
                          console.error(error);
                        } else {
                          toast.success(`Assigned ${workshop.name} to job.`);
                          setIsWorkshopDialogOpen(false);
                        }
                      }}
                    >
                      Assign
                    </Button>
                  </div>
                ))}
            </div>
          </DialogContent>
        </Dialog>
      </Tabs>

      {/* Job Card Workflow Modal */}
      <JobCardWorkflow
        isOpen={isWorkflowOpen}
        onClose={() => setIsWorkflowOpen(false)}
        jobCard={selectedJobForWorkflow}
        onStatusUpdate={() => {
          // Refresh jobs list and parts data
          const getWorkshopJob = async () => {
            const { data: WorkJ, error: workError } = await supabase
              .from("workshop_job")
              .select("*")
              .order("created_at", { ascending: false });

            if (!workError && WorkJ) {
              const isCompleted = (j: any) =>
                String(j.status || "").toLowerCase() === "completed";
              const notCompleted = (WorkJ || []).filter((j: any) => !isCompleted(j));
              const completed = (WorkJ || []).filter((j: any) => isCompleted(j));
              setWorkshopsJob([
                ...notCompleted,
                ...completed,
              ] as unknown as WorkshopJob[]);

              // Refresh parts data
              const jobIds = WorkJ.map((j: any) => j.id);
              if (jobIds.length > 0) {
                const { data: partsData } = await supabase
                  .from("workshop_jobpart")
                  .select("job_id, given_parts")
                  .in("job_id", jobIds);

                if (partsData) {
                  const jobsWithAssignedParts = new Set<number>();
                  partsData.forEach((part: any) => {
                    if (
                      part.given_parts &&
                      Array.isArray(part.given_parts) &&
                      part.given_parts.length > 0
                    ) {
                      jobsWithAssignedParts.add(part.job_id);
                    }
                  });
                  setJobsWithParts(jobsWithAssignedParts);
                }
              }
            }
          };
          getWorkshopJob();
        }}
      />

      {/* Print Dialog */}
      {selectedJobForPrint && (
        <JobCardPrinter
          isOpenCard={isPrintOpen}
          onCloseCard={() => {
            setIsPrintOpen(false);
            setSelectedJobForPrint(null);
          }}
          jobId={selectedJobForPrint.id}
          jobCard={selectedJobForPrint}
        />
      )}
    </div>
  );
}
