"use client";

import React, { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Route } from "lucide-react";
import { normalizeLocationInput } from "@/lib/utils/location";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN;

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function createGeofenceCircle(
  center: { lat: number; lng: number },
  radiusMeters = 200,
): { lat: number; lng: number }[] {
  const points = 32;
  const coords: { lat: number; lng: number }[] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusMeters / 111320) * Math.cos(angle);
    const dy =
      (radiusMeters / (111320 * Math.cos((center.lat * Math.PI) / 180))) *
      Math.sin(angle);
    coords.push({ lat: center.lat + dy, lng: center.lng + dx });
  }
  coords.push(coords[0]);
  return coords;
}

function createCirclePath(
  center: { lat: number; lng: number },
  radiusMeters: number,
): { lat: number; lng: number }[] {
  const points = 64;
  const coords: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusMeters / 111320) * Math.cos(angle);
    const dy =
      (radiusMeters / (111320 * Math.cos((center.lat * Math.PI) / 180))) *
      Math.sin(angle);
    coords.push({ lat: center.lat + dy, lng: center.lng + dx });
  }
  return coords;
}

interface RoutePreviewMapProps {
  origin: unknown;
  destination: unknown;
  routeData?: any;
  stopPoints?: Array<{
    id: number;
    name: string;
    coordinates: number[][];
  }>;
  driverLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
}

