"use client";

import React, { useEffect, useState } from "react";
import { Plus, Pencil, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import StopPointForm from "../../../../components/forms/stop-point-form";
import { createClient } from "@/lib/supabase/client";

export default function StopPointsPage() {
  const [open, setOpen] = useState(false);
  const [editingStopPoint, setEditingStopPoint] = useState<any>(null);
  const [stopPoints, setStopPoints] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchStopPoints();
  }, []);

  const fetchStopPoints = async () => {
    const { data, error } = await supabase
      .from("stop_points")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching stop points:", error);
    } else {
      setStopPoints(data || []);
    }
  };

  const filteredStopPoints = stopPoints.filter((sp: any) =>
    sp.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStopPoints = stopPoints.length;
  const warehouses = stopPoints.filter((sp: any) => sp.type === "warehouse").length;
  const distributionCenters = stopPoints.filter((sp: any) => sp.type === "distribution").length;
  const hubs = stopPoints.filter((sp: any) => sp.type === "hub").length;

  const screenStats = [
    { title: "Total Stop Points", value: totalStopPoints, icon: "📍" },
    { title: "Warehouses", value: warehouses, icon: "🏭" },
    { title: "Distribution Centers", value: distributionCenters, icon: "🏢" },
    { title: "Hubs", value: hubs, icon: "🔄" },
  ];

  const handleEdit = (stopPoint: any) => {
    setEditingStopPoint(stopPoint);
    setOpen(true);
  };

  const handleRowClick = (stopPoint: any) => {
    setEditingStopPoint(stopPoint);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingStopPoint(null);
    fetchStopPoints();
  };

  const getTypeBadge = (type: string) => {
    const typeColors: { [key: string]: string } = {
      warehouse: "bg-blue-100 text-blue-800",
      distribution: "bg-green-100 text-green-800",
      hub: "bg-purple-100 text-purple-800",
      loading: "bg-orange-100 text-orange-800",
      transit: "bg-amber-100 text-amber-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          typeColors[type] || "bg-gray-100 text-gray-800"
        }`}
      >
        {type || "Unknown"}
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Title Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Stop Points</h1>
          <p className="text-gray-500">Manage locations for pick-up, delivery, and stops</p>
        </div>
        <button
          onClick={() => {
            setEditingStopPoint(null);
            setOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Stop Point
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {screenStats.map((stat, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4"
          >
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
          <h3 className="text-lg font-semibold text-gray-900">All Stop Points</h3>
          <p className="text-sm text-gray-500">View and manage all your stop points</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
          />
        </div>
      </div>

      {/* Striped Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm text-left table-auto">
          <thead className="text-xs uppercase bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3 font-semibold w-[20%]">Name</th>
              <th className="px-4 py-3 font-semibold w-[12%]">Type</th>
              <th className="px-4 py-3 font-semibold w-[30%]">Address</th>
              <th className="px-4 py-3 font-semibold w-[15%]">Contact</th>
              <th className="px-4 py-3 font-semibold w-[13%]">Phone</th>
              <th className="px-4 py-3 font-semibold text-center w-[10%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStopPoints.map((stopPoint: any, index: number) => (
              <tr
                key={stopPoint.id}
                className={`border-b cursor-pointer transition-colors hover:bg-blue-50 ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
                onClick={() => handleRowClick(stopPoint)}
              >
                <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-0" title={stopPoint.name}>
                  {stopPoint.name || "-"}
                </td>
                <td className="px-4 py-3">{getTypeBadge(stopPoint.type)}</td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-0" title={stopPoint.address}>
                  {stopPoint.address || "-"}
                </td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-0">{stopPoint.contact_person || "-"}</td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-0">{stopPoint.contact_phone || "-"}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(stopPoint);
                    }}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Edit Stop Point"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredStopPoints.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No stop points found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Stop Point Form Modal - Radix UI Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[80vw] !max-w-[80vw] !h-[80vh] !max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingStopPoint ? "Edit Stop Point" : "Add Stop Point"}
            </DialogTitle>
            <DialogDescription>
              {editingStopPoint
                ? `Editing ${editingStopPoint.name || "stop point"}`
                : "Enter the details for the new stop point"}
            </DialogDescription>
          </DialogHeader>
          <StopPointForm
            onCancel={handleClose}
            id={editingStopPoint?.id}
            stopPointData={editingStopPoint}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
