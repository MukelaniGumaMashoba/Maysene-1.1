"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Star, Edit, Trash2, Plus } from 'lucide-react'
import { SubcontractorForm } from '@/components/forms/subcontractor-form'
import { deleteSubcontractor } from '@/lib/action/subcontractors'
import { toast } from 'sonner'

interface Subcontractor {
  id: string
  name: string
  email: string
  phone: string
  skills: string[]
  availability: boolean
  rating: number
  hourly_rate: number
}

interface SubcontractorsTableProps {
  subcontractors: Subcontractor[]
}

export function SubcontractorsTable({ subcontractors }: SubcontractorsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const filteredSubcontractors = subcontractors.filter(sub =>
    sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcontractor?')) return
    
    try {
      await deleteSubcontractor(id)
      toast.success('Subcontractor deleted successfully')
    } catch (error) {
      toast.error('Failed to delete subcontractor')
    }
  }

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Subcontractors ({subcontractors.length})</CardTitle>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subcontractor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Subcontractor</DialogTitle>
            </DialogHeader>
            <SubcontractorForm onSuccess={() => setShowAddDialog(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search by name, email, or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Skills</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Rate/hr</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubcontractors.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">{sub.name}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{sub.email}</div>
                    <div className="text-gray-500">{sub.phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {sub.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {sub.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{sub.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {renderStars(sub.rating)}
                    <span className="text-sm">({sub.rating})</span>
                  </div>
                </TableCell>
                <TableCell>R{sub.hourly_rate}</TableCell>
                <TableCell>
                  <Badge variant={sub.availability ? "default" : "secondary"}>
                    {sub.availability ? "Available" : "Unavailable"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSubcontractor(sub)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Subcontractor</DialogTitle>
                        </DialogHeader>
                        {editingSubcontractor && (
                          <SubcontractorForm
                            subcontractor={editingSubcontractor}
                            onSuccess={() => setEditingSubcontractor(null)}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(sub.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredSubcontractors.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No subcontractors found
          </div>
        )}
      </CardContent>
    </Card>
  )
}