/**
 * Google Maps geocoding utility - uses server-side API routes
 * to keep the API key hidden from the frontend
 */

/**
 * Search for places/addresses with autocomplete
 */
export async function searchPlaces(query, limit = 5) {
  try {
    if (!query || query.length < 3) {
      return []
    }

    const response = await fetch(
      `/api/google-maps/places?input=${encodeURIComponent(query)}&limit=${limit}`
    )

    if (!response.ok) {
      throw new Error(`Place search failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.predictions || []
  } catch (error) {
    console.error('Place search error:', error)
    return []
  }
}

/**
 * Get place details from place_id
 */
export async function getPlaceDetails(placeId) {
  try {
    const response = await fetch(
      `/api/google-maps/places/${encodeURIComponent(placeId)}`
    )

    if (!response.ok) {
      throw new Error(`Place details failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Place details error:', error)
    return null
  }
}

/**
 * Geocode an address to get coordinates
 */
export async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `/api/google-maps/geocode?address=${encodeURIComponent(address)}`
    )

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Convert geozone polygon coordinates to the required format
 * Format: "lat,lng,0 lat,lng,0 ..." (space-separated lat,lng,0 triplets)
 */
export function formatGeozoneCoordinates(polygonPoints) {
  if (!polygonPoints || polygonPoints.length < 3) {
    return ''
  }
  return polygonPoints.map((point) => `${point.lat},${point.lng},0`).join(' ')
}

/**
 * Parse geozone coordinates from database format to array of {lat, lng}
 * Format: "lat,lng,0 lat,lng,0 ..."
 */
export function parseGeozoneCoordinates(coordinateString) {
  if (!coordinateString) return []

  return coordinateString
    .split(' ')
    .filter(Boolean)
    .map((coord) => {
      const parts = coord.split(',')
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0])
        const lng = parseFloat(parts[1])
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng }
        }
      }
      return null
    })
    .filter(Boolean)
}
