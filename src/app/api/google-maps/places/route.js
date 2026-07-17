import { NextResponse } from 'next/server'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const input = searchParams.get('input')
  const limit = parseInt(searchParams.get('limit') || '5')

  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] })
  }

  try {
    const encodedInput = encodeURIComponent(input)
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedInput}&key=${GOOGLE_MAPS_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status === 'OK' && data.predictions) {
      const predictions = data.predictions.slice(0, limit).map((prediction) => ({
        place_id: prediction.place_id,
        text: prediction.structured_formatting?.main_text || prediction.description,
        secondary_text: prediction.structured_formatting?.secondary_text || '',
        place_name: prediction.description,
        description: prediction.description,
        types: prediction.types || [],
      }))
      return NextResponse.json({ predictions })
    }

    return NextResponse.json({ predictions: [] })
  } catch (error) {
    console.error('Places search error:', error)
    return NextResponse.json({ error: 'Failed to search places' }, { status: 500 })
  }
}
