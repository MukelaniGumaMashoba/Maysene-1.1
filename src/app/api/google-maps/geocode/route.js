import { NextResponse } from 'next/server'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }

  try {
    const encodedAddress = encodeURIComponent(address)
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0]
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

    return NextResponse.json({ error: 'No results found' }, { status: 404 })
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ error: 'Failed to geocode address' }, { status: 500 })
  }
}
