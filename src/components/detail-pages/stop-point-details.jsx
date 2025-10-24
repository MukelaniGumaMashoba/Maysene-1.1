'use client'

import React, { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import DetailActionBar from '@/components/layout/detail-action-bar'
import DetailCard from '@/components/ui/detail-card'
import DisplayMap from '../map/display-map'
import { Separator } from '@/components/ui/separator'
import { Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const getTypeBadge = (type) => {
  switch (type) {
    case 'warehouse':
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800">
          Warehouse
        </Badge>
      )
    case 'distribution':
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800">
          Distribution
        </Badge>
      )
    case 'hub':
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800">
          Hub
        </Badge>
      )
    case 'loading':
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-800">
          Loading
        </Badge>
      )
    case 'transit':
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-800">
          Transit
        </Badge>
      )
    default:
      return <Badge>{type}</Badge>
  }
}

export default function StopPointDetails({ id }) {
  const [stopPoint, setStopPoint] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchStopPoint = async () => {
      if (!id) return

      const { data, error } = await supabase
        .from('stop_points')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching stop point:', error)
        setStopPoint(null)
      } else {
        setStopPoint(data)
      }
    }

    fetchStopPoint()
  }, [id])


  const stop_point_information = [
    { label: 'ID', value: stopPoint.id },
    { label: 'Name', value: stopPoint.name },
    { label: 'Type', value: getTypeBadge(stopPoint.type) },
    { label: 'Operating Hours', value: stopPoint.operating_hours || 'N/A' },
    { label: 'Capacity', value: stopPoint.capacity || 'N/A' },
    { label: 'Street', value: stopPoint.street || 'N/A' },
    { label: 'City', value: stopPoint.city || 'N/A' },
    { label: 'State', value: stopPoint.state || 'N/A' },
    { label: 'Country', value: stopPoint.country || 'N/A' },
    { label: 'Contact Person', value: stopPoint.contact_person },
    { label: 'Contact Phone', value: stopPoint.contact_phone },
    { label: 'Contact Email', value: stopPoint.contact_email || 'N/A' },
  ]

  return (
    <div className="space-y-6">
      <DetailActionBar id={id} title={stopPoint.name} description={stopPoint.type} />

      <div className="grid gap-6 md:grid-cols-2">
        <DetailCard title="Stop Point Information" description="Detailed information about this location">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stop_point_information.map((info) => (
              <div key={info.label}>
                <dt className="text-sm font-medium text-gray-500">{info.label}</dt>
                <dd className="mt-1 text-sm text-gray-900">{typeof info.value === 'string' ? info.value : info.value}</dd>
              </div>
            ))}
          </dl>

          <Separator className="my-4" />

          <div>
            <label className="text-sm font-medium text-gray-500">Notes</label>
            <p className="mt-1 text-sm text-gray-900">{stopPoint.notes || 'No notes available.'}</p>
          </div>
        </DetailCard>

        <DetailCard title="Location" description="Map view and facilities">
          <div className="space-y-4">
            <div>
              <div className="h-[200px] rounded-lg bg-gray-100 flex items-center justify-center">
                <DisplayMap
                  coords={stopPoint.coords}
                  street={stopPoint.street}
                  city={stopPoint.city}
                  state={stopPoint.state}
                  country={stopPoint.country}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Facilities</h4>
              <div className="flex flex-wrap gap-2">
                {stopPoint.facilities && stopPoint.facilities.length > 0 ? (
                  stopPoint.facilities.map((facility) => (
                    <Badge
                      key={facility}
                      variant="outline"
                      className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200"
                    >
                      {facility}
                    </Badge>
                  ))
                ) : (
                  <span className="text-gray-500">No facilities listed</span>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-5 w-5 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-500">Recent Activity</h4>
              </div>
              {stopPoint?.recentTrips && stopPoint?.recentTrips.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {stopPoint.recentTrips.slice(0, 3).map((trip) => (
                    <div
                      key={trip.id}
                      className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-800"
                    >
                      <div>
                        <p className="font-medium">{trip.id}</p>
                        <p className="text-xs text-gray-500">{trip.date}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          trip.type === 'Pickup'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }
                      >
                        {trip.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent activity</p>
              )}
            </div>
          </div>
        </DetailCard>
      </div>
    </div>
  )
}
