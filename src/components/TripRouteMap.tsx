'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, X } from 'lucide-react'

interface RoutePoint {
  lat: number
  lng: number
  speed: number
  timestamp: number
  datetime: string
}

interface TripRoute {
  trip_id: number
  company: string
  route_points: RoutePoint[]
  created_at: string
  updated_at: string
}

interface Props {
  tripId: string
  onClose: () => void
}

export default function TripRouteMap({ tripId, onClose }: Props) {
  const [routeData, setRouteData] = useState<TripRoute | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTripRoute()
  }, [tripId])

  const fetchTripRoute = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/trip-route?tripId=${tripId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch trip route')
      }
      
      const data = await response.json()
      setRouteData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const generateMapUrl = () => {
    if (!routeData?.route_points?.length) return ''
    
    const points = routeData.route_points
    const center = points[Math.floor(points.length / 2)]
    const markers = points.map(p => `${p.lat},${p.lng}`).join('|')
    
    return `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=12&size=800x400&maptype=roadmap&markers=color:red|${markers}&path=color:0x0000ff|weight:3|${markers}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}`
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trip Route Map</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading trip route...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trip Route Map</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p>Error loading trip route: {error}</p>
            <Button onClick={fetchTripRoute} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Trip Route Map - ID: {routeData?.trip_id}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {routeData?.route_points?.length ? (
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <img 
                src={generateMapUrl()} 
                alt="Trip Route Map" 
                className="w-full h-auto rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className="hidden text-center p-8 bg-gray-200 rounded">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Map visualization unavailable</p>
                <p className="text-sm text-gray-500">Google Maps API key required</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <p className="font-medium text-blue-800">Total Points</p>
                <p className="text-2xl font-bold text-blue-600">{routeData.route_points.length}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="font-medium text-green-800">Start Time</p>
                <p className="text-green-600">{new Date(routeData.created_at).toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <p className="font-medium text-purple-800">End Time</p>
                <p className="text-purple-600">{new Date(routeData.updated_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Time</th>
                    <th className="p-2 text-left">Latitude</th>
                    <th className="p-2 text-left">Longitude</th>
                    <th className="p-2 text-left">Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {routeData.route_points.map((point, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">{new Date(point.datetime).toLocaleTimeString()}</td>
                      <td className="p-2">{point.lat.toFixed(6)}</td>
                      <td className="p-2">{point.lng.toFixed(6)}</td>
                      <td className="p-2">{point.speed} km/h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No route data available for this trip</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}