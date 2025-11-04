"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Vehicle, JobAssignment } from "@/components/dashboard/types";
import { createClient } from "@/lib/supabase/client";
import { LocateIcon } from "lucide-react";

interface VehicleHistoryProps {
  vehicleId: number;
}

export default function VehicleHistory({ vehicleId }: VehicleHistoryProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [jobs, setJobs] = useState<JobAssignment[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehiclesc")
        .select("*")
        .eq("id", vehicleId)
        .single();
      if (vehicleError) {
        console.error("Error fetching vehicle:", vehicleError.message);
      } else {
        setVehicle(vehicleData);
      }

      const { data: jobData, error: jobError } = await supabase
        .from("job_assignments")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false });
      if (jobError) {
        console.error("Error fetching jobs:", jobError.message);
      } else if (jobData) {
        setJobs(jobData);
      }
    }
    fetchData();
  }, [vehicleId]);

  const downloadHistory = () => {
    alert("Download feature coming soon!");
  };

  if (!vehicle)
    return <div className="p-6 text-center">Loading vehicle history...</div>;

  return (
    <div className="mx-auto p-6 bg-white rounded-md shadow-md">
      <h1 className="text-3xl font-semibold mb-4 text-indigo-700">
        Vehicle History: {vehicle.fleet_number} : {vehicle.registration_number}
      </h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-700">Vehicle Details</h2>
        <div className="grid grid-cols-2 gap-4 mt-3 text-gray-600">
          <div>
            <strong>Make:</strong> {vehicle.make || "-"}
          </div>
          <div>
            <strong>Model:</strong> {vehicle.model || "-"}
          </div>
          <div>
            <strong>Year:</strong> {vehicle.manufactured_year || "-"}
          </div>
          <div>
            <strong>Fuel Type:</strong> {vehicle.fuel_type || "-"}
          </div>
          <div>
            <strong>Transmission:</strong> {vehicle.transmission_type || "-"}
          </div>
          <div>
            <strong>VIN Number:</strong> {vehicle.vin_number || "-"}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Job Assignments History
        </h2>
        {jobs.length === 0 ? (
          <p className="text-gray-500">
            No job assignments found for this vehicle.
          </p>
        ) : (
          <ul className="space-y-3 max-h-96 overflow-auto border rounded-md p-4 bg-gray-50">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="p-3 border rounded-md bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-indigo-600">
                      {job.created_at?.slice(0, 10)} - {job.job_id}
                    </div>
                    <div className="text-gray-700">{job.description} : <LocateIcon /> {job.location}</div>
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
      </div>

      <div className="flex justify-between">
        {/* <button
          onClick={downloadHistory}
          className="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 focus:outline-none"
        >
          Download History
        </button> */}

        <button
          onClick={() => router.push("/vehicles")}
          className="text-indigo-600 underline hover:text-indigo-800"
        >
          Back to Vehicle List
        </button>
      </div>
    </div>
  );
}
