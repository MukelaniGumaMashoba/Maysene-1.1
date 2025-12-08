'use client'

import { useEffect } from 'react'
import { useGlobalContext } from '@/context/global-context/context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function UsersPage() {
  const {
    users,
    usersDispatch,
    u_api,
    onCreate,
    onEdit,
    onDelete
  } = useGlobalContext()

  useEffect(() => {
    // Fetch users when component mounts
    if (u_api.fetchUsers) {
      u_api.fetchUsers(usersDispatch)
    }
  }, [])

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'fleet manager':
        return 'bg-blue-100 text-blue-800'
      case 'call centre':
        return 'bg-green-100 text-green-800'
      case 'driver':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleTestUpdate = async () => {
    if (users.data && users.data.length > 0) {
      const firstUser = users.data[0]
      const updatedData = {
        ...firstUser,
        role: firstUser.role === 'admin' ? 'fleet manager' : 'admin',
        updated_at: new Date().toISOString()
      }
      
      console.log('Testing user update:', firstUser.id, updatedData)
      
      if (u_api.updateUser) {
        await u_api.updateUser(firstUser.id, updatedData, usersDispatch)
      }
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users Management</h2>
        <div className="flex gap-2">
          <Button onClick={handleTestUpdate} variant="outline">
            Test Update First User
          </Button>
          <Button onClick={() => onCreate('/users')}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users List</CardTitle>
        </CardHeader>
        <CardContent>
          {users.loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : users.error ? (
            <div className="text-center py-8 text-red-600">
              Error loading users: {users.error.message || 'Unknown error'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data && users.data.length > 0 ? (
                  users.data.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.company}</TableCell>
                      <TableCell>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(user.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(user.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}