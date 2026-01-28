"use client";

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useGlobalContext } from "@/context/global-context/context";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import StopPointForm from "../../../../components/forms/stop-point-form";
import { createClient } from "@/lib/supabase/client";
  
export default function StopPointsPage() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stopPoints, setStopPoints] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchStopPoints = async () => {
      const { data, error } = (await supabase.from("stop_points").select("*").order("created_at", { ascending: false }));
      if (error) {
        console.error("Error fetching stop points:", error);
      } else {
        setStopPoints(data as any);
        console.log("Stop points fetched successfully:", data);
      }
    };
    fetchStopPoints();
  }, []);

  // Calculate stats from actual data
  const totalStopPoints = stopPoints.length;
  const warehouses = stopPoints.filter((sp: any) => sp.type === 'warehouse').length;
  const distributionCenters = stopPoints.filter((sp: any) => sp.type === 'distribution').length;
  const hubs = stopPoints.filter((sp: any) => sp.type === 'hub').length;

  const screenStats = [
    { title: "Total Stop Points", value: totalStopPoints, icon: "📍" },
    { title: "Warehouses", value: warehouses, icon: "🏭" },
    { title: "Distribution Centers", value: distributionCenters, icon: "🏢" },
    { title: "Hubs", value: hubs, icon: "🔄" },
  ];

  // Define columns
  const columns = () => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }: any) => row.original.name || "-",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: any) => {
        const type = row.original.type;
        const typeColors: { [key: string]: string } = {
          warehouse: "bg-blue-100 text-blue-800",
          distribution: "bg-green-100 text-green-800",
          hub: "bg-purple-100 text-purple-800",
          loading: "bg-orange-100 text-orange-800",
          transit: "bg-amber-100 text-amber-800",
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[type] || "bg-gray-100 text-gray-800"}`}>
            {type || "Unknown"}
          </span>
        );
      },
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }: any) => row.original.address || "-",
    },
    {
      accessorKey: "contact_person",
      header: "Contact Person",
      cell: ({ row }: any) => row.original.contact_person || "-",
    },
    {
      accessorKey: "contact_phone",
      header: "Contact Phone",
      cell: ({ row }: any) => row.original.contact_phone || "-",
    },
  ];
  
  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
  };

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Title Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Stop Points</h1>
          <p className="text-gray-500">Manage locations for pick-up, delivery, and stops</p>
        </div>
        <button
          onClick={() => setOpen(true)}
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

      {/* Data Table */}
      <div className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">All Stop Points</h3>
            <p className="text-sm text-gray-500">View and manage all your stop points</p>
          </div>
          <DataTable
            columns={columns()}
            data={stopPoints || []}
            filterColumn={[]}
            filterPlaceholder={""}
            csv_headers={[]}
            csv_rows={[]}
            href="/fleetManager/stop-points"
            downloadCSV={[]}
          />
        </div>
      </div>

      {/* Stop Point Form Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto min-w-2/4">
          <StopPointForm onCancel={handleClose} id={editingId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
