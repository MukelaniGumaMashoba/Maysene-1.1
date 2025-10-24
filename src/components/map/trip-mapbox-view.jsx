'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Set Mapbox access token
if (typeof window !== 'undefined') {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
}

export default function TripMapboxView({ tripData }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [loading, setLoading] = useState(true)
  const [routeInfo, setRouteInfo] = useState(null)

  useEffect(() => {
    if (!tripData || !mapContainer.current || typeof window === 'undefined') return

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [28.0473, -26.2041], // Default to Johannesburg
      zoom: 10
    })

    const processLocations = async () => {
      const markers = []
      const coordinates = []

      // Parse JSON fields safely
      const parseField = (field) => {
        if (!field) return []
        if (typeof field === 'string') {
          try {
            return JSON.parse(field)
          } catch {
            return []
          }
        }
        return Array.isArray(field) ? field : []
      }

      const pickupLocations = parseField(tripData.pickupLocations || tripData.pickup_locations)
      const dropoffLocations = parseField(tripData.dropoffLocations || tripData.dropoff_locations)
      const waypoints = parseField(tripData.waypoints)
      const stopPoints = parseField(tripData.stopPoints || tripData.stop_points)

      // Add pickup locations
      for (const [index, location] of pickupLocations.entries()) {
        if (location.address) {
          try {
            let coords = null
            
            // Use stored coordinates if available
            if (location.coords) {
              coords = location.coords
            } else {
              // Geocode address
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location.address)}.json?access_token=${mapboxgl.accessToken}`
              )
              const data = await response.json()
              if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center
                coords = { lat, lng }
              }
            }

            if (coords) {
              coordinates.push([coords.lng, coords.lat])
              
              // Create pickup marker
              const marker = new mapboxgl.Marker({ color: '#10b981' })
                .setLngLat([coords.lng, coords.lat])
                .setPopup(new mapboxgl.Popup().setHTML(`
                  <div>
                    <h3 style="font-weight: bold; margin-bottom: 8px;">Pickup Location ${index + 1}</h3>
                    <p><strong>Name:</strong> ${location.location || 'N/A'}</p>
                    <p><strong>Address:</strong> ${location.address}</p>
                    ${location.contactPerson ? `<p><strong>Contact:</strong> ${location.contactPerson}</p>` : ''}
                    ${location.contactNumber ? `<p><strong>Phone:</strong> ${location.contactNumber}</p>` : ''}
                  </div>
                `))
                .addTo(map.current)
              
              markers.push(marker)
            }
          } catch (error) {
            console.error('Error processing pickup location:', error)
          }
        }
      }

      

      // Add waypoints
      for (const [index, waypoint] of waypoints.entries()) {
        const address = waypoint.address || waypoint.location
        if (address) {
          try {
            let coords = null
            
            if (waypoint.coords) {
              coords = waypoint.coords
            } else {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}`
              )
              const data = await response.json()
              if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center
                coords = { lat, lng }
              }
            }

            if (coords) {
              coordinates.push([coords.lng, coords.lat])
              
              // Create waypoint marker
              const marker = new mapboxgl.Marker({ color: '#3b82f6' })
                .setLngLat([coords.lng, coords.lat])
                .setPopup(new mapboxgl.Popup().setHTML(`
                  <div>
                    <h3 style="font-weight: bold; margin-bottom: 8px;">Waypoint ${index + 1}</h3>
                    <p><strong>Name:</strong> ${waypoint.location || 'N/A'}</p>
                    <p><strong>Address:</strong> ${address}</p>
                    ${waypoint.contactPerson ? `<p><strong>Contact:</strong> ${waypoint.contactPerson}</p>` : ''}
                    ${waypoint.contactNumber ? `<p><strong>Phone:</strong> ${waypoint.contactNumber}</p>` : ''}
                  </div>
                `))
                .addTo(map.current)
              
              markers.push(marker)
            }
          } catch (error) {
            console.error('Error processing waypoint:', error)
          }
        }
      }

      // Add stop points
      for (const [index, stopPoint] of stopPoints.entries()) {
        const address = stopPoint.address || stopPoint.name
        if (address) {
          try {
            let coords = null
            
            if (stopPoint.coords) {
              coords = typeof stopPoint.coords === 'string' ? JSON.parse(stopPoint.coords) : stopPoint.coords
            } else {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}`
              )
              const data = await response.json()
              if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center
                coords = { lat, lng }
              }
            }

            if (coords) {
              coordinates.push([coords.lng, coords.lat])
              
              // Create stop point marker
              const marker = new mapboxgl.Marker({ color: '#f59e0b' })
                .setLngLat([coords.lng, coords.lat])
                .setPopup(new mapboxgl.Popup().setHTML(`
                  <div>
                    <h3 style="font-weight: bold; margin-bottom: 8px;">${stopPoint.name}</h3>
                    <p><strong>Type:</strong> ${stopPoint.type || 'N/A'}</p>
                    <p><strong>Address:</strong> ${address}</p>
                    ${stopPoint.contact_person ? `<p><strong>Contact:</strong> ${stopPoint.contact_person}</p>` : ''}
                    ${stopPoint.contact_phone ? `<p><strong>Phone:</strong> ${stopPoint.contact_phone}</p>` : ''}
                  </div>
                `))
                .addTo(map.current)
              
              markers.push(marker)
            }
          } catch (error) {
            console.error('Error processing stop point:', error)
          }
        }
      }

      // Add dropoff locations (after waypoints and stop points to form route order)
      for (const [index, location] of dropoffLocations.entries()) {
        if (location.address) {
          try {
            let coords = null
            
            if (location.coords) {
              coords = location.coords
            } else {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location.address)}.json?access_token=${mapboxgl.accessToken}`
              )
              const data = await response.json()
              if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center
                coords = { lat, lng }
              }
            }

            if (coords) {
              coordinates.push([coords.lng, coords.lat])
              
              // Create dropoff marker
              const marker = new mapboxgl.Marker({ color: '#ef4444' })
                .setLngLat([coords.lng, coords.lat])
                .setPopup(new mapboxgl.Popup().setHTML(`
                  <div>
                    <h3 style="font-weight: bold; margin-bottom: 8px;">Dropoff Location ${index + 1}</h3>
                    <p><strong>Name:</strong> ${location.location || 'N/A'}</p>
                    <p><strong>Address:</strong> ${location.address}</p>
                    ${location.contactPerson ? `<p><strong>Contact:</strong> ${location.contactPerson}</p>` : ''}
                    ${location.contactNumber ? `<p><strong>Phone:</strong> ${location.contactNumber}</p>` : ''}
                  </div>
                `))
                .addTo(map.current)
              
              markers.push(marker)
            }
          } catch (error) {
            console.error('Error processing dropoff location:', error)
          }
        }
      }

      // Fit map to show all markers
      if (coordinates.length > 0) {
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord)
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]))

        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15
        })

        // Add route if there are multiple points
        if (coordinates.length > 1) {
          try {
            const coordinatesString = coordinates.map(coord => coord.join(',')).join(';')
            const response = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesString}?geometries=geojson&access_token=${mapboxgl.accessToken}`
            )
            const data = await response.json()
            
                if (data.routes && data.routes[0]) {
                  // remove existing route source/layer if present
                  if (map.current.getLayer && map.current.getLayer('route')) {
                    try { map.current.removeLayer('route') } catch (e) {}
                  }
                  if (map.current.getSource && map.current.getSource('route')) {
                    try { map.current.removeSource('route') } catch (e) {}
                  }

                  map.current.addSource('route', {
                    type: 'geojson',
                    data: {
                      type: 'Feature',
                      properties: {},
                      geometry: data.routes[0].geometry
                    }
                  })

                  map.current.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: {
                      'line-join': 'round',
                      'line-cap': 'round'
                    },
                    paint: {
                      'line-color': '#3b82f6',
                      'line-width': 5,
                      'line-opacity': 0.8
                    }
                  })

                  // Set route info (distance, duration) similar to MapDirections
                  try {
                    const route = data.routes[0]
                    const distanceKm = (route.distance / 1000).toFixed(1)
                    const durationMin = Math.round(route.duration / 60)
                    setRouteInfo({ distance: `${distanceKm} km`, duration: `${durationMin} min` })
                  } catch (err) {
                    // ignore
                  }
            }
          } catch (error) {
            console.warn('Could not load route:', error)
          }
        }
      }

      // attempt to add current user location marker (permission-based)
      try {
        if (navigator && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            try {
              const userMarker = new mapboxgl.Marker({ color: '#3b82f6' })
                .setLngLat([pos.coords.longitude, pos.coords.latitude])
                .setPopup(new mapboxgl.Popup().setHTML(`<div><strong>Your location</strong></div>`))
                .addTo(map.current)
            } catch (e) {
              // ignore marker errors
            }
          }, () => { /* ignore permission errors */ })
        }
      } catch (err) {
        // ignore
      }

      setLoading(false)
    }

    map.current.on('load', processLocations)

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [tripData])

  return (
    <div className="w-full h-full rounded-md overflow-hidden relative" style={{ minHeight: '400px' }}>
      {routeInfo && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white/90 rounded-md shadow px-4 py-2 flex gap-4 items-center">
          <div className="text-sm text-slate-700">Distance: <span className="font-medium">{routeInfo.distance}</span></div>
          <div className="text-sm text-slate-700">Duration: <span className="font-medium">{routeInfo.duration}</span></div>
        </div>
      )}

      <div ref={mapContainer} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading trip route...</p>
          </div>
        </div>
      )}
    </div>
  )
}