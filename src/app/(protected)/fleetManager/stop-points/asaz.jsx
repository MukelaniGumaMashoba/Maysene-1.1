'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function StopPointsPage() {
  const [stopPoints, setStopPoints] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStopPoint, setEditingStopPoint] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'warehouse',
    contact_person: '',
    contact_phone: '',
    operating_hours: '',
    client_id: ''
  })

  const supabase = createClient()

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [
        { data: stopPointsData },
        { data: clientsData }
      ] = await Promise.all([
        supabase.from('stop_points').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name')
      ])
      
      setStopPoints(stopPointsData || [])
      setClients(clientsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingStopPoint) {
        // Update existing stop point
        const { error } = await supabase
          .from('stop_points')
          .update(formData)
          .eq('id', editingStopPoint.id)
        
        if (error) throw error
      } else {
        // Create new stop point
        const { error } = await supabase
          .from('stop_points')
          .insert([formData])
        
        if (error) throw error
      }

      await fetchData()
      resetForm()
      setDialogOpen(false)
    } catch (error) {
      console.error('Error saving stop point:', error)
      alert('Error saving stop point: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (stopPoint) => {
    setEditingStopPoint(stopPoint)
    setFormData({
      name: stopPoint.name || '',
      address: stopPoint.address || '',
      type: stopPoint.type || 'warehouse',
      contact_person: stopPoint.contact_person || '',
      contact_phone: stopPoint.contact_phone || '',
      operating_hours: stopPoint.operating_hours || '',
      client_id: stopPoint.client_id || ''
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this stop point?')) return

    try {
      const { error } = await supabase
        .from('stop_points')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting stop point:', error)
      alert('Error deleting stop point: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      type: 'warehouse',
      contact_person: '',
      contact_phone: '',
      operating_hours: '',
      client_id: ''
    })
    setEditingStopPoint(null)
  }

  const getTypeBadge = (type) => {
    const colors = {
      warehouse: 'bg-blue-100 text-blue-800',
      distribution: 'bg-green-100 text-green-800',
      truck_stop: 'bg-amber-100 text-amber-800',
      client: 'bg-purple-100 text-purple-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId)
    return client ? client.name : 'N/A'
  }

  if (loading && stopPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading stop points...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stop Points</h1>
          <p className="text-gray-600">Manage pickup, delivery, and waypoint locations</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stop Point
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingStopPoint ? 'Edit Stop Point' : 'Add New Stop Point'}
              </DialogTitle>
              <DialogDescription>
                Create a new location that can be used in trips as pickup, dropoff, or waypoint.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Stop point name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="distribution">Distribution Center</SelectItem>
                      <SelectItem value="truck_stop">Truck Stop</SelectItem>
                      <SelectItem value="client">Client Location</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Full address"
                  required
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    placeholder="Contact person name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="operating_hours">Operating Hours</Label>
                  <Input
                    id="operating_hours"
                    value={formData.operating_hours}
                    onChange={(e) => setFormData({...formData, operating_hours: e.target.value})}
                    placeholder="e.g., Mon-Fri 8:00-17:00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="client_id">Associated Client (Optional)</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingStopPoint ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stopPoints.map((stopPoint) => (
              <TableRow key={stopPoint.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {stopPoint.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getTypeBadge(stopPoint.type)}>
                    {stopPoint.type}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {stopPoint.address}
                </TableCell>
                <TableCell>
                  {stopPoint.contact_person && (
                    <div className="text-sm">
                      <div>{stopPoint.contact_person}</div>
                      {stopPoint.contact_phone && (
                        <div className="text-gray-500">{stopPoint.contact_phone}</div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {getClientName(stopPoint.client_id)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(stopPoint)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(stopPoint.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {stopPoints.length === 0 && (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stop points yet</h3>
            <p className="text-gray-500 mb-4">Create your first stop point to get started.</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stop Point
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}