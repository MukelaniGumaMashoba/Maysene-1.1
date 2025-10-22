'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// *****************************
// update stop point
// *****************************
export async function PUT(request, { params }) {
  const supabase = createClient()

  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing stop point ID' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('stop_points')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// *****************************
// delete stop point
// *****************************
export async function DELETE(request, { params }) {
  const supabase = createClient()

  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Missing stop point ID' }, { status: 400 })
    }

    const { error } = await supabase
      .from('stop_points')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ message: 'Stop point deleted successfully' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}