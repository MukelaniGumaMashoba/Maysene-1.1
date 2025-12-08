'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export default function DisplayMap({ routeCoordinates = [] }) {
  const mapContainer = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [28.0473, -26.2041],
      zoom: 10,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
  }, [])

  useEffect(() => {
    if (!map.current || !routeCoordinates.length) return

    // Clear existing markers and routes
    const markers = document.querySelectorAll('.mapboxgl-marker')
    markers.forEach(marker => marker.remove())

    // Add markers for pickup and dropoff locations
    routeCoordinates.forEach((coord, index) => {
      const el = document.createElement('div')
      el.className = 'marker'
      el.style.backgroundColor = coord.type === 'pickup' ? '#10B981' : '#EF4444'
      el.style.width = '20px'
      el.style.height = '20px'
      el.style.borderRadius = '50%'
      el.style.border = '2px solid white'
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'

      new mapboxgl.Marker(el)
        .setLngLat([coord.lng, coord.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<div><strong>${coord.type === 'pickup' ? 'Pickup' : 'Dropoff'}</strong><br/>${coord.address}</div>`))
        .addTo(map.current)
    })

    // Draw route if we have multiple coordinates
    if (routeCoordinates.length > 1) {
      const coordinates = routeCoordinates.map(coord => [coord.lng, coord.lat])
      
      // Get route from Mapbox Directions API
      const getRoute = async () => {
        const coordString = coordinates.map(coord => coord.join(',')).join(';')
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&access_token=${mapboxgl.accessToken}`
        
        try {
          const response = await fetch(url)
          const data = await response.json()
          
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0].geometry
            
            // Add route to map
            if (map.current.getSource('route')) {
              map.current.removeLayer('route')
              map.current.removeSource('route')
            }
            
            map.current.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: route
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
                'line-color': '#3B82F6',
                'line-width': 4
              }
            })
          }
        } catch (error) {
          console.error('Error fetching route:', error)
        }
      }
      
      getRoute()
    }

    // Fit map to show all coordinates
    if (routeCoordinates.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      routeCoordinates.forEach(coord => {
        bounds.extend([coord.lng, coord.lat])
      })
      map.current.fitBounds(bounds, { padding: 50 })
    }
  }, [routeCoordinates])

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  )
}