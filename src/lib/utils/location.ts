export type ParsedLocationPoint = {
  lat: number;
  lng: number;
};

export type ParsedLocation = {
  label: string;
  geocodeText: string;
  point: ParsedLocationPoint | null;
  polygon: number[][] | null;
  raw: unknown;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toNumber = (value: unknown): number | null => {
  const numericValue = typeof value === "string" ? Number(value.trim()) : value;
  return isFiniteNumber(numericValue) ? numericValue : null;
};

const computeCentroid = (polygon: number[][]): ParsedLocationPoint | null => {
  if (!polygon.length) return null;

  const total = polygon.reduce(
    (accumulator, coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) return accumulator;
      return {
        lng: accumulator.lng + Number(coordinate[0] || 0),
        lat: accumulator.lat + Number(coordinate[1] || 0),
        count: accumulator.count + 1,
      };
    },
    { lng: 0, lat: 0, count: 0 },
  );

  if (!total.count) return null;

  return {
    lng: total.lng / total.count,
    lat: total.lat / total.count,
  };
};

const parseCoordinatePair = (
  first: unknown,
  second: unknown,
  explicitOrder?: "latlng" | "lnglat",
): ParsedLocationPoint | null => {
  const firstNumber = toNumber(first);
  const secondNumber = toNumber(second);

  if (firstNumber === null || secondNumber === null) return null;

  if (explicitOrder === "latlng") {
    return { lat: firstNumber, lng: secondNumber };
  }

  if (explicitOrder === "lnglat") {
    return { lat: secondNumber, lng: firstNumber };
  }

  const firstLooksLikeLatitude = Math.abs(firstNumber) <= 90;
  const secondLooksLikeLatitude = Math.abs(secondNumber) <= 90;

  if (firstNumber < 0 && secondNumber > 0 && firstLooksLikeLatitude) {
    return { lat: firstNumber, lng: secondNumber };
  }

  if (firstNumber > 0 && secondNumber < 0 && secondLooksLikeLatitude) {
    return { lat: secondNumber, lng: firstNumber };
  }

  // Default to lng/lat because that is how the stored polygon data is shaped.
  return { lat: secondNumber, lng: firstNumber };
};

const parseCoordinateText = (
  text: string,
): { point: ParsedLocationPoint | null; polygon: number[][] | null } => {
  const cleanedText = text.trim();
  if (!cleanedText) return { point: null, polygon: null };

  const labeledMatch = cleanedText.match(
    /latitude\s*:\s*(-?\d+(?:\.\d+)?)\s*,?\s*longitude\s*:\s*(-?\d+(?:\.\d+)?)/i,
  );
  if (labeledMatch) {
    return {
      point: parseCoordinatePair(labeledMatch[1], labeledMatch[2], "latlng"),
      polygon: null,
    };
  }

  const polygonMatches = [...cleanedText.matchAll(/-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)?/g)];
  if (polygonMatches.length > 1) {
    const polygon = polygonMatches
      .map((match) => {
        const [first, second] = match[0].split(",");
        return parseCoordinatePair(first, second);
      })
      .filter((coordinate): coordinate is ParsedLocationPoint => coordinate !== null)
      .map((coordinate) => [coordinate.lng, coordinate.lat]);

    return {
      point: computeCentroid(polygon),
      polygon: polygon.length > 0 ? polygon : null,
    };
  }

  const simpleMatch = cleanedText.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*-?\d+(?:\.\d+)?)?\s*$/,
  );
  if (simpleMatch) {
    return {
      point: parseCoordinatePair(simpleMatch[1], simpleMatch[2]),
      polygon: null,
    };
  }

  return { point: null, polygon: null };
};

