"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Driver,
  Vehicle,
  JobAssignment,
} from "@/components/dashboard/types";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeftIcon } from "lucide-react";

interface DriverVehicleHistoryProps {
  driverId: number;
}

export default function DriverVehicleHistory({
  driverId,
}: DriverVehicleHistoryProps) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobHistory, setJobHistory] = useState<JobAssignment[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .single();
      if (driverError) {
        console.error("Error fetching driver:", driverError.message);
      } else {
        setDriver(driverData as any);
      }

      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehiclesc")
        .select("*")
        .eq("driver_id", driverId);
      if (vehicleError) {
        console.error("Error fetching vehicles:", vehicleError.message);
      } else if (vehicleData) {
        setVehicles(vehicleData);
      }

      const { data: jobData, error: jobError } = await supabase
        .from("job_assignments")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });
      if (jobError) {
        console.error("Error fetching jobs:", jobError.message);
      } else if (jobData) {
        setJobHistory(jobData as any);
      }
    }
    fetchData();
  }, [driverId]);

  if (!driver)
    return <div className="p-6 text-center">Loading driver data...</div>;

  return (
    <div className="mx-auto p-6 bg-white rounded-md shadow-md">
              <div>
                <div>
                  <ArrowLeftIcon
                    className="h-6 w-6 text-indigo-600 cursor-pointer mb-4"
                    onClick={() => router.back()}
                  />
                  <h1 className="text-3xl font-semibold mb-6 text-indigo-700">
                    {driver.first_name}'s Vehicle & Issue History
                  </h1>
                </div>
              </div>


      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Vehicles Assigned</h2>
        {vehicles.length === 0 ? (
          <p className="text-gray-500">No vehicles assigned to this driver.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {vehicles.map((v) => (
              <li
                key={v.id}
                className="p-4 border rounded-md shadow-sm hover:shadow-md transition-shadow bg-gray-50 flex flex-col"
              >
                <div className="mb-2 font-semibold text-indigo-600">
                  {v.registration_number}
                </div>
                <div className="text-gray-700 mb-3">
                  {v.make} {v.model} ({v.manufactured_year || "-"})
                </div>
                <button
                  className="mt-auto bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-800 focus:outline-none"
                  onClick={() => router.push(`/vehicles/${v.id}/history`)}
                >
                  View History
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Reported Issues</h2>
        {jobHistory.length === 0 ? (
          <p className="text-gray-500">No reported issues for this driver.</p>
        ) : (
          <ul className="space-y-4 max-h-96 overflow-auto border rounded-md p-4 bg-gray-50">
            {jobHistory.map((job) => (
              <li
                key={job.id}
                className="p-3 border rounded-md bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-indigo-600">
                      {job.created_at?.slice(0, 10)} - {job.job_id}
                    </div>
                    <div className="text-gray-700">{job.description}</div>
                  </div>
                  <div
                    className={`py-1 px-3 rounded-full text-sm font-semibold 
                    ${
                      job.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {job.status}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
