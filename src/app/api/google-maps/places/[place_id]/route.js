import { NextResponse } from 'next/server'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN

export async function GET(request, { params }) {
  const { place_id } = await params

  if (!place_id) {
    return NextResponse.json({ error: 'place_id is required' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&key=${GOOGLE_MAPS_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status === 'OK' && data.result) {
      const result = data.result
      const { lat, lng } = result.geometry.location

      const addressComponents = result.address_components || []
      let street = ''
      let city = ''
      let state = ''
      let country = ''

      addressComponents.forEach((component) => {
        const types = component.types
        if (types.includes('route') || types.includes('street_number')) {
          street = street ? `${component.long_name} ${street}` : component.long_name
        }
        if (types.includes('locality')) {
          city = component.long_name
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.long_name
        }
        if (types.includes('country')) {
          country = component.long_name
        }
      })

      return NextResponse.json({
        lat,
        lng,
        formatted_address: result.formatted_address,
        place_name: result.formatted_address,
        street,
        city,
        state,
        country,
      })
    }

    return NextResponse.json({ error: 'Place not found' }, { status: 404 })
  } catch (error) {
    console.error('Place details error:', error)
    return NextResponse.json({ error: 'Failed to get place details' }, { status: 500 })
  }
}
