import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let companyName = null
    if (profile.client_id) {
      const { data: company, error: companyError } = await supabase
        .from('clients')
        .select('name')
        .eq('id', profile.client_id)
        .single()
      if (!companyError && company) companyName = company.name
    }

    const currentUser = { company: companyName, ...profile }
    return NextResponse.json(currentUser, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
