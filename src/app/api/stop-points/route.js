import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// *****************************
// fetch stop points
// *****************************
export async function GET(request) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'not a valid user' }, { status: 401 })
    }

    try {
        const { data: stop_points, error } = await supabase
            .from('stop_points')
            .select('*')
            .eq('client_id', session.user.id)

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
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'not a valid user' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const client_id = session.user.id

        // Get last used stop point ID
        const { data: lastStopPoint, error: fetchError } = await supabase
            .from('stop_points')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)

        if (fetchError) throw fetchError

        let lastIdNum = 0
        if (lastStopPoint && lastStopPoint.length > 0) {
            const lastId = lastStopPoint[0].id
            lastIdNum = parseInt(lastId.split('-')[1]) || 0
        }

        const newId = `STP-${String(lastIdNum + 1).padStart(3, '0')}`

        const newStopPoint = {
            ...body,
            client_id,
            id: newId,
            status: body.status || 'active',
            created_at: new Date().toISOString().split('T')[0],
        }

        const { data, error } = await supabase
            .from('stop_points')
            .insert(newStopPoint)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
