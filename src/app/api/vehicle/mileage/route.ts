import { NextRequest, NextResponse } from 'next/server'

const ROUTING_BASE_URL = process.env.NEXT_PUBLIC_ROUTING

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${ROUTING_BASE_URL}/api/vehicle/mileage/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json([], { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching mileage data:', error)
    return NextResponse.json([], { status: 500 })
  }
}
