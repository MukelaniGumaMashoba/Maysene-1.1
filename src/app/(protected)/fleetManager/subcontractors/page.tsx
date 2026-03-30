import { createClient } from '@/lib/supabase/server'
import { SubcontractorsTable } from '@/components/tables/subcontractors-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SubcontractorJobAllocationBoard from '@/components/workshop/AllocateJobToSubcontractor'

export default async function SubcontractorsPage() {
  const supabase = await createClient()
  
  const { data: subcontractors, error } = await supabase
    .from('subcontractor')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching subcontractors:', error)
    return <div>Error loading subcontractors</div>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Subcontractors Management</h1>
        <p className="text-gray-600">Manage your subcontractors and their availability</p>
      </div>
      
      <Tabs defaultValue="subcontractors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subcontractors">
            Subcontractors
          </TabsTrigger>
          <TabsTrigger value="allocation">
            Job Allocation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subcontractors">
          <SubcontractorsTable subcontractors={subcontractors} />
        </TabsContent>

        <TabsContent value="allocation">
          <SubcontractorJobAllocationBoard />
        </TabsContent>
      </Tabs>
    </div>
  )
}