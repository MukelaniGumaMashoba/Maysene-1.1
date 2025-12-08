'use client'

import { useState, useEffect } from 'react'
import { FuelGauge } from '@/components/ui/fuel-gauge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Fuel } from 'lucide-react'
import { formatForDisplay } from '@/lib/utils/date-formatter'

interface FuelData {
  vehicleId: string
  registrationNumber: string
  fuelLevel: number
  fuelCapacity: number
  timestamp: string
}

interface Props {
  vehiclePlate?: string
}

export default function FuelCanBusDisplay({ vehiclePlate }: Props) {
  const [vehicles, setVehicles] = useState<FuelData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/fuel')
      if (!response.ok) throw new Error('Failed to fetch fuel data')
      const result = await response.json()
      if (result.error) throw new Error(result.error)
      setVehicles(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [])

  // Convert CAN bus fuel data to fuel gauge format
  const getFuelGaugeData = () => {
    const filteredVehicles = vehiclePlate 
      ? vehicles.filter(v => v.registrationNumber?.toLowerCase() === vehiclePlate.toLowerCase())
      : vehicles
      
    return filteredVehicles.map((vehicle) => {
      const fuelPercentage = vehicle.fuelLevel || 0
      const fuelCapacity = vehicle.fuelCapacity || 100
      const currentFuel = (fuelPercentage / 100) * fuelCapacity

      return {
        id: vehicle.registrationNumber || vehicle.vehicleId,
        location: vehicle.registrationNumber || 'Unknown Plate',
        fuelLevel: Math.max(0, Math.min(100, fuelPercentage)),
        temperature: 25, // Default temperature
        volume: Math.max(0, currentFuel),
        remaining: `${currentFuel.toFixed(1)}L / ${fuelCapacity.toFixed(1)}L`,
        status: 'Active',
        lastUpdated: formatForDisplay(vehicle.timestamp),
        updated_at: vehicle.timestamp
      }
    })
  }



  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-gray-600">Loading fuel data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 text-red-500 text-6xl">⚠️</div>
          <p className="mb-4 text-red-600">Error loading fuel data</p>
          <p className="mb-4 text-gray-600">{error}</p>
          <Button onClick={fetchVehicles} variant="outline">
            <RefreshCw className="mr-2 w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 h-full">
      <div className="p-4">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Fuel CAN Bus Monitor</h2>
          <Button onClick={fetchVehicles} variant="outline" size="sm">
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </Button>
        </div>
        
        {vehicles.length > 0 ? (
          <div className="gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 xl:grid-cols-5">
            {getFuelGaugeData().map((data) => (
              <FuelGauge
                key={data.id}
                id={data.id}
                location={data.location}
                fuelLevel={data.fuelLevel}
                temperature={data.temperature}
                volume={data.volume}
                remaining={data.remaining}
                status={data.status}
                lastUpdated={data.lastUpdated}
                updated_at={data.updated_at}

                className="hover:scale-105 transition-transform duration-200 transform"
              />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <Fuel className="mx-auto mb-4 w-16 h-16 text-gray-400" />
              <p className="text-gray-500 text-lg">No fuel data available</p>
              <p className="text-gray-400 text-sm">Check your connection to the CAN bus server</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}