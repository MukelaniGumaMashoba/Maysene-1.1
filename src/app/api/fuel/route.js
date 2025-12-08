import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const endpoint = process.env.NEXT_PUBLIC_CAN_BUS_ENDPOINT
    const key = process.env.NEXT_PUBLIC_CANBUS_KEY
    
    if (!endpoint || !key) {
      return NextResponse.json(
        { error: 'CAN bus configuration missing' },
        { status: 500 }
      )
    }
    
    const response = await fetch(`${endpoint}/canbus/snapshot?company=maysene&key=${key}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // If empty array, return mock data for testing
    if (Array.isArray(data) && data.length === 0) {
      return NextResponse.json([
        {
          vehicleId: 'TEST001',
          registrationNumber: 'GP123ABC',
          fuelLevel: 75,
          fuelCapacity: 100,
          timestamp: new Date().toISOString()
        }
      ])
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching fuel data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fuel data', details: error.message },
      { status: 500 }
    )
  }
}