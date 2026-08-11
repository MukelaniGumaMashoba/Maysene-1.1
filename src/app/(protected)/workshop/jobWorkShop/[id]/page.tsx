"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Truck,
  User,
  Calendar,
  DollarSign,
  Wrench,
  Clock,
  AlertTriangle,
  AlertCircle,
  History,
  Droplet,
  UserCheck,
  Camera,
  X,
  FileText as FileTextIcon,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import JobStatusHistory from "@/components/workshop/JobStatusHistory";
import JobLineItems from "@/components/workshop/JobLineItems";
import WorkflowActions from "@/components/workshop/WorkflowActions";
import { STATUS_LABELS, STATUS_COLORS, WorkflowStatus } from "@/lib/line-item-templates";
import { useCurrentTechnician } from "@/hooks/useCurrentTechnician";

interface WorkshopJob {
  id: number;
  jobid_workshop: string;
  job_type: string;
  description?: string;
  status: string;
  workflow_status?: string;
  priority?: string;
  fleet_number?: string;
  trailer_registration?: string;
  assigned_to?: string;
  job_source?: string;
  registration_no?: string;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  completed_at?: string;
  completion_notes?: string;
  technician_name?: string;
  client_name?: string;
  client_phone?: string;
  labour_hours?: number;
  labor_cost?: number;
  total_labor_cost?: number;
  total_parts_cost?: number;
  total_sublet_cost?: number;
  grand_total?: number;
  quality_check_by?: string;
  quality_check_at?: string;
  cancelled_reason?: string;
  return_reason?: string;
  cancelled_at?: string;
  assigned_at?: string;
  accepted_at?: string;
}

interface Vehicle {
  id: number;
  registration_number: string;
  fleet_number: string;
  make: string;
  model: string;
  manufactured_year: string;
  vehicle_type: string;
  fuel_type: string;
  colour: string;
  vehicle_available?: boolean;
  vehicle_not_available_reason?: string;
}

interface Technician {
  id: number;
  name: string;
  phone: string;
  email: string;
}

const notAllowedStatuses = ["job_completed", "quality_check_done", "job_cancelled"];

