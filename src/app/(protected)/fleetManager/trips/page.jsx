"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useGlobalContext } from "@/context/global-context/context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import TripForm from "../../../../components/forms/trip-form";
import { createClient } from "@/lib/supabase/client";
import LoadPlanPage from "../../load-plan/page";
// import Dashboard from "@/components/dashboard/trips";

export default function TripsPage() {
  const [open, setOpen] = useState(false);
  const globalContext = useGlobalContext();
  const initialTripsState = globalContext?.initialTripsState || {};
  const vehiclesContext = globalContext?.vehicles?.data || [];
  const [trips, setTrips] = useState([]);
  const supabase = createClient();

  // Helper to parse JSON fields safely
  const parseJsonField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  };

  // Helper to get driver names from vehicle assignments
  const getDriverNames = (trip) => {
    if (!trip) return "";
    const assignments =
      parseJsonField(trip.vehicleAssignments) ||
      parseJsonField(trip.vehicle_assignments) ||
      [];
    return assignments
      .flatMap((va) => (va.drivers ? va.drivers.map((d) => d.name).filter(Boolean) : []))
      .join(", ");
  };

  const getDropOffLocation = (trip) => {
    if (!trip) return "-";
    const dropoff =
      parseJsonField(trip.dropoffLocations) ||
      parseJsonField(trip.dropoff_locations) ||
      [];
    // Map to string like address or location before joining
    return dropoff
      .map(loc => loc.address || loc.location || "")
      .filter(Boolean)
      .join(", ") || "-";
  };

  const getPickupLocation = (trip) => {
    if (!trip) return "-";
    const pickup =
      parseJsonField(trip.pickupLocations) ||
      parseJsonField(trip.pickup_locations) ||
      [];
    // Map to string like address or location before joining
    return pickup
      .map(loc => loc.address || loc.location || "")
      .filter(Boolean)
      .join(", ") || "-";
  };

  // Helper to get vehicle names (make + model) from vehicle assignments
  const getVehicleNames = (trip) => {
    if (!trip) return "";
    const assignments =
      parseJsonField(trip.vehicleAssignments) ||
      parseJsonField(trip.vehicle_assignments) ||
      [];
    return assignments
      .map((va) => {
        if (va.vehicle && va.vehicle.id) {
          const vehicleObj = vehiclesContext.find((v) => String(v.id) === String(va.vehicle.id));
          if (vehicleObj) {
            return `${vehicleObj.make || ""} ${vehicleObj.model || ""}`.trim();
          }
          return va.vehicle.name || "";
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
  };

  // Helper to display cost centre as name if object or JSON string
  const displayCostCentre = (val) => {
    if (!val) return "N/A";
    if (typeof val === "object" && val.name) return val.name;
    try {
      const parsed = typeof val === "string" ? JSON.parse(val) : val;
      if (parsed && parsed.name) return parsed.name;
    } catch { }
    return String(val);
  };

  const [lastFetch, setLastFetch] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  const fetchTrips = React.useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastFetch < CACHE_DURATION && trips.length > 0) {
      return; // Use cached data
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.from('trips').select('*');
      if (error) {
        console.error('Error fetching trips:', error);
      } else {
        const parsedTrips = (data || []).map((trip) => ({
          ...trip,
          vehicleAssignments: parseJsonField(trip.vehicleAssignments) || parseJsonField(trip.vehicle_assignments) || [],
          driversDisplay: getDriverNames(trip),
          vehiclesDisplay: getVehicleNames(trip),
          costCentreDisplay: displayCostCentre(trip.costCentre || trip.cost_centre),
          pickupLocations: getPickupLocation(trip),
          dropoffLocations: getDropOffLocation(trip),
        }));
        setTrips(parsedTrips);
        setLastFetch(now);
      }
    } catch (error) {
      console.error('Unexpected error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  }, [lastFetch, trips.length, supabase]);

  React.useEffect(() => {
    fetchTrips();
    
    // Set up periodic refresh every 2 minutes
    const interval = setInterval(() => {
      fetchTrips(true);
    }, 2 * 60 * 1000);
    
    // Real-time subscription with smart debouncing
    let debounceTimer;
    const channel = supabase
      .channel('trips-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trips' },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            setLastFetch(0); // Force refresh
            fetchTrips(true);
          }, 5000); // 5 second debounce for faster updates
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchTrips, supabase]);

  // Calculate stats from actual data
  const totalTrips = trips.length;
  const activeTrips = trips.filter(trip => trip.status === 'in-progress').length;
  const completedTrips = trips.filter(trip => trip.status === 'completed').length;
  const pendingTrips = trips.filter(trip => trip.status === 'pending').length;

  const screenStats = [
    { title: "Total Trips", value: totalTrips, icon: "📊" },
    { title: "Active Trips", value: activeTrips, icon: "🚛" },
    { title: "Completed", value: completedTrips, icon: "✅" },
    { title: "Pending", value: pendingTrips, icon: "⏳" },
  ];

  const titleSection = { title: "Trips", description: "Manage your trips", button: { text: "Add Trip" } };
  const tableInfo = { tabs: [{ value: "all", title: "All Trips" }]};

  // Define columns without edit functionality
  const tableColumns = [
    {
      accessorKey: "trip_id",
      header: "Trip ID",
      cell: ({ row }) => row.original.trip_id || row.original.id || "-",
    },
    {
      accessorKey: "orderNumber",
      header: "Order Number",
      cell: ({ row }) => row.original.orderNumber || "-",
    },
    {
      accessorKey: "vehiclesDisplay",
      header: "Vehicles",
      cell: ({ row }) => getVehicleNames(row.original) || "-",
    },
    {
      accessorKey: "driversDisplay",
      header: "Drivers",
      cell: ({ row }) => getDriverNames(row.original) || "-",
    },
    {
      accessorKey: "origin",
      header: "Origin",
      cell: ({ row }) => row.original.pickupLocations || "-",
    },
    {
      accessorKey: "destination",
      header: "Destination",
      cell: ({ row }) => row.original.dropoffLocations || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const statusColors = {
          pending: "bg-yellow-100 text-yellow-800",
          "in-progress": "bg-blue-100 text-blue-800",
          completed: "bg-green-100 text-green-800",
          cancelled: "bg-red-100 text-red-800",
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
            {status || "Unknown"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Title Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{titleSection?.title}</h1>
          <p className="text-gray-500">{titleSection?.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchTrips(true)}
            disabled={loading}
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {titleSection?.button?.text}
          </button>
        </div>
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

      {/* Tabs */}
      {tableInfo?.tabs && tableInfo.tabs.length > 0 && (
        <Tabs defaultValue={tableInfo.tabs[0]?.value} className="w-full">
          <TabsList className="bg-blue-50 w-full">
            {tableInfo.tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {tableInfo.tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} />
          ))}
        </Tabs>
      )}

      <div className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">All Trips</h3>
              <p className="text-sm text-gray-500">View and manage all your trips</p>
            </div>
            <button
              onClick={() => fetchTrips(true)}
              disabled={loading}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {loading && trips.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading trips...</div>
          ) : (
            <DataTable
              columns={tableColumns}
              data={trips || []}
              filterColumn={[]}
              csv_headers={[]}
              csv_rows={[]}
              href="/fleetManager/trips"
              downloadCSV={() => { }}
            />
          )}
        </div>
      </div>

      <Tabs value="assigned-drivers">
        <h3 className="text-lg font-semibold">Assigned Drivers</h3>
        <LoadPlanPage />
      </Tabs>

      {/* Trip Form Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto min-w-2/4">
          <div>
            <h2 className="text-lg font-semibold" id="trip-form-title">Trip Form</h2>
            <p className="text-sm text-muted-foreground" id="trip-form-desc">
              Fill in the trip details below.
            </p>
          </div>
          <TripForm onClose={() => setOpen(false)} id={undefined} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
