'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StopPointDetails from '@/components/detail-pages/stop-point-details'
import { Skeleton } from '@/components/ui/skeleton'

export default function StopPointDetailPage() {
  const params = useParams()
  const id = params?.id
  const [stopPoint, setStopPoint] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStopPoint = async () => {
      if (!id) return
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('stop_points')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching stop point:', error)
      } else {
        setStopPoint(data)
      }
      setLoading(false)
    }

    fetchStopPoint()
  }, [id])

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
      </div>
    )
  }

  if (!stopPoint) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Stop point not found.
      </div>
    )
  }

  return <StopPointDetails id={id} />
}
