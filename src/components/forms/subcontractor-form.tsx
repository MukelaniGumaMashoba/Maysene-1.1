"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createSubcontractor, updateSubcontractor } from '@/lib/action/subcontractors'
import { toast } from 'sonner'

interface SubcontractorFormProps {
  subcontractor?: {
    id: string
    name: string
    email: string
    phone: string
    skills: string[]
    availability: boolean
    rating: number
    hourly_rate: number
  }
  onSuccess?: () => void
}

export function SubcontractorForm({ subcontractor, onSuccess }: SubcontractorFormProps) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!subcontractor

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    try {
      if (isEdit) {
        await updateSubcontractor(subcontractor.id, formData)
        toast.success('Subcontractor updated successfully')
      } else {
        await createSubcontractor(formData)
        toast.success('Subcontractor created successfully')
      }
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit' : 'Add'} Subcontractor</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={subcontractor?.name}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={subcontractor?.email}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={subcontractor?.phone}
                required
              />
            </div>
            <div>
              <Label htmlFor="hourly_rate">Hourly Rate</Label>
              <Input
                id="hourly_rate"
                name="hourly_rate"
                type="number"
                step="0.01"
                defaultValue={subcontractor?.hourly_rate}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="skills">Skills (comma separated)</Label>
            <Input
              id="skills"
              name="skills"
              defaultValue={subcontractor?.skills.join(', ')}
              placeholder="e.g. Plumbing, Electrical, HVAC"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rating">Rating (0-5)</Label>
              <Input
                id="rating"
                name="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                defaultValue={subcontractor?.rating}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="availability"
                name="availability"
                defaultChecked={subcontractor?.availability ?? true}
              />
              <Label htmlFor="availability">Available</Label>
            <input
              type="hidden"
              name="availability"
              value={subcontractor?.availability ? 'true' : 'false'}
            />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'} Subcontractor
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}