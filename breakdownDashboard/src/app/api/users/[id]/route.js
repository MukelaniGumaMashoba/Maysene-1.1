import { createClient } from '@/lib/supabase/server';

// next
import { NextResponse } from 'next/server'

// *****************************
// update user
// *****************************

const supabase = createClient()

export async function PUT(request, { params }) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const { id } = await params
  const body = await request.json()

  if (authError || !user) {
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
      .from('users')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `User with id: ${id} was not found` },
        { status: 404 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update user with id: ${id}` },
      { status: 500 }
    )
  }
}

// *****************************
// delete user
// *****************************
export async function DELETE(request, { params }) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const { id } = await params

  if (authError || !user) {
    return NextResponse.json({ error: 'Not a valid user' }, { status: 401 })
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
  }

  try {
    // First check if user exists and is not super admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (userError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (userData.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin can not be deleted' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json(id, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong...' },
      { status: 500 }
    )
  }
}