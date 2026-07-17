import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: dbDrivers, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('available', true)
      .neq('deleted', true);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ drivers: dbDrivers || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to fetch drivers', details: error.message }, { status: 500 });
  }
}
