import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFloodGeoJSON, parseInspectionSitesCsv } from './scenario.ts';

const sampleFlood = JSON.stringify({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { source: 'sample' },
    geometry: { type: 'Polygon', coordinates: [[[139, 35], [140, 35], [140, 36], [139, 35]]] },
  }],
});

test('accepts a valid GeoJSON flood polygon', () => {
  assert.equal(parseFloodGeoJSON(sampleFlood).features.length, 1);
});

test('rejects malformed GeoJSON and unsupported geometry', () => {
  assert.throws(() => parseFloodGeoJSON('{oops'), /valid GeoJSON/);
  assert.throws(() => parseFloodGeoJSON(JSON.stringify({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [139, 35] } }],
  })), /Polygon or MultiPolygon/);
});

test('accepts quoted site names and importance 1–5', () => {
  const csv = 'id,name,latitude,longitude,importance\r\n1,"Clinic, East",35.5,139.5,5\r\n';
  assert.deepEqual(parseInspectionSitesCsv(csv), [{
    id: '1', name: 'Clinic, East', latitude: 35.5, longitude: 139.5, importance: 5,
  }]);
});

test('rejects missing columns, bad coordinates, and duplicate IDs', () => {
  assert.throws(() => parseInspectionSitesCsv('id,name,latitude,longitude\n1,A,35,139'), /importance/);
  assert.throws(() => parseInspectionSitesCsv('id,name,latitude,longitude,importance\n1,A,100,139,5'), /latitude\/longitude/);
  assert.throws(() => parseInspectionSitesCsv('id,name,latitude,longitude,importance\n1,A,35,139,5\n1,B,36,140,4'), /unique ID/);
});

test('rejects missing or out-of-range importance', () => {
  assert.throws(() => parseInspectionSitesCsv('id,name,latitude,longitude,importance\n1,A,35,139,'), /importance/);
  assert.throws(() => parseInspectionSitesCsv('id,name,latitude,longitude,importance\n1,A,35,139,6'), /importance/);
});
