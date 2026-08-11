"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  LINE_ITEM_TEMPLATES,
  LINE_ITEM_SECTIONS,
  JOB_TYPES,
  JOB_PRIORITIES,
  JOB_SOURCES,
} from "@/lib/line-item-templates";

interface Vehicle {
  id: number;
  registration_number: string;
  fleet_number: string;
  make: string;
  model: string;
}

interface Technician {
  id: number;
  name: string;
  availability: string;
  type: string;
}

interface Subcontractor {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  skills?: string[];
}

interface Props {
  onSuccess?: () => void;
}

export default function CreateJobCardDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [form, setForm] = useState({
    registration_no: "",
    fleet_number: "",
    trailer_registration: "",
    job_type: "Maintenance",
    job_source: "office",
    priority: "B#",
    assigned_to: "",
    technician_id: "",
    technician_name: "",
    description: "",
    notes: "",
    due_date: "",
  });

  const [lineItems, setLineItems] = useState<
    { id: string; description: string; category: string; section: string; status: string }[]
  >([]);

  const [customLineItem, setCustomLineItem] = useState("");
  const [customSection, setCustomSection] = useState("Additional");

  const supabase = createClient() as any;

  useEffect(() => {
    fetchVehicles();
    fetchTechnicians();
    fetchSubcontractors();
  }, []);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from("vehiclesc")
      .select("id, registration_number, fleet_number, make, model")
      .order("registration_number");
    if (data) setVehicles(data);
  };

  const fetchTechnicians = async () => {
    const { data } = await supabase
      .from("technicians_maysene")
      .select("id, name, availability, type, isActive")
      .order("name");
    if (data) {
      // Filter to active technicians (true or null = active, false = inactive)
      const active = data.filter((t: any) => t.isActive !== false);
      setTechnicians(active);
    }
  };

  const fetchSubcontractors = async () => {
    const { data } = await supabase
      .from("subcontractor")
      .select("id, name, phone, skills")
      .order("name");
    if (data) setSubcontractors(data);
  };

  const handleVehicleSelect = (reg: string) => {
    const vehicle = vehicles.find((v) => v.registration_number === reg);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      setForm((prev) => ({
        ...prev,
        registration_no: vehicle.registration_number || "",
        fleet_number: vehicle.fleet_number || "",
      }));
    }
  };

  const loadTemplate = (section?: string) => {
    const templates = !section || section === "all"
      ? LINE_ITEM_TEMPLATES
      : LINE_ITEM_TEMPLATES.filter((t) => t.section === section);

    setLineItems([
      ...lineItems,
      ...templates.map((t) => ({
        id: `${t.id}-${Date.now()}`,
        description: t.description,
        category: t.category,
        section: t.section,
        status: "Pending",
      })),
    ]);
  };

  const addCustomLineItem = () => {
    if (!customLineItem.trim()) return;
    setLineItems([
      ...lineItems,
      {
        id: `custom-${Date.now()}`,
        description: customLineItem,
        category: "custom",
        section: customSection,
        status: "Pending",
      },
    ]);
    setCustomLineItem("");
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const getHumanError = (errorMsg: string): string => {
    if (!errorMsg) return "Something went wrong. Please try again.";
    if (errorMsg.includes("foreign key") || errorMsg.includes("violates foreign key constraint")) {
      return "The selected vehicle or technician no longer exists. Please refresh and try again.";
    }
    if (errorMsg.includes("duplicate key") || errorMsg.includes("unique constraint")) {
      return "A job card with this number already exists. Please try again.";
    }
    if (errorMsg.includes("null value") || errorMsg.includes("not-null constraint")) {
      return "Please fill in all required fields.";
    }
    if (errorMsg.includes("permission denied") || errorMsg.includes("42501")) {
      return "You don't have permission to create job cards. Please contact your administrator.";
    }
    if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
      return "Network error. Please check your connection and try again.";
    }
    // Return original message if it's already human-readable
    if (errorMsg.length < 100 && !errorMsg.includes("error") && !errorMsg.includes("23")) {
      return errorMsg;
    }
    return "Failed to create job card. Please try again or contact support.";
  };

  const handleSubmit = async () => {
    if (!form.registration_no) {
      toast.error("Please select a vehicle");
      return;
    }

    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const jobId = `JC-${year}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

      const { data: workshopJob, error } = await supabase
        .from("workshop_job")
        .insert({
          jobid_workshop: jobId,
          registration_no: form.registration_no,
          fleet_number: form.fleet_number,
          trailer_registration: form.trailer_registration,
          job_type: form.job_type,
          job_source: form.job_source,
          priority: form.priority,
          assigned_to: form.assigned_to || null,
          technician_name: form.technician_name || null,
          description: form.description,
          notes: form.notes,
          due_date: form.due_date || null,
          status: "Awaiting Approval",
          workflow_status: form.technician_id ? "mechanic_assigned" : "awaiting_assignment",
          assigned_mechanic_id: null,
          technician_name: form.technician_name || null,
          assigned_to: form.technician_id ? "internal" : null,
          assigned_at: form.technician_id ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating job card:", error);
        throw new Error(error.message);
      }

      // Mark vehicle as unavailable
      try {
        const { data: vehicle } = await supabase
          .from("vehiclesc")
          .select("id")
          .eq("registration_number", form.registration_no)
          .single();

        if (vehicle) {
          const reason = form.job_type || "Under Maintenance";
          await supabase
            .from("vehiclesc")
            .update({
              vehicle_available: false,
              vehicle_not_available_reason: reason,
            })
            .eq("id", vehicle.id);
        }
      } catch (err) {
        console.error("Failed to mark vehicle unavailable:", err);
      }

      if (lineItems.length > 0) {
        const { error: lineItemsError } = await supabase
          .from("job_line_items")
          .insert(
            lineItems.map((item) => ({
              job_id: workshopJob.id,
              description: item.description,
              category: item.category,
              section: item.section,
              status: item.status,
            }))
          );

        if (lineItemsError) {
          console.error("Error adding line items:", lineItemsError);
          throw new Error(lineItemsError.message);
        }
      }

      // Log audit trail
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("job_status_history").insert({
        job_id: workshopJob.id,
        from_status: null,
        to_status: "awaiting_assignment",
        notes: "Job card created from office",
        changed_by: user?.id || null,
        changed_by_role: "office",
      });

      toast.success(`Job Card ${jobId} created successfully`);
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error("Job creation failed:", error);
      toast.error(getHumanError(error.message));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      registration_no: "",
      fleet_number: "",
      trailer_registration: "",
      job_type: "Maintenance",
      job_source: "office",
      priority: "B#",
      assigned_to: "",
      technician_id: "",
      technician_name: "",
      description: "",
      notes: "",
      due_date: "",
    });
    setLineItems([]);
    setSelectedVehicle(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Job Card
        </Button>
      </DialogTrigger>
      <DialogContent className="!w-[80vw] !max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Job Card</DialogTitle>
          <DialogDescription>
            Create a new workshop job card with inspection checklist
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vehicle Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Vehicle Registration *</Label>
              <Select
                value={form.registration_no}
                onValueChange={handleVehicleSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.registration_number}>
                      {v.registration_number} - {v.fleet_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fleet Number</Label>
              <Input
                value={form.fleet_number || ""}
                onChange={(e) => setForm({ ...form, fleet_number: e.target.value })}
                placeholder="Auto-filled"
                readOnly
              />
            </div>
            <div>
              <Label>Trailer Registration</Label>
              <Input
                value={form.trailer_registration || ""}
                onChange={(e) => setForm({ ...form, trailer_registration: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Job Type *</Label>
              <Select
                value={form.job_type}
                onValueChange={(v) => setForm({ ...form, job_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Job Source</Label>
              <Select
                value={form.job_source}
                onValueChange={(v) => setForm({ ...form, job_source: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority *</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Assigned To</Label>
              <Select
                value={form.assigned_to}
                onValueChange={(v) => setForm({ ...form, assigned_to: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal Workshop</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>{form.assigned_to === "subcontractor" ? "Subcontractor Name" : "Technician Name"}</Label>
              <Select
                value={form.technician_id}
                onValueChange={(v) => {
                  if (form.assigned_to === "subcontractor") {
                    const sub = subcontractors.find((s) => s.id === v);
                    setForm({ 
                      ...form, 
                      technician_id: v,
                      technician_name: sub?.name || "" 
                    });
                  } else {
                    const tech = technicians.find((t) => String(t.id) === v);
                    setForm({ 
                      ...form, 
                      technician_id: v,
                      technician_name: tech?.name || "" 
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.assigned_to === "subcontractor" ? "Select subcontractor..." : "Select technician..."} />
                </SelectTrigger>
                <SelectContent>
                  {form.assigned_to === "subcontractor" ? (
                    subcontractors.length === 0 ? (
                      <SelectItem value="none" disabled>No subcontractors available</SelectItem>
                    ) : (
                      subcontractors.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.skills && s.skills.length > 0 ? ` (${s.skills.join(", ")})` : ""}
                        </SelectItem>
                      ))
                    )
                  ) : (
                    technicians.length === 0 ? (
                      <SelectItem value="none" disabled>No available technicians</SelectItem>
                    ) : (
                      technicians.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name} ({t.type})
                        </SelectItem>
                      ))
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Job description..."
                rows={3}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Line Items (Inspection Checklist)</h3>
              <div className="flex gap-2">
                <Select onValueChange={(v) => loadTemplate(v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Load template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LINE_ITEM_SECTIONS.filter((s) => s !== "Additional").map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                    <SelectItem value="all">All Sections</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {lineItems.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm text-gray-500 w-6">{idx + 1}</span>
                    <span className="flex-1 text-sm">{item.description}</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {item.category}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {item.section}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No line items added. Use the dropdown above to load templates.
              </p>
            )}

            {/* Add Custom Line Item */}
            <div className="flex gap-2 mt-4">
              <Input
                value={customLineItem}
                onChange={(e) => setCustomLineItem(e.target.value)}
                placeholder="Add custom line item..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && addCustomLineItem()}
              />
              <Select value={customSection} onValueChange={setCustomSection}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINE_ITEM_SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addCustomLineItem} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !form.registration_no}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? "Creating..." : "Create Job Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
