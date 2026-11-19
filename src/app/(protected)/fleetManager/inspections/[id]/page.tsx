"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import { printInspectionDetails } from "@/hooks/printPDF";
import getExt from "@/hooks/timeHook";

type FleetJobRef = {
  id: number;
  job_id: string | null;
  status: string | null;
};

function getFaultyLabels(checklist: any[]): string[] {
  if (!Array.isArray(checklist)) return [];
  return checklist.flatMap((section: any) =>
    (section.items || [])
      .filter((item: any) => item.status === "Faulty")
      .map((item: any) => item.label || "Faulty item")
  );
}

function notesMatchInspection(notes: string | null, inspectionId: number) {
  if (!notes) return false;
  try {
    const parsed = JSON.parse(notes);
    return Number(parsed?.inspection_id) === Number(inspectionId);
  } catch {
    return notes.includes(`"inspection_id":${inspectionId}`) ||
      notes.includes(`"inspection_id": ${inspectionId}`);
  }
}

export default function InspectionDetail() {
  const params = useParams();
  const id = params?.id;
  const [inspection, setInspection] = useState<any>(null);
  const [fleetJob, setFleetJob] = useState<FleetJobRef | null>(null);
  const [fleetJobChecked, setFleetJobChecked] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const supabase = createClient();

  const contentRef = useRef<HTMLDivElement>(null);

  const findExistingFleetJob = async (inspectionId: number) => {
    const { data, error } = await supabase
      .from("job_assignments")
      .select("id, job_id, status, notes, service")
      .eq("service", "inspection-fault")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) return null;

    const match = data.find((row: any) =>
      notesMatchInspection(row.notes, inspectionId)
    );
    return match
      ? {
          id: match.id,
          job_id: match.job_id,
          status: match.status,
        }
      : null;
  };

  useEffect(() => {
    const fetchInspection = async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select(
          `
          *,
          vehicle:vehicle_id (*),
          driver:driver_id (*)
        `
        )
        .eq("id", Number(id))
        .single();

      if (!error && data) {
        const existingJob = await findExistingFleetJob(data.id);
        setFleetJob(existingJob);
        setFleetJobChecked(true);

        const inspectionData =
          typeof data === "object" && data !== null
            ? (data as Record<string, any>)
            : {};
        const checklist = inspectionData?.checklist;
        const parsed = {
          ...inspectionData,
          checklist: Array.isArray(checklist) ? checklist : [],
        };
        setInspection(parsed);
      }
    };
    if (id) fetchInspection();
  }, [id]);

  if (!inspection) return <div className="p-6">Loading inspection...</div>;

  const faultyItems = getFaultyLabels(inspection.checklist || []);
  const hasFaults =
    inspection.overall_status === "Faulty" || faultyItems.length > 0;

  const handleCreateJob = async () => {
    if (!inspection || creatingJob) return;
    setCreatingJob(true);
    try {
      const existing = await findExistingFleetJob(inspection.id);
      if (existing) {
        setFleetJob(existing);
        return;
      }

      const year = new Date().getFullYear();
      const jobId = `INSP-${year}-${String(inspection.id).padStart(4, "0")}`;
      const faultSummary =
        faultyItems.length > 0 ? faultyItems.join(", ") : "Faulty inspection";

      const { data: jobData, error: jobError } = await supabase
        .from("job_assignments")
        .insert({
          job_id: jobId,
          description: `Inspection #${inspection.id} faults: ${faultSummary}`,
          status: "Breakdown Request",
          priority: "medium",
          breakdown_req: true,
          inspected: true,
          service: "inspection-fault",
          vehicle_id: inspection.vehicle_id,
          driver_id: inspection.driver_id,
          location: inspection.location || "",
          client_type: "internal",
          client_name: inspection.driver
            ? `${inspection.driver.first_name || ""} ${inspection.driver.surname || ""}`.trim()
            : null,
          notes: JSON.stringify({ inspection_id: inspection.id }),
        })
        .select("id, job_id, status")
        .single();

      if (jobError) {
        alert("Failed to create job: " + jobError.message);
        return;
      }

      const { count: existingDefects } = await supabase
        .from("defects")
        .select("id", { count: "exact", head: true })
        .eq("inspection_id", inspection.id);

      if (!existingDefects || existingDefects === 0) {
        const defectiveItems = (inspection.checklist || []).flatMap(
          (section: any) =>
            (section.items || [])
              .filter((item: any) => item.status === "Faulty")
              .map((item: any) => ({
                inspection_id: inspection.id,
                vehicle_id: inspection.vehicle_id,
                driver_id: inspection.driver_id,
                defect_name: item.label || "Faulty item",
                defect_category: item.category || null,
                defect_description: `${item.label || "Faulty item"} - flagged as Faulty during Inspection #${inspection.id}`,
                defect_status: "Logged",
                priority: "medium",
                logged_at: new Date().toISOString(),
              }))
        );

        if (defectiveItems.length > 0) {
          const { error: defectError } = await supabase
            .from("defects")
            .insert(defectiveItems);
          if (defectError) {
            console.error("Failed to create defect records:", defectError);
            alert(
              `Job created but failed to log defects: ${defectError.message}`
            );
          }
        }
      }

      setFleetJob({
        id: jobData.id,
        job_id: jobData.job_id,
        status: jobData.status,
      });
    } catch (err) {
      console.error("Failed to create job from inspection:", err);
      alert("Failed to create job from inspection");
    } finally {
      setCreatingJob(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!contentRef.current) return;
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });
    doc.html(contentRef.current, {
      callback: function (doc) {
        doc.save(`Inspection_${inspection.id}.pdf`);
      },
      margin: [20, 20, 20, 20],
      autoPaging: "text",
      x: 0,
      y: 0,
      html2canvas: { scale: 0.6 }, // to improve quality
    });
  };

  // Print current contentRef as a new window
  const printContent = (htmlContent?: string) => {
    if (htmlContent) {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } else if (contentRef.current) {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-pink-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <Button
          variant="link"
          className="text-indigo-600 hover:underline"
          onClick={() => window.history.back()}
        >
          &larr; Back to Inspections
        </Button>

        <Button
          onClick={() => printInspectionDetails(inspection)}
          className="mb-6 bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Download PDF
        </Button>

        {hasFaults && fleetJob && (
          <p className="mb-6 ml-2 text-sm text-emerald-800">
            Job {fleetJob.job_id || `#${fleetJob.id}`} is on the Job List
            {fleetJob.status ? ` (${fleetJob.status})` : ""}.{" "}
            <Link
              href={`/jobsFleet/${fleetJob.id}`}
              className="underline font-medium text-indigo-700"
            >
              Open job
            </Link>
          </p>
        )}
        {hasFaults && fleetJobChecked && !fleetJob && (
          <Button
            onClick={handleCreateJob}
            disabled={creatingJob}
            className="mb-6 ml-2 bg-red-600 text-white hover:bg-red-700"
          >
            {creatingJob ? "Creating job..." : "Create Job from Inspection"}
          </Button>
        )}

        <div ref={contentRef}>
          <h1 className="text-4xl font-extrabold text-gray-800 text-center drop-shadow-sm">
            Inspection #{inspection.id}
          </h1>

          {/* Vehicle Info */}
          <Card className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-indigo-700">
                Vehicle Info
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6 text-sm text-gray-700">
              <div>
                <strong>Registration:</strong> {inspection.vehicle.fleet_number}{" "}
                : {inspection.vehicle?.registration_number}
              </div>
              <div>
                <strong>Make/Model:</strong> {inspection.vehicle?.make}{" "}
                {inspection.vehicle?.model}
              </div>
              <div>
                <strong>VIN:</strong> {inspection.vehicle?.vin_number}
              </div>
              <div>
                <strong>Engine No:</strong> {inspection.vehicle?.engine_number}
              </div>
              <div>
                <strong>Colour:</strong> {inspection.vehicle?.colour}
              </div>
              <div>
                <strong>Year:</strong> {inspection.vehicle?.manufactured_year}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl mb-3 mt-3">
            <CardContent>
              <div className="mt-3 text-sm text-gray-600 mb-3">
                <strong>Location:</strong> {inspection.location}
              </div>
            </CardContent>
          </Card>

          {/* Driver Info */}
          <Card className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl mb-3 mt-3">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-indigo-700">
                Driver Info
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6 text-sm text-gray-700">
              <div>
                <strong>Name:</strong>{" "}
                {inspection.driver
                  ? `${inspection.driver.first_name} ${inspection.driver.surname}`
                  : "N/A"}
              </div>
              <div>
                <strong>License No:</strong> {inspection.driver?.license_number}
              </div>
              <div>
                <strong>License Expiry:</strong>{" "}
                {inspection.driver?.license_expiry_date}
              </div>
              <div>
                <strong>Cell:</strong> {inspection.driver?.cell_number}
              </div>
            </CardContent>
          </Card>

          {/* Inspection Details */}
          <Card className="bg-white/90 backdrop-blur-md shadow-xl rounded-2xl mb-3 mt-3">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-indigo-700">
                Inspection Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-gray-700">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <strong>Odometer:</strong> {inspection.odo_reading}
                </div>
                <div>
                  <strong>Status:</strong>
                  <span
                    className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${
                      inspection.overall_status === "Faulty"
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {inspection.overall_status}
                  </span>
                </div>
                <div>
                  <strong>Category:</strong> {inspection.category}
                </div>
                <div>
                  <strong>Date:</strong>{" "}
                  {new Date(inspection.inspection_date).toLocaleString()}
                </div>

                <div>
                  <strong>Time Taken:</strong>{" "}
                  <p>{inspection.timing?.duration_seconds || null} seconds</p>
                  <p>{getExt(inspection.timing?.duration_seconds || null)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-indigo-600 mb-3">
                  Checklist
                </h3>
                {Array.isArray(inspection.checklist) &&
                inspection.checklist.length > 0 ? (
                  inspection.checklist.map((section: any, sIdx: number) => (
                    <div key={sIdx} className="mb-6">
                      <h4 className="text-md font-medium text-gray-800 border-b border-gray-200 pb-1 mb-2">
                        {section.title}
                      </h4>
                      <ul className="list-disc list-inside space-y-2">
                        {section.items.map((item: any, iIdx: number) => (
                          <li key={iIdx} className="flex justify-between">
                            <span>
                              {item.label}{" "}
                              <span className="text-gray-500">
                                (Cat {item.category})
                              </span>
                            </span>
                            <span
                              className={
                                item.status === "Faulty"
                                  ? "text-red-600 font-semibold"
                                  : "text-green-600 font-semibold"
                              }
                            >
                              {item.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">
                    No checklist data available.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
