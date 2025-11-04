import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// *****************************
// fetch stop points
// *****************************
export async function GET(request) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'not a valid user' }, { status: 401 })
  }

  try {
    const { data: stop_points, error } = await supabase
      .from('stop_points')
      .select('*')
      .eq('client_id', user.id)

    if (error) throw error

    return NextResponse.json(stop_points)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// *****************************
// add stop point  
// *****************************
export async function POST(request) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'not a valid user' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const clientId = token.clientId
    const { data: lastStop } = await supabase
      .from('stop_points')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)

    const docRef = await stopPointsRef.add(newStopPoint)
    const { data, error } = await supabase
      .from('stop_points')
      .insert(newStopPoint)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