export default function WorkshopJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<WorkshopJob | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [allTechnicians, setAllTechnicians] = useState<any[]>([]);
  const [reassignTechId, setReassignTechId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const supabase = createClient() as any;

  const [labourHours, setLabourHours] = useState<number>(0);
  const [labourRate, setLabourRate] = useState<number>(0);
  const [labourTotal, setLabourTotal] = useState<number>(0);
  const [consumables, setConsumables] = useState<any[]>([]);
  const [jobNotes, setJobNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [jobPhotos, setJobPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [lineItems, setLineItems] = useState<any[]>([]);
  
  const { technician: currentTechnician, loading: techLoading } = useCurrentTechnician();

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
      .eq("isActive", true)
      .order("name");
    if (data) setAllTechnicians(data);
  };

  const handleReassign = async () => {
    if (!reassignTechId || !job) return;
    const tech = allTechnicians.find((t) => t.id === reassignTechId);
    if (!tech) return;

    setIsReassigning(true);
    try {
      const { error } = await supabase
        .from("workshop_job")
        .update({
          assigned_mechanic_id: null,
          technician_name: tech.name,
          workflow_status: "mechanic_assigned",
          assigned_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (error) throw error;

      await supabase.from("job_status_history").insert({
        job_id: job.id,
        from_status: job.workflow_status,
        to_status: "mechanic_assigned",
        notes: `Reassigned from ${job.technician_name || "None"} to ${tech.name}`,
        changed_by_role: userRole,
      });

      toast.success(`Job reassigned to ${tech.name}`);
      setReassignTechId("");
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to reassign");
    } finally {
      setIsReassigning(false);
    }
  };

  useEffect(() => {
    const fetchJobAndVehicle = async () => {
      const { data: jobData, error: jobError } = await supabase
        .from("workshop_job")
        .select("*")
        .eq("id", Number(params.id))
        .single();

      if (jobError || !jobData) {
        setIsLoading(false);
        return;
      }

      setJob(jobData as WorkshopJob);
      setJobPhotos(jobData.photos || []);

      setLabourHours(jobData?.labour_hours ?? 0);
      setLabourRate(jobData?.labor_cost ?? 0);
      const total =
        jobData?.total_labor_cost ??
        (jobData?.labour_hours ?? 0) * (jobData?.labor_cost ?? 0);
      setLabourTotal(total ?? 0);

      if (jobData.registration_no) {
        const { data: vehicleData } = await supabase
          .from("vehiclesc")
          .select("*")
          .eq("registration_number", jobData.registration_no)
          .single();
        if (vehicleData) setVehicle(vehicleData as Vehicle);
      }

      if (jobData.technician_name) {
        const { data: techData } = await supabase
          .from("technicians_maysene")
          .select("id, name, phone, email")
          .eq("name", jobData.technician_name)
          .single();
        if (techData) setTechnician(techData as Technician);
      }

      const { data: consumablesData } = await supabase
        .from("workshop_jobpart")
        .select("*")
        .eq("job_id", jobData.id);
      if (consumablesData) {
        const consumablesList = consumablesData?.flatMap((item: any) => item.consumables || []) || [];
        setConsumables(consumablesList);
      }

      // Fetch line items
      const { data: lineItemsData } = await supabase
        .from("job_line_items")
        .select("*")
        .eq("job_id", jobData.id);
      if (lineItemsData) setLineItems(lineItemsData);

      setJobNotes(jobData?.notes || "");
      setIsLoading(false);
    };
    if (params.id) fetchJobAndVehicle();
  }, [params.id]);

  const handleRefresh = async () => {
    if (!job) return;
    const { data: jobData } = await supabase
      .from("workshop_job")
      .select("*")
      .eq("id", job.id)
      .single();
    if (jobData) setJob(jobData as WorkshopJob);
  };

  const handleSaveNotes = async () => {
    if (!job) return;
    setIsSavingNotes(true);
    const { error } = await supabase
      .from("workshop_job")
      .update({ notes: jobNotes, updated_at: new Date().toISOString() })
      .eq("id", job.id);

    if (error) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Notes saved");
      setJob((prev) => prev ? { ...prev, notes: jobNotes } : null);
    }
    setIsSavingNotes(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !job) return;

    setIsUploadingPhoto(true);
    try {
      const newUrls: string[] = [];
      for (const file of files) {
        const filePath = `jobs/${job.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("job-attachments")
          .upload(filePath, file);
        if (error) throw error;
        const { data } = supabase.storage
          .from("job-attachments")
          .getPublicUrl(filePath);
        if (data?.publicUrl) newUrls.push(data.publicUrl);
      }

      const updatedPhotos = [...jobPhotos, ...newUrls];
      await supabase
        .from("workshop_job")
        .update({ photos: updatedPhotos })
        .eq("id", job.id);

      setJobPhotos(updatedPhotos);
      setJob((prev) => prev ? { ...prev, photos: updatedPhotos } : null);
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photos");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !job) return;

    setIsUploadingInvoice(true);
    try {
      const filePath = `jobs/${job.id}/invoice-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("job-attachments")
        .upload(filePath, file);
      if (error) throw error;

      const { data } = supabase.storage
        .from("job-attachments")
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        await supabase
          .from("workshop_job")
          .update({ invoice_url: data.publicUrl })
          .eq("id", job.id);

        setJob((prev) => prev ? { ...prev, invoice_url: data.publicUrl } : null);
        toast.success("Invoice uploaded");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload invoice");
    } finally {
      setIsUploadingInvoice(false);
      e.target.value = "";
    }
  };

  const removePhoto = async (index: number) => {
    if (!job) return;
    const updatedPhotos = jobPhotos.filter((_, i) => i !== index);
    await supabase
      .from("workshop_job")
      .update({ photos: updatedPhotos })
      .eq("id", job.id);
    setJobPhotos(updatedPhotos);
    setJob((prev) => prev ? { ...prev, photos: updatedPhotos } : null);
  };

  const handleCloseJob = async () => {
    if (!job) return;
    const { error } = await supabase
      .from("workshop_job")
      .update({
        workflow_status: "job_completed",
        completed_at: new Date().toISOString(),
        completion_notes: jobNotes || null,
      })
      .eq("id", job.id);

    if (error) {
      toast.error("Failed to close job");
    } else {
      await supabase.from("job_status_history").insert({
        job_id: job.id,
        from_status: job.workflow_status,
        to_status: "job_completed",
        notes: jobNotes || "Job completed",
      });
      toast.success("Job completed successfully");
      handleRefresh();
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as WorkflowStatus] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!job) return <div className="p-8 text-center">Job not found</div>;

  const workflowStatus = (job as any).workflow_status || "awaiting_assignment";
  const isWorkshopRole = userRole === "mechanic" || userRole === "senior-mechanic";
  const isOfficeRole = userRole === "office" || userRole === "fleet-manager" || userRole === "fleet_manager" || userRole === "fleet manager";
  const isPendingAcceptance = isWorkshopRole && (workflowStatus === "mechanic_assigned" || workflowStatus === "subcontractor_assigned");
  
  // OWNERSHIP CHECK: Mechanics can only view their assigned jobs
  const isOwner = !isWorkshopRole || userRole === "senior-mechanic" || 
    (job as any).technician_name === currentTechnician?.name;

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/workshop/jobWorkShop">
              <Button variant="ghost" className="flex items-center gap-2 text-sm sm:text-base">
                <ArrowLeft className="h-4 w-4" /> Back to Jobs
              </Button>
            </Link>
            <h1 className="text-base sm:text-xl font-bold">Access Denied</h1>
          </div>
        </div>
        <div className="p-6 max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Job Not Assigned to You</h2>
              <p className="text-gray-600 mb-4">This job is assigned to another technician. You can only view jobs assigned to you.</p>
              <Link href="/workshop/jobWorkShop">
                <Button>Back to Workshop Jobs</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Gate: mechanic/senior-mechanic must accept before seeing full job
  if (isPendingAcceptance) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link href="/workshop/jobWorkShop">
              <Button variant="ghost" className="flex items-center gap-2 text-sm sm:text-base">
                <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to Jobs</span><span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <h1 className="text-base sm:text-xl font-bold">Job Requires Acceptance</h1>
          </div>
        </div>
        <div className="p-6 max-w-2xl mx-auto">
          <Card>
            <CardHeader className="bg-orange-500 text-white">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-2xl">{job.jobid_workshop}</CardTitle>
                  <p className="text-orange-100">{job.job_type}</p>
                  {job.fleet_number && (
                    <p className="text-orange-100 text-sm">Fleet #: {job.fleet_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge className={`${getStatusColor(workflowStatus)} px-3 py-1 text-base`}>
                    {STATUS_LABELS[workflowStatus as WorkflowStatus] || workflowStatus}
                  </Badge>
                  <p className="text-orange-100 text-sm mt-1">
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Vehicle Registration</p>
                <p className="font-semibold text-lg">{job.registration_no || "N/A"}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Description</p>
                <p className="font-semibold">{job.description || "No description"}</p>
              </div>
              {job.notes && (
                <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                  <p className="text-sm text-gray-600 font-semibold">Notes</p>
                  <p className="text-gray-700">{job.notes}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <WorkflowActions
                  jobId={job.id}
                  currentStatus={workflowStatus}
                  registrationNo={job.registration_no}
                  isOffice={isOfficeRole}
                  onSuccess={handleRefresh}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link href="/workshop/jobWorkShop">
            <Button variant="ghost" className="flex items-center gap-2 text-sm sm:text-base">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to Jobs</span><span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <h1 className="text-base sm:text-xl font-bold">Job Details</h1>
        </div>
      </div>

      <div className="p-3 sm:p-6">
        {/* Job Header Card */}
        <Card className="mb-6">
          <CardHeader className="bg-orange-500 text-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl">{job.jobid_workshop}</CardTitle>
                <p className="text-orange-100">{job.job_type}</p>
                {job.fleet_number && (
                  <p className="text-orange-100 text-sm">Fleet #: {job.fleet_number}</p>
                )}
                {job.trailer_registration && (
                  <p className="text-orange-100 text-sm">Trailer: {job.trailer_registration}</p>
                )}
              </div>
              <div className="text-right">
                <Badge className={`${getStatusColor(workflowStatus)} px-3 py-1 text-base`}>
                  {STATUS_LABELS[workflowStatus as WorkflowStatus] || workflowStatus}
                </Badge>
                {job.priority && (
                  <Badge className="ml-2 bg-white/20 text-white px-2 py-1">
                    Priority {job.priority}
                  </Badge>
                )}
                <p className="text-orange-100 text-sm mt-1">
                  {new Date(job.created_at).toLocaleDateString()}
                </p>
                {job.due_date && (
                  <p className="text-orange-100 text-xs">Due: {new Date(job.due_date).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Workflow Actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <WorkflowActions
              jobId={job.id}
              currentStatus={workflowStatus}
              registrationNo={job.registration_no}
              isOffice={isOfficeRole}
              onSuccess={handleRefresh}
            />
          </CardContent>
        </Card>

        {/* Work Summary for Returned to Office */}
        {workflowStatus === "returned_to_office" && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Work Summary - Returned to Office
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Time Information */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded border border-orange-200">
                  <p className="text-xs font-medium text-gray-500">Assigned At</p>
                  <p className="text-sm font-semibold">
                    {job.assigned_at
                      ? new Date(job.assigned_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })
                      : "N/A"}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border border-orange-200">
                  <p className="text-xs font-medium text-gray-500">Started At</p>
                  <p className="text-sm font-semibold">
                    {job.start_time
                      ? new Date(job.start_time).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })
                      : "Not started"}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border border-orange-200">
                  <p className="text-xs font-medium text-gray-500">Returned At</p>
                  <p className="text-sm font-semibold">
                    {job.updated_at
                      ? new Date(job.updated_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })
                      : "N/A"}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border border-orange-200">
                  <p className="text-xs font-medium text-gray-500">Technician</p>
                  <p className="text-sm font-semibold">{job.technician_name || "N/A"}</p>
                </div>
              </div>

              {/* Return Reason */}
              <div className="bg-white p-3 rounded border border-orange-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Return Reason</p>
                <p className="text-sm font-semibold text-red-700">{job.return_reason || job.cancelled_reason || "N/A"}</p>
              </div>

              {/* Notes */}
              {job.notes && (
                <div className="bg-white p-3 rounded border border-orange-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Job Notes</p>
                  <p className="text-sm">{job.notes}</p>
                </div>
              )}

              {/* Line Items Completed */}
              {lineItems.length > 0 && (
                <div className="bg-white p-4 rounded border border-orange-200">
                  <p className="text-xs font-medium text-gray-500 mb-3">Line Items Completed ({lineItems.filter(i => i.status === 'ok').length} OK, {lineItems.filter(i => i.status === 'faulty').length} Faulty)</p>
                  <div className="space-y-2">
                    {lineItems.map((item) => {
                      const itemStatus = (item.status || "").toLowerCase();
                      return (
                      <div key={item.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                        <div className="mt-0.5">
                          {itemStatus === "ok" ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : itemStatus === "faulty" ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{item.description}</p>
                            <Badge variant={itemStatus === "ok" ? "default" : itemStatus === "faulty" ? "destructive" : "secondary"} className="text-xs">
                              {item.status || "pending"}
                            </Badge>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-gray-600 mt-1">{item.notes}</p>
                          )}
                          {item.photos && item.photos.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {item.photos.map((photo: string, idx: number) => (
                                <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                                  <img src={photo} alt="" className="h-12 w-12 object-cover rounded border" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Job Photos */}
              {jobPhotos.length > 0 && (
                <div className="bg-white p-4 rounded border border-orange-200">
                  <p className="text-xs font-medium text-gray-500 mb-3">Job Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {jobPhotos.map((photo, idx) => (
                      <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                        <img src={photo} alt="" className="h-20 w-20 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="details" className="space-y-6">
          <div className="overflow-x-auto -mx-3 px-3">
            <TabsList className="flex flex-wrap gap-1 w-full bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="details" className="flex-1 min-w-0 text-xs sm:text-sm px-2 py-2">
                <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
                <span className="hidden sm:inline">Details</span><span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="line-items" className="flex-1 min-w-0 text-xs sm:text-sm px-2 py-2">
                <CheckCircle className="h-4 w-4 mr-1 hidden sm:inline" />
                <span className="hidden sm:inline">Line Items</span><span className="sm:hidden">Items</span>
              </TabsTrigger>
              <TabsTrigger value="costs" className="flex-1 min-w-0 text-xs sm:text-sm px-2 py-2">
                <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" />
                Costs
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 min-w-0 text-xs sm:text-sm px-2 py-2">
                <History className="h-4 w-4 mr-1 hidden sm:inline" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Details Tab */}
          <TabsContent value="details">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vehicle Section */}
              <Card>
                <CardHeader className="bg-gray-100 border-b">
                  <CardTitle className="flex items-center gap-2 text-black">
                    <Truck className="h-5 w-5 text-orange-500" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {vehicle ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Registration</p>
                        <p className="font-semibold text-lg">{vehicle.registration_number}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Fleet Number</p>
                        <p className="font-semibold">{vehicle.fleet_number || "N/A"}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Make & Model</p>
                        <p className="font-semibold">{vehicle.make} {vehicle.model}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Year</p>
                        <p className="font-semibold">{vehicle.manufactured_year}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600">Availability</p>
                        <p className={`font-semibold ${vehicle.vehicle_available ? "text-green-600" : "text-red-600"}`}>
                          {vehicle.vehicle_available ? "Available" : `Unavailable - ${vehicle.vehicle_not_available_reason}`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Truck className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Vehicle not found</p>
                      <p className="text-sm text-gray-500">Registration: {job.registration_no}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Job Details */}
              <Card>
                <CardHeader className="bg-gray-100 border-b">
                  <CardTitle className="flex items-center gap-2 text-black">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Job Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="font-semibold">{job.description || "No description"}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Job Source</p>
                    <p className="font-semibold capitalize">{(job as any).job_source || "Office Created"}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Assigned To</p>
                    <p className="font-semibold capitalize">{(job as any).assigned_to || "Not Assigned"}</p>
                  </div>
                  {job.technician_name ? (
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <p className="text-sm text-green-700">Technician</p>
                      <p className="font-semibold text-green-800">{job.technician_name}</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <p className="text-sm text-yellow-700">Technician</p>
                      <p className="font-semibold text-yellow-800">Not Assigned</p>
                    </div>
                  )}

                  {/* Reassign section — visible to office at any time */}
                  {(userRole === "office" || userRole === "fleet-manager" || userRole === "fleet_manager" || userRole === "fleet manager") && (
                    <div className="border-t pt-3 mt-3">
                      <Label className="text-sm font-semibold text-gray-700">Reassign Technician</Label>
                      <div className="flex gap-2 mt-2">
                        <Select value={reassignTechId} onValueChange={setReassignTechId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select technician..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allTechnicians.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleReassign}
                          disabled={isReassigning || !reassignTechId}
                          className="bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          {isReassigning ? "Assigning..." : "Re-Assign"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {job.location && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-semibold">{job.location}</p>
                    </div>
                  )}
                  {job.notes && (
                    <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                      <p className="text-sm text-gray-600 font-semibold">Notes</p>
                      <p className="text-gray-700">{job.notes}</p>
                    </div>
                  )}

                  {/* Time Tracking */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Time Tracking</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {job.start_time && (
                        <div className="bg-green-50 p-2 rounded text-sm">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Started: {new Date(job.start_time).toLocaleString()}
                        </div>
                      )}
                      {job.end_time && (
                        <div className="bg-red-50 p-2 rounded text-sm">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Ended: {new Date(job.end_time).toLocaleString()}
                        </div>
                      )}
                      {job.completed_at && (
                        <div className="bg-blue-50 p-2 rounded text-sm">
                          <CheckCircle className="h-3 w-3 inline mr-1" />
                          Completed: {new Date(job.completed_at).toLocaleString()}
                        </div>
                      )}
                      {(job as any).quality_check_at && (
                        <div className="bg-emerald-50 p-2 rounded text-sm">
                          <CheckCircle className="h-3 w-3 inline mr-1" />
                          QC: {new Date((job as any).quality_check_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes Section */}
                  {!["job_completed", "quality_check_done", "job_cancelled"].includes(workflowStatus) && (
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold text-gray-700">Job Notes</Label>
                      <Textarea
                        value={jobNotes}
                        onChange={(e) => setJobNotes(e.target.value)}
                        placeholder="Add notes about this job..."
                        rows={3}
                        className="mt-2"
                      />
                      <Button
                        size="sm"
                        className="mt-2 bg-gray-600 hover:bg-gray-700 text-white"
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes}
                      >
                        {isSavingNotes ? "Saving..." : "Save Notes"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Consumables */}
            {consumables && consumables.length > 0 && (
              <Card className="mt-6">
                <CardHeader className="bg-gray-100 border-b">
                  <CardTitle className="flex items-center gap-2 text-black">
                    <Droplet className="h-5 w-5 text-purple-600" />
                    Consumables Used
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    {consumables.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-purple-50 p-2 rounded">
                        <span>{c.name || "Unnamed"}</span>
                        <span className="font-semibold">R{parseFloat(c.price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-200 flex justify-between">
                    <span className="font-semibold">Consumables Total:</span>
                    <span className="font-bold text-purple-600">
                      R{consumables.reduce((sum: number, c: any) => sum + (parseFloat(c.price) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Photos & Invoice Section */}
            <Card className="mt-6">
              <CardHeader className="bg-gray-100 border-b">
                <CardTitle className="flex items-center gap-2 text-black">
                  <Camera className="h-5 w-5 text-blue-600" />
                  Photos & Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Job Photos */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Job Photos</Label>
                  <label className="mt-2 flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {isUploadingPhoto ? "Uploading..." : "Click to upload photos"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                    />
                  </label>
                  {jobPhotos.length > 0 && (
                    <div className="flex gap-3 mt-3 flex-wrap">
                      {jobPhotos.map((url, i) => (
                        <div key={i} className="relative group">
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`Job photo ${i + 1}`}
                              className="h-24 w-24 object-cover rounded border"
                            />
                          </a>
                          <button
                            onClick={() => removePhoto(i)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoice (subcontractor jobs) */}
                {(job as any).assigned_to === "subcontractor" && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-semibold text-gray-700">Invoice (Subcontractor)</Label>
                    {(job as any).invoice_url ? (
                      <div className="mt-2">
                        <a
                          href={(job as any).invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          View Invoice
                        </a>
                      </div>
                    ) : (
                      <label className="mt-2 flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {isUploadingInvoice ? "Uploading..." : "Click to upload invoice"}
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={handleInvoiceUpload}
                          disabled={isUploadingInvoice}
                        />
                      </label>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Line Items Tab */}
          <TabsContent value="line-items">
            <Card>
              <CardContent className="p-6">
                <JobLineItems
                  jobId={job.id}
                  isMechanic={true}
                  onUpdate={handleRefresh}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs">
            <Card>
              <CardHeader className="bg-gray-100 border-b">
                <CardTitle className="flex items-center gap-2 text-black">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                  Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <p className="text-sm text-green-700">Labour Cost</p>
                    <p className="text-xl font-bold text-green-800">
                      {job.total_labor_cost ? `R ${job.total_labor_cost.toFixed(2)}` : "TBD"}
                    </p>
                    <p className="text-xs text-green-600">{labourHours} hrs @ R{labourRate}/hr</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <p className="text-sm text-blue-700">Parts Cost</p>
                    <p className="text-xl font-bold text-blue-800">
                      {job.total_parts_cost ? `R ${job.total_parts_cost.toFixed(2)}` : "R 0.00"}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                    <p className="text-sm text-yellow-500">Sublet Cost</p>
                    <p className="text-xl font-bold text-yellow-800">
                      {job.total_sublet_cost ? `R ${job.total_sublet_cost.toFixed(2)}` : "R 0.00"}
                    </p>
                  </div>
                </div>
                {consumables && consumables.length > 0 && (
                  <div className="bg-purple-50 p-4 rounded border border-purple-200">
                    <p className="text-sm text-purple-700">Consumables Cost</p>
                    <p className="text-xl font-bold text-purple-800">
                      R{consumables.reduce((sum: number, c: any) => sum + (parseFloat(c.price) || 0), 0).toFixed(2)}
                    </p>
                  </div>
                )}
                <div className="bg-gray-900 text-white p-4 rounded">
                  <p className="text-sm text-gray-300">Grand Total</p>
                  <p className="text-2xl font-bold">
                    R{(
                      (job.total_labor_cost ?? 0) +
                      (job.total_parts_cost ?? 0) +
                      (job.total_sublet_cost ?? 0) +
                      (consumables ? consumables.reduce((sum: number, c: any) => sum + (parseFloat(c.price) || 0), 0) : 0)
                    ).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <JobStatusHistory jobId={job.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
