import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server'

// Initialize Supabase client

// Helper function to verify auth
async function verifyAuth(request) {

  const supabase = createClient();

  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.split(' ')[1]
  const { data, error } = await supabase.auth.getUser(token)
  
  if (error) return null
  
  // Get client ID from user metadata
  const { data: userData } = await supabase
    .from('users')
    .select('client_id')
    .eq('id', data.user.id)
    .single()
  
  return { ...data.user, clientId: userData?.client_id }
}

// *****************************
// get trips
// *****************************
export async function GET(request) {
  const supabase = createClient()
  const token = await verifyAuth(request)

  if (!token) {
    return NextResponse.json({ error: 'not a valid user' }, { status: 401 })
  }
  
  try {
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Parse JSONB fields for frontend consumption
    const parsedTrips = trips.map(trip => ({
      ...trip,
      vehicleAssignments: trip.vehicleAssignments || trip.vehicle_assignments || [],
      pickupLocations: trip.pickupLocations || trip.pickup_locations || [],
      dropoffLocations: trip.dropoffLocations || trip.dropoff_locations || [],
      selectedStopPoints: trip.selectedStopPoints || trip.selected_stop_points || [],
      clientDetails: trip.clientDetails || trip.client_details || {}
    }))
    
    return NextResponse.json(parsedTrips)
  } catch (err) {
    console.error('Trips fetch error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// *****************************
// add trip
// *****************************
export async function POST(request) {
  const supabase = createClient()
  const token = await verifyAuth(request)

  if (!token) {
    return NextResponse.json({ error: 'not a valid user' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const clientId = token.clientId
    
    // Generate trip ID
    const tripId = `TRP-${Date.now()}`
    
    // Prepare trip data with proper JSONB fields
    const tripData = {
      trip_id: tripId,
      orderNumber: body.orderNumber,
      rate: body.rate,
      status: body.status || 'pending',
      startDate: body.startDate,
      endDate: body.endDate,
      cost_centre: JSON.stringify(body.costCentre),
      origin: body.origin,
      destination: body.destination,
      cargo: body.cargo,
      cargoWeight: body.cargoWeight,
      notes: body.notes,
      
      // JSONB fields
      vehicleAssignments: JSON.stringify(body.vehicleAssignments || []),
      pickupLocations: JSON.stringify(body.pickupLocations || []),
      dropoffLocations: JSON.stringify(body.dropoffLocations || []),
      selectedStopPoints: JSON.stringify(body.selectedStopPoints || []),
      waypoints: JSON.stringify(body.waypoints || []),
      clientDetails: JSON.stringify(body.clientDetails || {}),
      
      // Snake case for DB compatibility
      vehicle_assignments: JSON.stringify(body.vehicleAssignments || []),
      pickup_locations: JSON.stringify(body.pickupLocations || []),
      dropoff_locations: JSON.stringify(body.dropoffLocations || []),
      selected_stop_points: JSON.stringify(body.selectedStopPoints || []),
      client_details: JSON.stringify(body.clientDetails || {}),
      
      route: `${body.origin} to ${body.destination}`,
      distance: 'Calculating...',
      statusNotes: body.statusNotes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: insertedTrip, error: insertError } = await supabase
      .from('trips')
      .insert(tripData)
      .select()
      .single()
    
    if (insertError) throw insertError
    
    // Update vehicle and driver status if assigned
    if (body.vehicleAssignments?.length > 0) {
      for (const assignment of body.vehicleAssignments) {
        // Update vehicle status
        if (assignment.vehicle?.id) {
          await supabase
            .from('vehiclesc')
            .update({ status: 'on-trip', current_trip: tripId })
            .eq('id', assignment.vehicle.id)
        }
        
        // Update driver status
        if (assignment.drivers?.length > 0) {
          for (const driver of assignment.drivers) {
            if (driver.id) {
              await supabase
                .from('drivers')
                .update({ status: 'on-trip', current_trip: tripId })
                .eq('id', driver.id)
            }
          }
        }
      }
    }
    
    return NextResponse.json(insertedTrip, { status: 201 })
  } catch (error) {
    console.error('Trip creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
