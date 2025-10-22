'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Plus, Trash2 } from 'lucide-react'

export function StopPointsSection({
  formData,
  stopPoints,
  handleStopPointSelection,
  handleWaypointChange,
  addWaypoint,
  removeWaypoint,
}) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredStopPoints = stopPoints.filter(point =>
    point.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    point.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStopPointBadge = (type) => {
    const colors = {
      warehouse: 'bg-blue-100 text-blue-800',
      distribution: 'bg-green-100 text-green-800',
      truck_stop: 'bg-amber-100 text-amber-800',
      client: 'bg-purple-100 text-purple-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Available Stop Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Available Stop Points
          </CardTitle>
          <CardDescription>
            Select stop points to add as waypoints to this trip
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="stopPointSearch">Search Stop Points</Label>
              <Input
                id="stopPointSearch"
                placeholder="Search by name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid gap-3 max-h-60 overflow-y-auto">
              {filteredStopPoints.map((stopPoint) => {
                const isSelected = formData.selectedStopPoints.some(
                  (selected) => selected.id === stopPoint.id
                )
                
                return (
                  <div
                    key={stopPoint.id}
                    className={`flex items-start space-x-3 p-3 border rounded-lg ${
                      isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      id={`stop-${stopPoint.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleStopPointSelection(stopPoint.id, checked)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Label
                          htmlFor={`stop-${stopPoint.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {stopPoint.name}
                        </Label>
                        <Badge className={getStopPointBadge(stopPoint.type)}>
                          {stopPoint.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {stopPoint.address}
                      </p>
                      {stopPoint.contactPerson && (
                        <p className="text-xs text-gray-500">
                          Contact: {stopPoint.contactPerson}
                          {stopPoint.contactPhone && ` (${stopPoint.contactPhone})`}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Waypoints */}
      {formData.waypoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Trip Waypoints
            </CardTitle>
            <CardDescription>
              Configure timing and notes for selected stop points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.waypoints.map((waypoint, index) => (
                <div key={waypoint.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{waypoint.location}</h4>
                      <p className="text-sm text-gray-600">{waypoint.address}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeWaypoint(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`arrival-${index}`}>Arrival Time</Label>
                      <Input
                        id={`arrival-${index}`}
                        type="datetime-local"
                        value={waypoint.arrivalTime}
                        onChange={(e) =>
                          handleWaypointChange(index, 'arrivalTime', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`departure-${index}`}>Departure Time</Label>
                      <Input
                        id={`departure-${index}`}
                        type="datetime-local"
                        value={waypoint.departureTime}
                        onChange={(e) =>
                          handleWaypointChange(index, 'departureTime', e.target.value)
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label htmlFor={`notes-${index}`}>Notes</Label>
                    <Textarea
                      id={`notes-${index}`}
                      placeholder="Special instructions for this stop..."
                      value={waypoint.notes}
                      onChange={(e) =>
                        handleWaypointChange(index, 'notes', e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}