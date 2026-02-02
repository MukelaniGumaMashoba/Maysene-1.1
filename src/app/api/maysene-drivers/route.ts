import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const response = await fetch('http://64.227.138.235:3000/api/maysene-vehicles');
    const data = await response.json();
    
    const supabase = await createClient();
    const { data: dbDrivers, error } = await supabase.from('drivers').select('*');
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }
    
    const externalDrivers = (data.data || [])
      .filter(v => v.driver_name && v.driver_name !== 'UNKNOWN')
      .map(v => {
        const cleanName = v.driver_name.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
        const nameParts = cleanName.split(' ').filter(p => p.length > 0);
        return {
          external_name: v.driver_name,
          clean_name: cleanName,
          first_name: nameParts[0] || '',
          surname: nameParts.slice(1).join(' ') || nameParts[0] || '',
          plate: v.plate,
          latitude: v.latitude,
          longitude: v.longitude,
          speed: v.speed,
          mileage: v.mileage,
          geozone: v.geozone,
          loc_time: v.loc_time
        };
      });
    
    const matchedDrivers = (dbDrivers || []).map(dbDriver => {
      const dbName = `${dbDriver.first_name} ${dbDriver.surname}`.toLowerCase();
      const match = externalDrivers.find(ext => {
        const extName = `${ext.first_name} ${ext.surname}`.toLowerCase();
        return dbName.includes(ext.first_name.toLowerCase()) && 
               dbName.includes(ext.surname.toLowerCase());
      });
      
      return {
        ...dbDriver,
        tracking: match || null
      };
    });
    
    return NextResponse.json({ drivers: matchedDrivers });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to fetch drivers', details: error.message }, { status: 500 });
  }
}
