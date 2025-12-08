"use client"

import React from 'react';
    import { useRouter } from 'next/navigation';
    
interface NavigationButtonsProps {
  vehicleId: number;
  driverId: number;
}

export default function NavigationButtons({ vehicleId, driverId }: NavigationButtonsProps) {
  const router = useRouter();

  return (
    <div className="flex gap-4 p-4">
      <button
        onClick={() => router.push(`/vehicles/${vehicleId}/history`)}
        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none"
      >
        Go to Vehicle History
      </button>

      <button
        onClick={() => router.push(`/drivers/${driverId}/history`)}
        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none"
      >
        Go to Driver History
      </button>
    </div>
  );
}
