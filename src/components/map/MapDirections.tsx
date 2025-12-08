import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

interface MapDirectionsProps {
  visible: boolean;
  onClose: () => void;
  pickupLocation: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
  dropoffLocation: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
}

// Web version of MapDirections (keeps the original API/props but renders with mapbox-gl in the browser)
export default function MapDirections({
  visible,
  onClose,
  pickupLocation,
  dropoffLocation,
}: MapDirectionsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  // treat latitude/longitude of 0 as missing (trip-details may pass 0 when unknown)
  const coordValid = (lat?: number, lng?: number) => {
    return lat !== undefined && lng !== undefined && lat !== 0 && lng !== 0;
  };

  const geocodeAddress = async (address: string) => {
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return null;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.features?.length) {
        const [lng, lat] = data.features[0].center;
        return { latitude: lat, longitude: lng };
      }
      return null;
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  };

  const loadRouteAndDraw = async (map: mapboxgl.Map, pick: { latitude: number; longitude: number }, drop: { latitude: number; longitude: number }) => {
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      const coords = `${pick.longitude},${pick.latitude};${drop.longitude},${drop.latitude}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data?.routes?.length) return;
      const route = data.routes[0];

      if (map.getSource("route")) {
        if (map.getLayer("route")) map.removeLayer("route");
        if (map.getLayer("route-casing")) map.removeLayer("route-casing");
        map.removeSource("route");
      }

      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: route.geometry,
        },
      });

      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#1e40af", "line-width": 8 },
      });

      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#3b82f6", "line-width": 6 },
      });

      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMin = Math.round(route.duration / 60);
      setRouteInfo({ distance: `${distanceKm} km`, duration: `${durationMin} min` });

      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([pick.longitude, pick.latitude]);
      bounds.extend([drop.longitude, drop.latitude]);
      map.fitBounds(bounds, { padding: 80 });
    } catch (err) {
      console.error("Error loading route", err);
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (typeof window === "undefined") return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token missing. Set NEXT_PUBLIC_MAPBOX_TOKEN in your environment.");
      setLoading(false);
      return;
    }

    // inject css if not present
    if (!document.getElementById("mapbox-gl-css")) {
      const link = document.createElement("link");
      link.id = "mapbox-gl-css";
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css";
      document.head.appendChild(link);
    }

    mapboxgl.accessToken = token;
    let cancelled = false;

    (async () => {
      setLoading(true);

      // copy so we don't mutate props
      const pick = { ...pickupLocation } as { latitude?: number; longitude?: number; address: string };
      const drop = { ...dropoffLocation } as { latitude?: number; longitude?: number; address: string };

      if (!coordValid(pick.latitude, pick.longitude)) {
        const p = await geocodeAddress(pick.address);
        if (p) {
          pick.latitude = p.latitude;
          pick.longitude = p.longitude;
        }
      }

      if (!coordValid(drop.latitude, drop.longitude)) {
        const d = await geocodeAddress(drop.address);
        if (d) {
          drop.latitude = d.latitude;
          drop.longitude = d.longitude;
        }
      }

      if (!pick.latitude || !pick.longitude || !drop.latitude || !drop.longitude) {
        console.error("Could not determine coordinates for pickup or dropoff");
        setLoading(false);
        return;
      }

      if (containerRef.current) {
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/navigation-day-v1",
          center: [pick.longitude as number, pick.latitude as number],
          zoom: 10,
        });

        map.addControl(new mapboxgl.NavigationControl());

        const makeMarker = (lng: number, lat: number, color = "#10b981", text = "") => {
          const el = document.createElement("div");
          el.style.background = color;
          el.style.width = "28px";
          el.style.height = "28px";
          el.style.borderRadius = "50%";
          el.style.border = "3px solid white";
          el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
          return new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).setPopup(new mapboxgl.Popup({ offset: 25 }).setText(text)).addTo(map);
        };

        makeMarker(pick.longitude as number, pick.latitude as number, "#10b981", `Pickup: ${pick.address}`);
        makeMarker(drop.longitude as number, drop.latitude as number, "#ef4444", `Dropoff: ${drop.address}`);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            makeMarker(pos.coords.longitude, pos.coords.latitude, "#3b82f6", "Your location");
          }, (err) => {
            // ignore permission error
          });
        }

        mapRef.current = map;
        await loadRouteAndDraw(map, { latitude: pick.latitude as number, longitude: pick.longitude as number }, { latitude: drop.latitude as number, longitude: drop.longitude as number });

        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[95%] md:w-3/4 lg:w-2/3 h-[80vh] mt-12 bg-white rounded-md shadow-lg overflow-hidden">
        <div className="flex items-center justify-between bg-blue-700 text-white px-4 py-3">
          <div className="text-lg font-semibold">Trip Route</div>
          <button onClick={onClose} className="text-white/90 hover:text-white">Close</button>
        </div>

        {routeInfo && (
          <div className="flex gap-6 p-3 bg-slate-50 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 7.9L4.5 7.5 12 4.1 19.5 7.5 12 9.9z"/></svg>
              <div>{routeInfo.distance}</div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1v11l8.5 4.6.5-1-7.5-4.1V1z"/></svg>
              <div>{routeInfo.duration}</div>
            </div>
          </div>
        )}

        <div ref={containerRef} style={{ width: "100%", height: "calc(100% - 64px)" }} />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <div className="text-sm text-slate-700">Loading map…</div>
          </div>
        )}
      </div>
    </div>
  );
}
