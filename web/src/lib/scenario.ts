/** Input validation for the prepared historical flood scenario used by Sat2Survey. */
export type InspectionSite = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  importance: number;
};

type FloodGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: unknown;
};

export type FloodFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: FloodGeometry;
    properties: Record<string, unknown> | null;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPosition(value: unknown): value is number[] {
  return Array.isArray(value) && value.length >= 2 &&
    typeof value[0] === 'number' && Number.isFinite(value[0]) &&
    typeof value[1] === 'number' && Number.isFinite(value[1]) &&
    value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;
}

function isRing(value: unknown): boolean {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) return false;
  const first = value[0];
  const last = value[value.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function isPolygon(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(isRing);
}

export function parseFloodGeoJSON(text: string): FloodFeatureCollection {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Flood data must be valid GeoJSON (JSON text).');
  }
  if (!isRecord(parsed) || parsed.type !== 'FeatureCollection' ||
      !Array.isArray(parsed.features) || parsed.features.length === 0) {
    throw new Error('Flood data must be a nonempty GeoJSON FeatureCollection.');
  }
  for (const [index, feature] of parsed.features.entries()) {
    if (!isRecord(feature) || feature.type !== 'Feature' || !isRecord(feature.geometry)) {
      throw new Error(`Feature ${index + 1} must contain a geometry.`);
    }
    const { type, coordinates } = feature.geometry;
    const valid = type === 'Polygon' ? isPolygon(coordinates) :
      type === 'MultiPolygon' && Array.isArray(coordinates) &&
      coordinates.length > 0 && coordinates.every(isPolygon);
    if (!valid) {
      throw new Error(`Feature ${index + 1} must have valid Polygon or MultiPolygon coordinates.`);
    }
    if (feature.properties !== null && feature.properties !== undefined &&
        !isRecord(feature.properties)) {
      throw new Error(`Feature ${index + 1} has invalid properties.`);
    }
  }
  return parsed as FloodFeatureCollection;
}

/** Parse CSV including quoted cells, doubled quotes, and CRLF line endings. */
function readCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || field === '') {
        quoted = !quoted;
      } else {
        throw new Error('Invalid quote in inspection-site CSV.');
      }
    } else if (ch === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (quoted) throw new Error('Unclosed quoted field in inspection-site CSV.');
  row.push(field.trim());
  if (row.some(cell => cell !== '')) rows.push(row);
  return rows;
}

export function parseInspectionSitesCsv(text: string): InspectionSite[] {
  const rows = readCsvRows(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('Inspection-site CSV needs a header and at least one site.');
  const headers = rows[0].map(name => name.toLowerCase());
  const required = ['id', 'name', 'latitude', 'longitude', 'importance'];
  for (const column of required) {
    if (headers.filter(header => header === column).length !== 1) {
      throw new Error(`CSV must contain exactly one '${column}' column.`);
    }
  }
  const seen = new Set<string>();
  return rows.slice(1).map((row, index) => {
    if (row.length !== headers.length) throw new Error(`CSV row ${index + 2} has the wrong number of fields.`);
    const get = (column: string) => row[headers.indexOf(column)];
    const id = get('id');
    const name = get('name');
    const latitudeText = get('latitude');
    const longitudeText = get('longitude');
    const importanceText = get('importance');
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    const importance = Number(importanceText);
    if (!id || !name || seen.has(id)) throw new Error(`CSV row ${index + 2} needs a unique ID and name.`);
    if (!latitudeText || !longitudeText || !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) || latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180) {
      throw new Error(`CSV row ${index + 2} has invalid latitude/longitude.`);
    }
    if (!importanceText || !Number.isInteger(importance) || importance < 1 || importance > 5) {
      throw new Error(`CSV row ${index + 2} must have importance from 1 to 5.`);
    }
    seen.add(id);
    return { id, name, latitude, longitude, importance };
  });
}
