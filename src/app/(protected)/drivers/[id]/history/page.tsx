"use client";

import DriverVehicleHistory from '@/components/dashboard/driverHistory';

// Define the expected params type
interface PageProps {
  params: { id: string };
}

export default function DriverVehicleHistoryPage({ params }: PageProps) {
  // Parse id string param to number
  const driverId = Number(params.id);

  if (isNaN(driverId)) {
    return <div>Invalid driver ID</div>;
  }

  // Render your existing client DriverVehicleHistory component with prop
  return <DriverVehicleHistory driverId={driverId} />;
}
