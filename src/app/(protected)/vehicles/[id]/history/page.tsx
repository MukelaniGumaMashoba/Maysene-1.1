"use client";

import VehicleHistory from '@/components/dashboard/vehicleHistory';

interface PageProps {
  params: { id: string };
}

export default function VehicleHistoryPage({ params }: PageProps) {
  const vehicleId = Number(params.id);

  if (isNaN(vehicleId)) {
    return <div>Invalid vehicle ID</div>;
  }

  return <VehicleHistory vehicleId={vehicleId} />;
}