const deriveGeocodeText = (value: string): string => {
  const cleanedValue = value.trim();
  if (!cleanedValue) return "";

  if (!cleanedValue.includes(" - ")) {
    return cleanedValue;
  }

  const segments = cleanedValue
    .split(/\s+-\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    return cleanedValue;
  }

  const lastSegment = segments[segments.length - 1];
  const looksLikePlace = /[a-zA-Z]/.test(lastSegment) && !/\d/.test(lastSegment);

  return looksLikePlace ? lastSegment : cleanedValue;
};

const extractLabel = (value: Record<string, unknown>): string => {
  const labelCandidates = [
    value.place_name,
    value.address,
    value.name,
    value.label,
    value.title,
    value.city,
    value.state,
    value.country,
    value.coordinates,
    value.coords,
  ];

  for (const candidate of labelCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
};

const extractGeocodeText = (value: Record<string, unknown>): string => {
  const geocodeCandidates = [
    value.address,
    value.place_name,
    value.city,
    value.state,
    value.country,
    value.title,
    value.location,
    value.coordinates,
    value.coords,
    value.name,
  ];

  for (const candidate of geocodeCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return deriveGeocodeText(candidate);
    }
  }

  return "";
};

const extractPointFromValue = (value: Record<string, unknown>): ParsedLocationPoint | null => {
  const pointCandidates: Array<[unknown, unknown, "latlng" | "lnglat" | undefined]> = [
    [value.lat, value.lng, "latlng"],
    [value.latitude, value.longitude, "latlng"],
    [value.lng, value.lat, "lnglat"],
    [value.longitude, value.latitude, "lnglat"],
  ];

  for (const [first, second, explicitOrder] of pointCandidates) {
    const point = parseCoordinatePair(first, second, explicitOrder);
    if (point) return point;
  }

  const coordinateFields = [value.coords, value.coordinates, value.location];
  for (const field of coordinateFields) {
    if (typeof field === "string") {
      const parsed = parseCoordinateText(field);
      if (parsed.point) return parsed.point;
    }

    if (Array.isArray(field) && field.length >= 2) {
      const first = field[0];
      const second = field[1];
      const point = parseCoordinatePair(first, second);
      if (point) return point;
    }
  }

  return null;
};

const extractPolygonFromValue = (value: Record<string, unknown>): number[][] | null => {
  const polygonFields = [value.polygon, value.coordinates, value.coords];

  for (const field of polygonFields) {
    if (typeof field === "string") {
      const parsed = parseCoordinateText(field);
      if (parsed.polygon && parsed.polygon.length > 0) return parsed.polygon;
    }

    if (Array.isArray(field) && field.length > 0) {
      const firstEntry = field[0];

      if (Array.isArray(firstEntry)) {
        const polygon = field
          .map((coordinate) => {
            if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
            const first = toNumber(coordinate[0]);
            const second = toNumber(coordinate[1]);
            if (first === null || second === null) return null;
            return [first, second] as number[];
          })
          .filter((coordinate): coordinate is number[] => coordinate !== null);

        if (polygon.length > 0) return polygon;
      }
    }
  }

  return null;
};

export const normalizeLocationInput = (value: unknown): ParsedLocation => {
  if (!value) {
    return { label: "", geocodeText: "", point: null, polygon: null, raw: value };
  }

  if (typeof value === "string") {
    const parsedText = parseCoordinateText(value);
    return {
      label: value.trim(),
      geocodeText: deriveGeocodeText(value),
      point: parsedText.point,
      polygon: parsedText.polygon,
      raw: value,
    };
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const polygon = extractPolygonFromValue(record);
    const point = extractPointFromValue(record) || (polygon ? computeCentroid(polygon) : null);

    return {
      label: extractLabel(record),
      geocodeText: extractGeocodeText(record),
      point,
      polygon,
      raw: value,
    };
  }

  return { label: "", geocodeText: "", point: null, polygon: null, raw: value };
};

export const locationToSearchText = (value: unknown): string => {
  const normalizedLocation = normalizeLocationInput(value);
  return normalizedLocation.label;
};