export function RoutePreviewMap({
  origin,
  destination,
  routeData,
  stopPoints = [],
  driverLocation,
}: RoutePreviewMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  const [googleRouteInfo, setGoogleRouteInfo] = useState<{
    distance: string;
    duration: string;
    eta: string;
  } | null>(null);

  const normalizedOrigin = useMemo(() => normalizeLocationInput(origin), [origin]);
  const normalizedDestination = useMemo(
    () => normalizeLocationInput(destination),
    [destination],
  );
  const originLabel = normalizedOrigin.label || "Origin";
  const destinationLabel = normalizedDestination.label || "Destination";

  const cleanupMapObjects = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];
    infoWindowsRef.current.forEach((w) => w.close());
    infoWindowsRef.current = [];
  }, []);

  const addMarker = useCallback(
    (
      position: { lat: number; lng: number },
      color: string,
      label: string,
      title: string,
    ) => {
      if (!mapInstanceRef.current) return null;
      const pin = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        label: {
          text: label,
          color: "#fff",
          fontSize: "11px",
          fontWeight: "bold",
        },
      });
      markersRef.current.push(pin);
      return pin;
    },
    [],
  );

  const addInfoWindow = useCallback(
    (position: { lat: number; lng: number }, content: string) => {
      if (!mapInstanceRef.current) return;
      const iw = new google.maps.InfoWindow({ content });
      markersRef.current[markersRef.current.length - 1]?.addListener(
        "click",
        () => {
          infoWindowsRef.current.forEach((w) => w.close());
          iw.open(mapInstanceRef.current, markersRef.current[markersRef.current.length - 1]);
        },
      );
      infoWindowsRef.current.push(iw);
    },
    [],
  );

  const getGoogleRoute = useCallback(
    async (
      originCoords: { lat: number; lng: number },
      destCoords: { lat: number; lng: number },
      waypoints: { lat: number; lng: number }[] = [],
    ): Promise<{ lat: number; lng: number }[] | null> => {
      return new Promise((resolve) => {
        const directionsService = new google.maps.DirectionsService();
        const request: google.maps.DirectionsRequest = {
          origin: originCoords,
          destination: destCoords,
          travelMode: google.maps.TravelMode.DRIVING,
          waypoints: waypoints.map((wp) => ({
            location: wp,
            stopover: true,
          })),
        };

        directionsService.route(request, (result, status) => {
          if (
            status === google.maps.DirectionsStatus.OK &&
            result?.routes?.[0]
          ) {
            const route = result.routes[0];
            const points: { lat: number; lng: number }[] = [];
            let totalDistanceMeters = 0;
            let totalDurationSeconds = 0;
            route.legs.forEach((leg) => {
              totalDistanceMeters += leg.distance?.value || 0;
              totalDurationSeconds += leg.duration?.value || 0;
              leg.steps.forEach((step) => {
                const decoded = decodePolyline(step.polyline.points);
                points.push(...decoded);
              });
            });
            const distanceKm = (totalDistanceMeters / 1000).toFixed(1);
            const hours = Math.floor(totalDurationSeconds / 3600);
            const minutes = Math.round((totalDurationSeconds % 3600) / 60);
            const durationMin = Math.round(totalDurationSeconds / 60);
            const durationText = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
            const eta = new Date(Date.now() + totalDurationSeconds * 1000).toISOString();
            setGoogleRouteInfo({ distance: `${distanceKm} km`, duration: `${durationMin} min`, eta });
            resolve(points);
          } else {
            console.error("Directions request failed:", status);
            setGoogleRouteInfo(null);
            resolve(null);
          }
        });
      });
    },
    [],
  );

  const drawRoute = useCallback(
    (points: { lat: number; lng: number }[], color: string, width: number, dashed = false) => {
      if (!mapInstanceRef.current || points.length === 0) return;
      const polyline = new google.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: dashed ? 0 : 1.0,
        strokeWeight: width,
        map: mapInstanceRef.current,
        icons: dashed
          ? [
              {
                icon: {
                  path: google.maps.SymbolPath.CLOSED_POLYGON,
                  scale: 0,
                },
                offset: "0",
                repeat: "10px",
              },
            ]
          : undefined,
      });

      if (dashed) {
        polyline.setOptions({
          strokeOpacity: 0,
          icons: [
            {
              icon: {
                path: "M 0,-1 0,1",
                strokeOpacity: 1,
                strokeWeight: width,
                strokeColor: color,
                scale: 1,
              },
              offset: "0",
              repeat: "10px",
            },
          ],
        });
      }

      polylinesRef.current.push(polyline);
    },
    [],
  );

  const drawPolygon = useCallback(
    (
      points: { lat: number; lng: number }[],
      fillColor: string,
      strokeColor: string,
      fillOpacity: number,
    ) => {
      if (!mapInstanceRef.current || points.length === 0) return;
      const polygon = new google.maps.Polygon({
        paths: points,
        fillColor,
        fillOpacity,
        strokeColor,
        strokeWeight: 2,
        map: mapInstanceRef.current,
      });
      polygonsRef.current.push(polygon);
    },
    [],
  );

  const fitBounds = useCallback(
    (points: { lat: number; lng: number }[]) => {
      if (!mapInstanceRef.current || points.length === 0) return;
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
    },
    [],
  );

  useEffect(() => {
    if (!origin || !destination || !mapContainer.current) return;

    const loadGoogleMaps = (): Promise<void> => {
      return new Promise((resolve) => {
        if (window.google?.maps) {
          resolve();
          return;
        }
        const existingScript = document.querySelector(
          `script[src*="maps.googleapis.com"]`,
        );
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(), {
            once: true,
          });
          return;
        }
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => {
          console.error("Failed to load Google Maps script");
          resolve();
        };
        document.head.appendChild(script);
        scriptRef.current = script;
      });
    };

    const initializeMap = async () => {
      await loadGoogleMaps();

      if (!window.google?.maps || !mapContainer.current) return;

      if (!mapInstanceRef.current) {
        const map = new google.maps.Map(mapContainer.current, {
          center: { lat: -26.2041, lng: 28.0473 },
          zoom: 6,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });
        mapInstanceRef.current = map;
      }

      await updateRoute(mapInstanceRef.current);
    };

    const updateRoute = async (map: google.maps.Map) => {
      cleanupMapObjects();
      setGoogleRouteInfo(null);

      const originCoords = normalizedOrigin.point;
      const destCoords = normalizedDestination.point;

      if (!originCoords || !destCoords) {
        console.warn("Route Preview - Missing coordinates");
        return;
      }

      const allPoints: { lat: number; lng: number }[] = [originCoords, destCoords];

      // Driver location marker + route
      if (driverLocation) {
        const driverPin = new google.maps.Marker({
          position: driverLocation,
          map,
          title: `Driver: ${driverLocation.name}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          label: {
            text: "D",
            color: "#fff",
            fontSize: "11px",
            fontWeight: "bold",
          },
        });
        markersRef.current.push(driverPin);
        allPoints.push(driverLocation);

        const driverIw = new google.maps.InfoWindow({
          content: `<div style="padding:4px"><strong>Driver: ${driverLocation.name}</strong></div>`,
        });
        driverPin.addListener("click", () => {
          infoWindowsRef.current.forEach((w) => w.close());
          driverIw.open(map, driverPin);
        });
        infoWindowsRef.current.push(driverIw);

        const driverRoute = await getGoogleRoute(
          driverLocation,
          originCoords,
        );
        if (driverRoute) {
          drawRoute(driverRoute, "#1e40af", 3, true);
        }
      }

      // Origin marker
      const originPin = new google.maps.Marker({
        position: originCoords,
        map,
        title: originLabel,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        label: {
          text: "O",
          color: "#fff",
          fontSize: "11px",
          fontWeight: "bold",
        },
      });
      markersRef.current.push(originPin);
      const originIw = new google.maps.InfoWindow({
        content: `<div style="padding:4px"><strong>${originLabel}</strong></div>`,
      });
      originPin.addListener("click", () => {
        infoWindowsRef.current.forEach((w) => w.close());
        originIw.open(map, originPin);
      });
      infoWindowsRef.current.push(originIw);

      // Destination marker
      const destPin = new google.maps.Marker({
        position: destCoords,
        map,
        title: destinationLabel,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        label: {
          text: "D",
          color: "#fff",
          fontSize: "11px",
          fontWeight: "bold",
        },
      });
      markersRef.current.push(destPin);
      const destIw = new google.maps.InfoWindow({
        content: `<div style="padding:4px"><strong>${destinationLabel}</strong></div>`,
      });
      destPin.addListener("click", () => {
        infoWindowsRef.current.forEach((w) => w.close());
        destIw.open(map, destPin);
      });
      infoWindowsRef.current.push(destIw);

      // Stop point markers + circles + polygons
      const waypointCoords: { lat: number; lng: number }[] = [];
      if (stopPoints && stopPoints.length > 0) {
        stopPoints.forEach((stopPoint, index) => {
          const coords = stopPoint.coordinates;
          if (!coords || coords.length === 0) return;

          const avgLat =
            coords.reduce((sum: number, c: number[]) => sum + c[0], 0) /
            coords.length;
          const avgLng =
            coords.reduce((sum: number, c: number[]) => sum + c[1], 0) /
            coords.length;

          waypointCoords.push({ lat: avgLat, lng: avgLng });
          allPoints.push({ lat: avgLat, lng: avgLng });

          // Stop point marker
          const hue = (index * 60) % 360;
          const color = `hsl(${hue}, 70%, 50%)`;
          const spPin = new google.maps.Marker({
            position: { lat: avgLat, lng: avgLng },
            map,
            title: `Stop ${index + 1}: ${stopPoint.name}`,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            label: {
              text: String(index + 1),
              color: "#fff",
              fontSize: "11px",
              fontWeight: "bold",
            },
          });
          markersRef.current.push(spPin);
          const spIw = new google.maps.InfoWindow({
            content: `<div style="padding:4px"><strong>Stop ${index + 1}: ${stopPoint.name}</strong></div>`,
          });
          spPin.addListener("click", () => {
            infoWindowsRef.current.forEach((w) => w.close());
            spIw.open(map, spPin);
          });
          infoWindowsRef.current.push(spIw);

          // Circle for stop point radius
          const lats = coords.map((c) => c[0]);
          const lngs = coords.map((c) => c[1]);
          const radiusKm =
            Math.max(
              (Math.max(...lngs) - Math.min(...lngs)) *
                111.32 *
                Math.cos((avgLat * Math.PI) / 180),
              (Math.max(...lats) - Math.min(...lats)) * 110.54,
            ) / 2;
          const circlePath = createCirclePath(
            { lat: avgLat, lng: avgLng },
            radiusKm * 1000,
          );
          drawPolygon(
            circlePath,
            `hsla(${hue}, 70%, 70%, 0.3)`,
            `hsl(${hue}, 70%, 50%)`,
            0.3,
          );

          // Stop point polygon if available
          if (coords.length >= 3) {
            const polyPoints = coords.map((c) => ({ lat: c[0], lng: c[1] }));
            drawPolygon(
              polyPoints,
              `hsla(${hue}, 70%, 50%, 0.4)`,
              `hsl(${hue}, 70%, 40%)`,
              0.4,
            );
          }
        });
      }

      // Geofence polygons
      const geofences = [
        {
          name: "Loading Location",
          center: originCoords,
          polygon: normalizedOrigin.polygon,
          fillColor: "#22c55e",
          strokeColor: "#16a34a",
        },
        {
          name: "Drop-off Location",
          center: destCoords,
          polygon: normalizedDestination.polygon,
          fillColor: "#ef4444",
          strokeColor: "#dc2626",
        },
      ];

      for (const zone of geofences) {
        const polygon = zone.polygon || createGeofenceCircle(zone.center, 200);
        const polyPoints = polygon.map((p: number[]) => ({
          lat: p[1],
          lng: p[0],
        }));
        drawPolygon(polyPoints, zone.fillColor, zone.strokeColor, 0.2);
      }

      // Main route
      if (routeData?.geometry?.coordinates) {
        // GeoJSON from server (Mapbox format: [[lng, lat], ...])
        const routePoints = routeData.geometry.coordinates.map(
          (c: number[]) => ({ lat: c[1], lng: c[0] }),
        );
        drawRoute(routePoints, "#10b981", 5);
        routePoints.forEach((p) => allPoints.push(p));
      } else {
        const mainRoute = await getGoogleRoute(
          originCoords,
          destCoords,
          waypointCoords,
        );
        if (mainRoute) {
          drawRoute(mainRoute, "#10b981", 5);
          mainRoute.forEach((p) => allPoints.push(p));
        }
      }

      if (driverLocation) {
        allPoints.push(driverLocation);
      }

      fitBounds(allPoints);
    };

    initializeMap();

    return () => {
      cleanupMapObjects();
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [
    origin,
    destination,
    originLabel,
    destinationLabel,
    routeData,
    stopPoints,
    driverLocation,
    normalizedOrigin,
    normalizedDestination,
    cleanupMapObjects,
    addMarker,
    addInfoWindow,
    getGoogleRoute,
    drawRoute,
    drawPolygon,
    fitBounds,
  ]);

  if (!origin || !destination) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Set loading and drop-off locations to preview route</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Route Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={mapContainer}
          className="w-full h-96 rounded-lg border"
          style={{ minHeight: "384px" }}
        />
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Loading: {originLabel || "Not set"}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Drop-off: {destinationLabel || "Not set"}</span>
            </div>
            {stopPoints && stopPoints.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Stop Points: {stopPoints.length} zones</span>
              </div>
            )}
            {driverLocation && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Driver: {driverLocation.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Main Route (Optimized)</span>
            </div>
          </div>

          {stopPoints && stopPoints.length > 0 && (
            <div className="mt-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Selected Stop Points:
              </h4>
              <div className="flex flex-wrap gap-2">
                {stopPoints.map((point, index) => (
                  <span
                    key={point.id}
                    className="px-2 py-1 text-xs rounded"
                    style={{
                      backgroundColor: `hsl(${(index * 60) % 360}, 70%, 90%)`,
                      color: `hsl(${(index * 60) % 360}, 70%, 30%)`,
                    }}
                  >
                    {point.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(routeData || googleRouteInfo) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Route Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Distance:</span>
                    <span className="font-medium">
                      {routeData?.route?.distance || routeData?.distance || googleRouteInfo?.distance || "Calculating..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Driving Time:</span>
                    <span className="font-medium">
                      {routeData?.route?.duration || routeData?.duration || googleRouteInfo?.duration || "Calculating..."}
                    </span>
                  </div>
                  {(routeData?.route?.breakTime || routeData?.breakTime || 0) >
                    0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Break Time:</span>
                      <span className="font-medium text-orange-600">
                        {routeData?.route?.breakTime || routeData?.breakTime} min
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Total Time:</span>
                    <span className="font-semibold">
                      {routeData?.route?.totalDurationWithBreaks ||
                        routeData?.totalDurationWithBreaks ||
                        googleRouteInfo?.duration ||
                        "Calculating..."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">ETA</h4>
                <div className="text-sm">
                  {routeData?.route?.eta || routeData?.eta || googleRouteInfo?.eta ? (
                    <div className="font-medium">
                      {new Date(
                        routeData?.route?.eta || routeData?.eta || googleRouteInfo?.eta || "",
                      ).toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-gray-500">Calculating ETA...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
