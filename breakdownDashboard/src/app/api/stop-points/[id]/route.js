import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const supabase = createClient();
// *****************************
// update stop point
// *****************************
export async function PUT(request, { params }) {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  const { id } = await params
  const body = await request.json()

  if (!session || !session.user.id) {
    return NextResponse.json(
      { error: 'You are not authorized' },
      { status: 401 }
    )
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('stop_points')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Stop point with id: ${id} was not found` },
        { status: 404 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update stop point with id: ${id}` },
      { status: 500 }
    )
  }
}

// *****************************
// delete stop points
// *****************************
export async function DELETE(request, { params }) {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  const { id } = await params

  if (!session || !session.user.id) {
    return NextResponse.json({ error: 'Not a valid user' }, { status: 401 })
  }

  if (!id) {
    return NextResponse.json(
      { error: 'MIssing stop point ID' },
      { status: 400 }
    )
  }
  try {
    const { error } = await supabase
      .from('stop_points')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: `Stop point with id: ${id} was not found` },
        { status: 404 }
      )
    }

    return NextResponse.json(id, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong...' },
      { status: 500 }
    )
  }
}
