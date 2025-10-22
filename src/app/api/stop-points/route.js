'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// *****************************
// get stop points
// *****************************
export async function GET(request) {
  const supabase = createClient()
  
  try {
    const { data: stopPoints, error } = await supabase
      .from('stop_points')
      .select('*')
    
    if (error) throw error
    
    return NextResponse.json(stopPoints)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// *****************************
// add stop point
// *****************************
export async function POST(request) {
  const supabase = createClient()

  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('stop_points')
      .insert(body)
      .select()
      .single()
      
    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}