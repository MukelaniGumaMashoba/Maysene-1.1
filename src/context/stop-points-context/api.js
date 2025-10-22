// actions
import * as api from './actions'

import { createClient } from '@/lib/supabase/client'

// Transform database data to frontend format
const transformStopPointFromDB = (dbStopPoint) => {
  if (!dbStopPoint) return null
  
  let coords = null
  try {
    coords = dbStopPoint.coords ? JSON.parse(dbStopPoint.coords) : null
  } catch (e) {
    coords = null
  }
  
  return {
    id: dbStopPoint.id,
    name: dbStopPoint.name || '',
    type: dbStopPoint.type || 'warehouse',
    address: dbStopPoint.address || '',
    street: dbStopPoint.street || '',
    city: dbStopPoint.city || '',
    state: dbStopPoint.state || '',
    country: dbStopPoint.country || '',
    coords,
    coordinates: dbStopPoint.coordinates || '',
    contactPerson: dbStopPoint.contact_person || '',
    contactPhone: dbStopPoint.contact_phone || '',
    contactEmail: dbStopPoint.contact_email || '',
    operatingHours: dbStopPoint.operating_hours || '',
    capacity: dbStopPoint.capacity || '',
    notes: dbStopPoint.notes || '',
    facilities: dbStopPoint.facilities || [],
    createdAt: dbStopPoint.created_at,
    updatedAt: dbStopPoint.updated_at,
  }
}

// *****************************
// fetch stop points (Supabase)
// *****************************
export const fetchStopPoints = async (stopPointsDispatch) => {
  stopPointsDispatch(api.fetchStopPointsStart())
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from('stop_points').select('*')

    if (error) {
      console.error('fetchStopPoints error', error)
      stopPointsDispatch(api.fetchStopPointsFailure(error))
      return
    }

    const transformedData = (data || []).map(transformStopPointFromDB)
    stopPointsDispatch(api.fetchStopPointsSuccess(transformedData))
  } catch (err) {
    console.error('fetchStopPoints exception', err)
    stopPointsDispatch(api.fetchStopPointsFailure(err))
  }
}

// Transform frontend data to database format
const transformStopPointToDB = (stopPoint, isUpdate = false) => {
  const dbData = {
    name: stopPoint.name,
    type: stopPoint.type,
    address: stopPoint.address,
    street: stopPoint.street,
    city: stopPoint.city,
    state: stopPoint.state,
    country: stopPoint.country,
    coords: stopPoint.coords ? JSON.stringify(stopPoint.coords) : null,
    coordinates: stopPoint.coordinates,
    contact_person: stopPoint.contactPerson,
    contact_phone: stopPoint.contactPhone,
    contact_email: stopPoint.contactEmail,
    operating_hours: stopPoint.operatingHours,
    capacity: stopPoint.capacity,
    notes: stopPoint.notes,
    facilities: stopPoint.facilities || [],
  }
  
  // Only include ID for updates, not for inserts (auto-generated)
  if (isUpdate && stopPoint.id) {
    dbData.id = stopPoint.id
  }
  
  return dbData
}

// *****************************
// add stop point
// *****************************
const addStopPoint = async (stopPoint, stopPointsDispatch) => {
  stopPointsDispatch(api.addStopPointStart())
  try {
    const supabase = createClient()
    const dbStopPoint = transformStopPointToDB(stopPoint)
    const { data, error } = await supabase.from('stop_points').insert(dbStopPoint).select()

    if (error) {
      stopPointsDispatch(api.addStopPointFailure(error))
      return
    }
    // insert returns array
    const transformedData = transformStopPointFromDB(data?.[0] || data)
    stopPointsDispatch(api.addStopPointSuccess(transformedData))
  } catch (err) {
    stopPointsDispatch(api.addStopPointFailure(err))
  }
}

// *****************************
// update stop point
// *****************************
const updateStopPoint = async (id, stopPoint, stopPointsDispatch) => {
  stopPointsDispatch(api.updateStopPointStart())
  try {
    const supabase = createClient()
    const dbStopPoint = transformStopPointToDB(stopPoint, true)
    const { data, error } = await supabase.from('stop_points').update(dbStopPoint).eq('id', id).select()

    if (error) {
      stopPointsDispatch(api.updateStopPointFailure(error))
      return
    }
    const transformedData = transformStopPointFromDB(data?.[0] || data)
    stopPointsDispatch(api.updateStopPointSuccess(transformedData))
  } catch (err) {
    stopPointsDispatch(api.updateStopPointFailure(err))
  }
}

// *****************************
// upsert stop point
// *****************************
export const upsertStopPoint = async (id, stopPoint, stopPointsDispatch) =>
  id ? updateStopPoint(id, stopPoint, stopPointsDispatch) : addStopPoint(stopPoint, stopPointsDispatch)

// *****************************
// delete stop point
// *****************************
export const deleteStopPoint = async (id, stopPointsDispatch) => {
  stopPointsDispatch(api.deleteStopPointStart())
  try {
    const supabase = createClient()
    const { error } = await supabase.from('stop_points').delete().eq('id', id)

    if (error) {
      stopPointsDispatch(api.deleteStopPointFailure(error))
      return
    }
    stopPointsDispatch(api.deleteStopPointSuccess(id))
  } catch (err) {
    stopPointsDispatch(api.deleteStopPointFailure(err))
  }
}
