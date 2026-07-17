'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

import DetailCard from '../ui/detail-card'
import DynamicInput from '../ui/dynamic-input'
import AddressAutocomplete from '../ui/address-autocomplete'
import GeozoneMap from '../ui/geozone-map'
import { createClient } from '@/lib/supabase/client'
import { formatGeozoneCoordinates, parseGeozoneCoordinates } from '@/lib/google-geocoding'

const StopPointForm = ({ onCancel, id, stopPointData }) => {
  const [isloading, setIsloading] = useState(false)
  const [mapCenter, setMapCenter] = useState(null)

  const stopPoint = stopPointData

  const initialCoordinates = stopPoint?.coordinates
    ? parseGeozoneCoordinates(stopPoint.coordinates)
    : []

  const [formData, setFormData] = useState({
    id: stopPoint?.id || '',
    name: stopPoint?.name || '',
    type: stopPoint?.type || 'warehouse',
    address: stopPoint?.address || '',
    street: stopPoint?.street || '',
    city: stopPoint?.city || '',
    state: stopPoint?.state || '',
    country: stopPoint?.country || '',
    coords: stopPoint?.coords || '',
    coordinates: stopPoint?.coordinates || '',
    contactPerson: stopPoint?.contact_person || '',
    contactPhone: stopPoint?.contact_phone || '',
    contactEmail: stopPoint?.contact_email || '',
    operatingHours: stopPoint?.operating_hours || '',
    capacity: stopPoint?.capacity || '',
    notes: stopPoint?.notes || '',
    facilities: stopPoint?.facilities || [],
    fullAddress: stopPoint?.address || '',
  })

  const [polygonPoints, setPolygonPoints] = useState(initialCoordinates)

  useEffect(() => {
    const formattedCoords = formatGeozoneCoordinates(polygonPoints)
    setFormData((prev) => ({ ...prev, coordinates: formattedCoords }))
  }, [polygonPoints])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAddressSelect = (components) => {
    setFormData((prev) => ({
      ...prev,
      street: components.street || prev.street,
      city: components.city || prev.city,
      state: components.state || prev.state,
      country: components.country || prev.country,
      fullAddress: components.formatted_address || prev.fullAddress,
      address: components.formatted_address || prev.address,
    }))
  }

  const handleCoordinatesChange = (coords) => {
    setFormData((prev) => ({
      ...prev,
      coords,
    }))
    if (coords?.lat && coords?.lng) {
      setMapCenter(coords)
    }
  }

  const onSubmit = async (data) => {
    const completeData = {
      ...data,
      address: data.fullAddress || `${data.street}, ${data.city}, ${data.state}, ${data.country}`,
    }

    try {
      setIsloading(true)
      const supabase = createClient()

      const dbData = {
        name: completeData.name,
        type: completeData.type,
        address: completeData.address,
        street: completeData.street,
        city: completeData.city,
        state: completeData.state,
        country: completeData.country,
        coords: completeData.coords ? JSON.stringify(completeData.coords) : null,
        coordinates: completeData.coordinates,
        contact_person: completeData.contactPerson,
        contact_phone: completeData.contactPhone,
        contact_email: completeData.contactEmail,
        operating_hours: completeData.operatingHours,
        capacity: completeData.capacity,
        notes: completeData.notes,
        facilities: completeData.facilities || [],
      }

      let result
      if (id) {
        result = await supabase
          .from('stop_points')
          .update(dbData)
          .eq('id', id)
          .select()
      } else {
        result = await supabase
          .from('stop_points')
          .insert(dbData)
          .select()
      }

      if (result.error) {
        throw result.error
      }

      if (onCancel) onCancel()
    } catch (error) {
      setIsloading(false)
      console.error('Error saving stop point:', error)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const stop_point_details = [
    {
      htmlFor: 'name',
      label: 'Name *',
      value: formData.name,
      placeholder: 'e.g., Main Warehouse',
      required: true,
    },
    {
      htmlFor: 'type',
      label: 'Type *',
      value: formData.type,
      placeholder: 'Select type',
      type: 'select',
      options: [
        { value: 'warehouse', label: 'Warehouse' },
        { value: 'distribution', label: 'Distribution' },
        { value: 'hub', label: 'Hub' },
        { value: 'loading', label: 'Loading' },
        { value: 'transit', label: 'Transit' },
      ],
    },
    {
      htmlFor: 'operatingHours',
      label: 'Operating Hours',
      value: formData.operatingHours,
      placeholder: 'e.g., Mon-Fri: 8AM-5PM',
    },
  ]

  const contact_details = [
    {
      htmlFor: 'contactPerson',
      label: 'Contact Person',
      value: formData.contactPerson,
      placeholder: 'e.g., John Smith',
      required: false,
    },
    {
      htmlFor: 'contactPhone',
      label: 'Contact Phone',
      value: formData.contactPhone,
      placeholder: '+27 11 123 4567',
      required: false,
    },
    {
      htmlFor: 'contactEmail',
      label: 'Contact Email',
      value: formData.contactEmail,
      placeholder: 'contact@warehouse.com',
    },
  ]

  const handlePolygonChange = (points) => {
    setPolygonPoints(points)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <DetailCard
          title="Stop Point Information"
          description="Enter details about this location"
        >
          <DynamicInput
            inputs={stop_point_details}
            handleSelectChange={handleSelectChange}
            handleChange={handleChange}
          />
          <Separator className="my-4" />
          <DynamicInput
            inputs={contact_details}
            handleSelectChange={handleSelectChange}
            handleChange={handleChange}
          />
          <Separator className="my-4" />

          <div className="mb-4">
            <AddressAutocomplete
              label="Search Address"
              value={formData.fullAddress}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, fullAddress: val }))
              }
              onAddressSelect={handleAddressSelect}
              onCoordinatesChange={handleCoordinatesChange}
              placeholder="Search for a place, mall, address..."
            />
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Label>Geozone</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Click on the map to create a geozone. Minimum 3 points required.
            </p>
            <GeozoneMap
              initialCenter={
                polygonPoints.length > 0
                  ? polygonPoints[0]
                  : { lat: -26.2041, lng: 28.0473 }
              }
              center={mapCenter}
              initialPolygonPoints={polygonPoints}
              onPolygonChange={handlePolygonChange}
              height="350px"
            />
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              placeholder="Additional information about this stop point"
            />
          </div>
        </DetailCard>

        <div className="flex justify-between gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isloading}>
            <Save className="mr-2 h-4 w-4" />
            {isloading ? 'Saving...' : id ? 'Update Stop Point' : 'Save Stop Point'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export default StopPointForm
