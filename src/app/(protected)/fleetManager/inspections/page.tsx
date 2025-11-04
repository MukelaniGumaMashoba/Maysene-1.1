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
};


export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dateRange, setDateRange] = useState<string>("all"); // all, today, 7days, thisWeek, custom
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
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
    fetchInspections();
  }, []);

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
    const day = (dt.getDay() + 6) % 7; // make Monday=0
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
      start = startOfDay(new Date(now.getTime() - 6 * 24 * 3600 * 1000)); // last 7 days including today
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
      // status filter
      if (statusFilter !== "All") {
        if (statusFilter === "Unknown") {
          if (insp.overall_status !== null) return false;
        } else {
          if (insp.overall_status !== statusFilter) return false;
        }
      }

      // date filter
      if (start || end) {
        const inspDate = new Date(insp.inspection_date);
        if (start && inspDate < start) return false;
        if (end && inspDate > end) return false;
      }

      return true;
    });
  }, [inspections, statusFilter, dateRange, customStart, customEnd]);

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-5xl space-y-4">
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
            <label className="text-sm font-medium text-gray-700">
              Date Range
            </label>
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
                <input
                  type="date"
                  className="px-2 py-1 rounded border bg-white text-sm"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="date"
                  className="px-2 py-1 rounded border bg-white text-sm"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
                <Button
                  onClick={() => {
                    // if user clears custom, set to all
                    if (!customStart && !customEnd) setDateRange("all");
                  }}
                  variant="ghost"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="text-sm text-gray-500">
              Showing {filteredInspections.length} of {inspections.length}
            </div>
            <Button
              onClick={() => {
                setStatusFilter("All");
                setDateRange("all");
                setCustomStart("");
                setCustomEnd("");
              }}
              variant="destructive"
              className="bg-red-600 text-white"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-2 border border-gray-300 rounded-md p-4 bg-gray-50">
          <h2 className="text-md font-semibold text-gray-700 mb-2">
            Inspection Status Legend
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              <span className="text-gray-700">
                Faulty Inspection – Needs Attention
              </span>
            </li>
            <li className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              <span className="text-gray-700">
                Passed Inspection – No Issues Found
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex-shrink-0 space-y-2">
        <Button
          onClick={() => setTemplatesOpen(true)}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
        >
          Manage Templates
        </Button>
      </div>

      {/* Inspections list */}
      {filteredInspections.map((insp) => {
        const isFaulty = insp.overall_status === "Faulty";

        return (
          <Card
            key={insp.id}
            className={`transition transform hover:scale-[1.01] shadow-lg rounded-2xl border
          ${
            isFaulty
              ? "bg-gradient-to-r from-red-600 via-red-500 to-red-400 text-white"
              : "bg-gradient-to-r from-green-600 via-green-500 to-green-400 text-white"
          }
        `}
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-lg font-semibold">
                <span className="tracking-wide">
                  {insp.vehicle?.fleet_number} : {insp.vehicle?.registration_number} – {insp.vehicle?.make}{" "}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs uppercase shadow-sm
                ${
                  isFaulty
                    ? "bg-white/20 text-white border border-white/30"
                    : "bg-white/20 text-white border border-white/30"
                }
              `}
                >
                  {insp.overall_status ?? "Unknown"} : Location : {insp.location}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <strong>Driver:</strong>{" "}
                  {insp.driver
                    ? `${insp.driver.first_name} ${insp.driver.surname}`
                    : "N/A"}
                </div>
                <div>
                  <strong>Odometer:</strong> {insp.odo_reading}
                </div>
                <div>
                  <strong>Category:</strong> {insp.category ?? "N/A"}
                </div>
                <div>
                  <strong>Date:</strong>{" "}
                  {new Date(insp.inspection_date).toLocaleDateString()}
                </div>
              </div>

              {/* Accordion */}
              <Accordion type="single" collapsible>
                <AccordionItem value={`insp-${insp.id}`}>
                  <AccordionTrigger className="text-white hover:text-gray-100 rounded-3xl px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30">
                    Preview Checklist
                  </AccordionTrigger>
                  <AccordionContent className="bg-white/10 rounded-lg p-4">
                    {Array.isArray(insp.checklist) &&
                    insp.checklist.length > 0 ? (
                      insp.checklist.slice(0, 1).map((section, sIdx) => (
                        <div
                          key={sIdx}
                          className="mb-4 bg-white p-3 rounded text-black"
                        >
                          <h3 className="font-medium text-blue-700 mb-2">
                            {section.title}
                          </h3>
                          <ul className="list-disc list-inside space-y-1">
                            {section.items.map((item, iIdx) => (
                              <li
                                key={iIdx}
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  {item.label}{" "}
                                  <span className="text-gray-500">
                                    (Category : {item.category})
                                  </span>
                                </span>
                                <span
                                  className={
                                    item.status === "Faulty"
                                      ? "text-red-500 font-semibold"
                                      : "text-green-500 font-semibold"
                                  }
                                >
                                  {item.status ?? "N/A"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-200 italic">
                        No checklist data available.
                      </p>
                    )}

                    <Link href={`/fleetManager/inspections/${insp.id}`}>
                      <Button
                        variant="secondary"
                        className="mt-3 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                      >
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

      {/* Modal for Templates */}
      {templatesOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setTemplatesOpen(false)}
          />
          <div className="relative z-10 w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Inspection Templates</h2>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setTemplatesOpen(false);
                  }}
                  className="bg-gray-100 text-gray-800"
                >
                  Close
                </Button>
              </div>
            </div>

            <div className="p-4">
              {/* You can style the wrapper or pass props to the component if needed.
                  Here we just render it inside a nicely padded modal. */}
              <div className="bg-gray-50 p-4 rounded-md border">
                <InspectionTemplatesPage />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
