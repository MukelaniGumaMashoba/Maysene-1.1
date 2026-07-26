'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Trash2, RotateCcw } from 'lucide-react'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN

function isValidCoord(p) {
  return p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)
}

export default function GeozoneMap({
  initialCenter = { lat: -26.2041, lng: 28.0473 },
  center,
  initialPolygonPoints = [],
  onPolygonChange,
  height = '400px',
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const polygonRef = useRef(null)
  const markersRef = useRef([])
  const searchPinRef = useRef(null)
  const scriptRef = useRef(null)
  const onPolygonChangeRef = useRef(onPolygonChange)
  const isPanningRef = useRef(false)
  const clickListenerRef = useRef(null)
  const [polygonPoints, setPolygonPoints] = useState(() => {
    if (initialPolygonPoints?.length > 0) {
      return initialPolygonPoints.filter(isValidCoord)
    }
    return []
  })
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const prevInitialPointsRef = useRef(JSON.stringify(initialPolygonPoints))

  onPolygonChangeRef.current = onPolygonChange

  useEffect(() => {
    const serialized = JSON.stringify(initialPolygonPoints)
    if (serialized !== prevInitialPointsRef.current) {
      prevInitialPointsRef.current = serialized
      if (initialPolygonPoints?.length > 0) {
        const validPoints = initialPolygonPoints.filter(isValidCoord)
        setPolygonPoints(validPoints)
      }
    }
  }, [initialPolygonPoints])

  const cleanupMapObjects = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    markersRef.current.forEach((m) => {
      if (m && m.setMap) m.setMap(null)
    })
    markersRef.current = []
    if (searchPinRef.current) {
      searchPinRef.current.setMap(null)
      searchPinRef.current = null
    }
  }

  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return

    cleanupMapObjects()

    if (polygonPoints.length >= 3 && window.google?.maps) {
      const path = polygonPoints.map((p) => new window.google.maps.LatLng(p.lat, p.lng))
      const polygon = new window.google.maps.Polygon({
        paths: path,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: '#3B82F6',
        fillOpacity: 0.2,
        editable: true,
        draggable: true,
        map: mapInstanceRef.current,
      })

      polygon.addListener('path_changed', () => {
        const newPath = polygon.getPath()
        const newPoints = []
        for (let i = 0; i < newPath.getLength(); i++) {
          const pt = newPath.getAt(i)
          newPoints.push({ lat: pt.lat(), lng: pt.lng() })
        }
        setPolygonPoints(newPoints)
      })

      polygonRef.current = polygon
    }

    polygonPoints.forEach((point, index) => {
      if (!isValidCoord(point) || !window.google?.maps) return

      const marker = new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: mapInstanceRef.current,
        label: {
          text: String(index + 1),
          color: '#fff',
          fontSize: '12px',
          fontWeight: 'bold',
        },
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(28, 28),
        },
        draggable: true,
      })

      marker.addListener('dragend', (event) => {
        const newPos = { lat: event.latLng.lat(), lng: event.latLng.lng() }
        setPolygonPoints((prev) => {
          const updated = [...prev]
          updated[index] = newPos
          return updated
        })
      })

      markersRef.current.push(marker)
    })
  }, [isMapLoaded, polygonPoints])

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    const center =
      isValidCoord(initialCenter) ? initialCenter : { lat: -26.2041, lng: 28.0473 }

    const initMap = () => {
      if (!mapRef.current || !window.google?.maps) return

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })

      mapInstanceRef.current = map

      clickListenerRef.current = map.addListener('click', (event) => {
        if (isPanningRef.current) return
        const newPoint = { lat: event.latLng.lat(), lng: event.latLng.lng() }
        setPolygonPoints((prev) => [...prev, newPoint])
      })

      setIsMapLoaded(true)
    }

    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
    if (!window.google?.maps && !existingScript) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = initMap
      script.onerror = () => console.error('Failed to load Google Maps script')
      document.head.appendChild(script)
      scriptRef.current = script
    } else if (window.google?.maps) {
      initMap()
    } else if (existingScript) {
      existingScript.addEventListener('load', initMap, { once: true })
    }

    return () => {
      cleanupMapObjects()
      if (clickListenerRef.current) {
        window.google?.maps?.event?.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (onPolygonChangeRef.current) {
      onPolygonChangeRef.current(polygonPoints)
    }
  }, [polygonPoints])

  useEffect(() => {
    if (center && isValidCoord(center) && mapInstanceRef.current) {
      isPanningRef.current = true
      mapInstanceRef.current.panTo(center)
      mapInstanceRef.current.setZoom(16)

      // Remove previous search pin
      if (searchPinRef.current) {
        searchPinRef.current.setMap(null)
        searchPinRef.current = null
      }

      // Drop a location pin at the searched address
      if (window.google?.maps) {
        const pin = new window.google.maps.Marker({
          position: center,
          map: mapInstanceRef.current,
          title: 'Searched location',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(32, 32),
          },
          animation: window.google.maps.Animation.DROP,
        })
        searchPinRef.current = pin

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="padding:4px;font-size:13px"><strong>Searched Location</strong></div>`,
        })
        pin.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, pin)
        })
      }

      const listener = window.google?.maps?.event?.addListenerOnce(
        mapInstanceRef.current,
        'idle',
        () => {
          isPanningRef.current = false
        }
      )

      return () => {
        if (listener) window.google?.maps?.event?.removeListener(listener)
      }
    }
  }, [center])

  const handleClearPolygon = () => {
    setPolygonPoints([])
  }

  const handleUndoLastPoint = () => {
    setPolygonPoints((prev) => prev.slice(0, -1))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Click on the map to create geozone points (minimum 3 points required)
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUndoLastPoint}
            disabled={polygonPoints.length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearPolygon}
            disabled={polygonPoints.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
      <div
        ref={mapRef}
        style={{ width: '100%', height, borderRadius: '8px', border: '1px solid #e5e7eb' }}
      />
      {polygonPoints.length > 0 && polygonPoints.length < 3 && (
        <p className="text-sm text-amber-600">
          <MapPin className="inline h-4 w-4 mr-1" />
          {polygonPoints.length} point(s) added. Need at least {3 - polygonPoints.length} more for a geozone.
        </p>
      )}
      {polygonPoints.length >= 3 && (
        <p className="text-sm text-green-600">
          <MapPin className="inline h-4 w-4 mr-1" />
          Geozone created with {polygonPoints.length} points. You can drag points to adjust.
        </p>
      )}
    </div>
  )
}
