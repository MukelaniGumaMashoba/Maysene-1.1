"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import InspectionTemplatesPage from "@/components/pages/InspectionTemplates";
import getExt from "@/hooks/timeHook";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type InspectionItem = {
  label: string;
  category: string;
  status: string | null;
};

type InspectionSection = {
  title: string;
  items: InspectionItem[];
};

type Inspection = {
  id: number;
  vehicle_id: number;
  driver_id: number | null;
  odo_reading: number;
  overall_status: string | null;
  category: string | null;
  checklist: InspectionSection[];
  inspection_date: string;
  vehicle: { registration_number: string; make: string; model: string; fleet_number: string } | null;
  driver: { first_name: string; surname: string } | null;
  location: string | null;
  timing: {
    end: string;
    start: string;
    duration_seconds: number | null;
  }
};

type Defect = {
  id: number;
  inspection_id: number | null;
  workshop_job_id: number | null;
  vehicle_id: number | null;
  driver_id: number | null;
  defect_name: string;
  defect_category: string | null;
  defect_description: string | null;
  defect_status: string;
  priority: string | null;
  notes: string | null;
  logged_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  rectified_at: string | null;
  created_at: string;
  vehicle: { registration_number: string; make: string; model: string; fleet_number: string } | null;
  driver: { first_name: string; surname: string } | null;
  workshop_job: { jobid_workshop: string; status: string } | null;
};

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [defectStatusFilter, setDefectStatusFilter] = useState<string>("All");
  const [dateRange, setDateRange] = useState<string>("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [defectSearchQuery, setDefectSearchQuery] = useState("");
  const [showAddDefect, setShowAddDefect] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [driversList, setDriversList] = useState<any[]>([]);
  const [defectForm, setDefectForm] = useState({
    defect_name: "",
    defect_category: "",
    defect_description: "",
    priority: "medium",
    vehicle_id: "",
    driver_id: "",
    notes: "",
  });
  const [isSubmittingDefect, setIsSubmittingDefect] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchInspections();
    fetchDefects();
    fetchVehicles();
    fetchDrivers();
  }, []);

  const fetchInspections = async () => {
    const { data, error } = await supabase
      .from("inspections")
      .select(
        `
        *,
        vehicle:vehicle_id (registration_number, make, model, fleet_number),
        driver:driver_id (first_name, surname)
      `
      )
      .order("inspection_date", { ascending: false });

    if (!error && data) setInspections(data as unknown as Inspection[]);
  };

  const fetchDefects = async () => {
    const { data, error } = await supabase
      .from("defects")
      .select(
        `
        *,
        vehicle:vehicle_id (registration_number, make, model, fleet_number),
        driver:driver_id (first_name, surname),
        workshop_job:workshop_job_id (jobid_workshop, status)
      `
      )
      .order("created_at", { ascending: false });

    if (!error && data) setDefects(data as unknown as Defect[]);
  };

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from("vehiclesc")
      .select("id, registration_number, make, model, fleet_number")
      .eq("vehicle_deleted", false)
      .order("registration_number");
    if (data) setVehicles(data);
  };

  const fetchDrivers = async () => {
    const { data } = await supabase
      .from("drivers")
      .select("id, first_name, surname")
      .eq("deleted", false)
      .order("first_name");
    if (data) setDriversList(data);
  };

  const handleAddDefect = async () => {
    if (!defectForm.defect_name.trim()) {
      toast.error("Defect name is required");
      return;
    }
    if (!defectForm.vehicle_id) {
      toast.error("Vehicle is required");
      return;
    }
    setIsSubmittingDefect(true);
    const { error } = await supabase.from("defects").insert({
      defect_name: defectForm.defect_name,
      defect_category: defectForm.defect_category || null,
      defect_description: defectForm.defect_description || null,
      defect_status: "Logged",
      priority: defectForm.priority,
      vehicle_id: Number(defectForm.vehicle_id),
      driver_id: defectForm.driver_id ? Number(defectForm.driver_id) : null,
      notes: defectForm.notes || null,
    });
    setIsSubmittingDefect(false);
    if (error) {
      console.error(error);
      toast.error("Failed to add defect");
    } else {
      toast.success("Defect added successfully");
      setShowAddDefect(false);
      setDefectForm({ defect_name: "", defect_category: "", defect_description: "", priority: "medium", vehicle_id: "", driver_id: "", notes: "" });
      fetchDefects();
    }
  };

  const startOfDay = (d: Date) => {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };
  const endOfDay = (d: Date) => {
    const dt = new Date(d);
    dt.setHours(23, 59, 59, 999);
    return dt;
  };

  const getWeekBounds = (d: Date) => {
    const dt = new Date(d);
    const day = (dt.getDay() + 6) % 7;
    const monday = new Date(dt);
    monday.setDate(dt.getDate() - day);
    return {
      start: startOfDay(monday),
      end: endOfDay(new Date(monday.getTime() + 6 * 24 * 3600 * 1000)),
    };
  };

  const filteredInspections = useMemo(() => {
    let start: Date | null = null;
    let end: Date | null = null;
    const now = new Date();

    if (dateRange === "today") {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (dateRange === "7days") {
      start = startOfDay(new Date(now.getTime() - 6 * 24 * 3600 * 1000));
      end = endOfDay(now);
    } else if (dateRange === "thisWeek") {
      const bounds = getWeekBounds(now);
      start = bounds.start;
      end = bounds.end;
    } else if (dateRange === "custom") {
      if (customStart) start = startOfDay(new Date(customStart));
      if (customEnd) end = endOfDay(new Date(customEnd));
    }

    return inspections.filter((insp) => {
      if (statusFilter !== "All") {
        if (statusFilter === "Unknown") {
          if (insp.overall_status !== null) return false;
        } else {
          if (insp.overall_status !== statusFilter) return false;
        }
      }
      if (start || end) {
        const inspDate = new Date(insp.inspection_date);
        if (start && inspDate < start) return false;
        if (end && inspDate > end) return false;
      }
      return true;
    });
  }, [inspections, statusFilter, dateRange, customStart, customEnd]);

  const filteredDefects = useMemo(() => {
    return defects.filter((d) => {
      if (defectStatusFilter !== "All" && d.defect_status !== defectStatusFilter) return false;
      if (defectSearchQuery) {
        const q = defectSearchQuery.toLowerCase();
        const matchesName = d.defect_name?.toLowerCase().includes(q);
        const matchesVehicle = d.vehicle?.registration_number?.toLowerCase().includes(q);
        const matchesJob = d.workshop_job?.jobid_workshop?.toLowerCase().includes(q);
        if (!matchesName && !matchesVehicle && !matchesJob) return false;
      }
      return true;
    });
  }, [defects, defectStatusFilter, defectSearchQuery]);

  const totalDefects = defects.length;
  const loggedDefects = defects.filter((d) => d.defect_status === "Logged").length;
  const inProgressDefects = defects.filter((d) => d.defect_status === "In Progress").length;
  const rectifiedDefects = defects.filter((d) => d.defect_status === "Rectified").length;

  const getDefectStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Logged: "bg-blue-100 text-blue-800",
      "Under Review": "bg-yellow-100 text-yellow-800",
      Approved: "bg-green-100 text-green-800",
      "In Progress": "bg-orange-100 text-orange-800",
      Rectified: "bg-emerald-100 text-emerald-800",
      Rejected: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-7xl space-y-4">
        <Tabs defaultValue="inspections" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inspections">Inspections ({inspections.length})</TabsTrigger>
            <TabsTrigger value="defects">Defects ({totalDefects})</TabsTrigger>
            <TabsTrigger value="add-defect">Add Defect</TabsTrigger>
          </TabsList>

          {/* ==================== INSPECTIONS TAB ==================== */}
          <TabsContent value="inspections" className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2 text-gray-800">
                  Vehicle Inspections
                </h1>
                <p className="text-sm text-gray-600">
                  Below is a list of vehicle inspections. Click{" "}
                  <strong>"View Full Inspection"</strong> to see the full checklist
                  and any noted faults.
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-end md:space-x-4 gap-3">
              <div className="bg-gray-50 p-3 rounded-md border flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  className="px-3 py-1 rounded bg-white border"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Faulty">Faulty</option>
                  <option value="Passed">Passed</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-md border flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Date Range</label>
                <select
                  className="px-3 py-1 rounded bg-white border"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 days</option>
                  <option value="thisWeek">This week</option>
                  <option value="custom">Custom</option>
                </select>

                {dateRange === "custom" && (
                  <div className="flex items-center gap-2 ml-2">
                    <input type="date" className="px-2 py-1 rounded border bg-white text-sm" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                    <span className="text-sm text-gray-500">to</span>
                    <input type="date" className="px-2 py-1 rounded border bg-white text-sm" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                    <Button onClick={() => { if (!customStart && !customEnd) setDateRange("all"); }} variant="ghost">Apply</Button>
                  </div>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="text-sm text-gray-500">
                  Showing {filteredInspections.length} of {inspections.length}
                </div>
                <Button onClick={() => { setStatusFilter("All"); setDateRange("all"); setCustomStart(""); setCustomEnd(""); }} variant="destructive" className="bg-red-600 text-white">Reset</Button>
              </div>
            </div>

            <div className="flex-shrink-0 space-y-2">
              <Button onClick={() => setTemplatesOpen(true)} className="bg-white/10 hover:bg-white/20 text-black border border-black">
                Manage Templates
              </Button>
            </div>

            {/* Inspections list */}
            {filteredInspections.map((insp) => {
              const isFaulty = insp.overall_status === "Faulty";
              return (
                <Card key={insp.id} className={`transition transform hover:scale-[1.01] shadow-lg rounded-2xl border ${isFaulty ? "bg-gradient-to-r from-red-600 via-red-500 to-red-400 text-white" : "bg-gradient-to-r from-green-600 via-green-500 to-green-400 text-white"}`}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center text-lg font-semibold">
                      <span className="tracking-wide">
                        {insp.vehicle?.fleet_number} : {insp.vehicle?.registration_number} – {insp.vehicle?.make}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs uppercase shadow-sm bg-white/20 text-white border border-white/30">
                        {insp.overall_status ?? "Unknown"}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs uppercase shadow-sm bg-white/20 text-white border border-white/30">
                        Location : {insp.location}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <strong>Driver:</strong>{" "}
                        {insp.driver ? `${insp.driver.first_name} ${insp.driver.surname}` : "N/A"}
                      </div>
                      <div><strong>Odometer:</strong> {insp.odo_reading}</div>
                      <div><strong>Category:</strong> {insp.category ?? "N/A"}</div>
                      <div>
                        <strong>Date:</strong> {new Date(insp.inspection_date).toLocaleDateString()}
                        {insp.timing && (
                          <span> | Time Taken: {getExt(insp.timing?.duration_seconds || 0)} | Seconds: {insp.timing?.duration_seconds}</span>
                        )}
                      </div>
                    </div>
                    <Accordion type="single" collapsible>
                      <AccordionItem value={`insp-${insp.id}`}>
                        <AccordionTrigger className="text-white hover:text-gray-100 rounded-3xl px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30">
                          Preview Checklist
                        </AccordionTrigger>
                        <AccordionContent className="bg-white/10 rounded-lg p-4">
                          {Array.isArray(insp.checklist) && insp.checklist.length > 0 ? (
                            insp.checklist.slice(0, 1).map((section, sIdx) => (
                              <div key={sIdx} className="mb-4 bg-white p-3 rounded text-black">
                                <h3 className="font-medium text-blue-700 mb-2">{section.title}</h3>
                                <ul className="list-disc list-inside space-y-1">
                                  {section.items.map((item, iIdx) => (
                                    <li key={iIdx} className="flex justify-between text-sm">
                                      <span>{item.label} <span className="text-gray-500">(Category : {item.category})</span></span>
                                      <span className={item.status === "Faulty" ? "text-red-500 font-semibold" : "text-green-500 font-semibold"}>
                                        {item.status ?? "N/A"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-200 italic">No checklist data available.</p>
                          )}
                          <Link href={`/fleetManager/inspections/${insp.id}`}>
                            <Button variant="secondary" className="mt-3 bg-white/20 hover:bg-white/30 text-white border border-white/30">
                              View Full Inspection
                            </Button>
                          </Link>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}

            {/* Templates Modal */}
            {templatesOpen && (
              <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="fixed inset-0 bg-black/50" onClick={() => setTemplatesOpen(false)} />
                <div className="relative z-10 w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh]">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Inspection Templates</h2>
                    <Button onClick={() => setTemplatesOpen(false)} className="bg-gray-100 text-gray-800">Close</Button>
                  </div>
                  <div className="p-4">
                    <div className="bg-gray-50 p-4 rounded-md border">
                      <InspectionTemplatesPage />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ==================== DEFECTS TAB ==================== */}
          <TabsContent value="defects" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: "Total Defects", value: totalDefects, icon: "🔧" },
                { title: "Logged", value: loggedDefects, icon: "📝" },
                { title: "In Progress", value: inProgressDefects, icon: "⏳" },
                { title: "Rectified", value: rectifiedDefects, icon: "✅" },
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4">
                  <div className="text-2xl">{stat.icon}</div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Header with Search */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">All Defects</h3>
                <p className="text-sm text-gray-500">Track defects from inspections through to rectification</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={defectStatusFilter}
                  onChange={(e) => setDefectStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Logged">Logged</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Rectified">Rectified</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search defects..."
                    value={defectSearchQuery}
                    onChange={(e) => setDefectSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>
              </div>
            </div>

            {/* Defects Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm text-left table-auto">
                <thead className="text-xs uppercase bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-[5%]">ID</th>
                    <th className="px-4 py-3 font-semibold w-[18%]">Defect</th>
                    <th className="px-4 py-3 font-semibold w-[15%]">Vehicle</th>
                    <th className="px-4 py-3 font-semibold w-[12%]">Category</th>
                    <th className="px-4 py-3 font-semibold w-[12%]">Status</th>
                    <th className="px-4 py-3 font-semibold w-[14%]">Job Card</th>
                    <th className="px-4 py-3 font-semibold w-[12%]">Logged</th>
                    <th className="px-4 py-3 font-semibold text-center w-[12%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDefects.map((defect: Defect, index: number) => (
                    <tr
                      key={defect.id}
                      className={`border-b transition-colors hover:bg-blue-50 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">#{defect.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-0" title={defect.defect_name}>
                        {defect.defect_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-0">
                        {defect.vehicle?.fleet_number} : {defect.vehicle?.registration_number || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{defect.defect_category || "-"}</td>
                      <td className="px-4 py-3">{getDefectStatusBadge(defect.defect_status)}</td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-0">
                        {defect.workshop_job ? (
                          <Link href={`/workshop/jobWorkShop/${defect.workshop_job_id}`} className="text-blue-600 hover:underline">
                            {defect.workshop_job.jobid_workshop}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {defect.logged_at ? new Date(defect.logged_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {defect.inspection_id && (
                          <Link href={`/fleetManager/inspections/${defect.inspection_id}`}>
                            <button
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="View Inspection"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredDefects.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        No defects found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ==================== ADD DEFECT TAB ==================== */}
          <TabsContent value="add-defect" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Log New Defect</h3>
              <p className="text-sm text-gray-500">Manually add a defect for a vehicle. Vehicle is required, driver is optional.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Defect Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Defect Name *</Label>
                    <Input
                      placeholder="e.g. Worn brake pads"
                      value={defectForm.defect_name}
                      onChange={(e) => setDefectForm({ ...defectForm, defect_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={defectForm.defect_category}
                      onValueChange={(val) => setDefectForm({ ...defectForm, defect_category: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mechanical">Mechanical</SelectItem>
                        <SelectItem value="Electrical">Electrical</SelectItem>
                        <SelectItem value="Body">Body</SelectItem>
                        <SelectItem value="Tyre">Tyre</SelectItem>
                        <SelectItem value="Brake">Brake</SelectItem>
                        <SelectItem value="Engine">Engine</SelectItem>
                        <SelectItem value="Transmission">Transmission</SelectItem>
                        <SelectItem value="Suspension">Suspension</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={defectForm.priority}
                      onValueChange={(val) => setDefectForm({ ...defectForm, priority: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the defect..."
                      value={defectForm.defect_description}
                      onChange={(e) => setDefectForm({ ...defectForm, defect_description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Vehicle & Driver</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Vehicle *</Label>
                    <Select
                      value={defectForm.vehicle_id}
                      onValueChange={(val) => setDefectForm({ ...defectForm, vehicle_id: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.registration_number} – {v.make} {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Driver (optional)</Label>
                    <Select
                      value={defectForm.driver_id}
                      onValueChange={(val) => setDefectForm({ ...defectForm, driver_id: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {driversList.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.first_name} {d.surname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Additional notes..."
                      value={defectForm.notes}
                      onChange={(e) => setDefectForm({ ...defectForm, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleAddDefect}
                    disabled={isSubmittingDefect}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isSubmittingDefect ? "Adding..." : "Add Defect"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
