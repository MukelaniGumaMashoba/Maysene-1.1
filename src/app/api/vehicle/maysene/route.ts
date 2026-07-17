import { NextResponse } from 'next/server'

const ROUTING_BASE_URL = process.env.NEXT_PUBLIC_ROUTING

export async function GET() {
  try {
    const response = await fetch(`${ROUTING_BASE_URL}/api/vehicle/maysene`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      throw new Error(`GPS API error: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching vehicle GPS data:', error)
    return NextResponse.json(
      { ok: false, data: [], error: 'Failed to fetch vehicle GPS data' },
      { status: 500 }
    )
  }
}
