import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'not a valid user' }, { status: 500 })
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('client_id', session.user.client_id)

    if (error) throw error
    return NextResponse.json(users)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'not a valid user' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const clientId = session.user.client_id

    // Lookup cost centre by name
    const { data: costCentre, error: costCentreError } = await supabase
      .from('cost_centres')
      .select('id, users')
      .eq('name', body.costCentre)
      .eq('client_id', clientId)
      .single()

    if (costCentreError || !costCentre) {
      return NextResponse.json(
        { error: 'Cost centre not found' },
        { status: 404 }
      )
    }

    // Get last used custom ID
    const { data: lastUser } = await supabase
      .from('users')
      .select('id')
      .eq('client_id', clientId)
      .order('id', { ascending: false })
      .limit(1)
      .single()

    let lastIdNum = 0
    if (lastUser) {
      lastIdNum = parseInt(lastUser.id.split('-')[1]) || 0
    }

    const newId = `USR-${String(lastIdNum + 1).padStart(3, '0')}`

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: body.email,
      password: process.env.DEFAULT_USER_PASSWORD || 'TempPass123!'
      options: {
        data: {
          role: body.role,
          client_id: clientId,
          cost_centre_id: costCentre.id,
          name: body.name
        }
      }
    })

    if (authError) throw authError

    // Prepare user data
    const newUser = {
      ...body,
      uid: authUser.user.id,
      client_id: clientId,
      cost_centre_id: costCentre.id,
      id: newId,
      status: body.status || 'active',
      created_at: new Date().toISOString().split('T')[0]
    }

    // Insert user
    const { error: insertError } = await supabase
      .from('users')
      .insert(newUser)

    if (insertError) throw insertError

    // Update cost centre users count
    const { error: updateError } = await supabase
      .from('cost_centres')
      .update({ users: (costCentre.users || 0) + 1 })
      .eq('id', costCentre.id)

    if (updateError) throw updateError

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    let errorMessage = 'Server error'

    if (error.message?.includes('duplicate key')) {
      errorMessage = 'A user with that email already exists.'
    } else if (error.message?.includes('invalid email')) {
      errorMessage = 'Invalid email address.'
    } else {
      errorMessage = error.message || 'An unexpected error occurred.'
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
