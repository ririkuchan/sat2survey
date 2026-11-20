
import test from "node:test";
import assert from "node:assert/strict";
import { rankInspectionSites } from "./prioritization.ts";
import type {
  FloodFeatureCollection,
  InspectionSite,
} from "./scenario";

const flood: FloodFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[
          [139, 35],
          [140, 35],
          [140, 36],
          [139, 36],
          [139, 35],
        ]],
      },
    },
  ],
};

const sites: InspectionSite[] = [
  {
    id: "A",
    name: "Clinic",
    latitude: 35.5,
    longitude: 139.5,
    importance: 5,
  },
  {
    id: "B",
    name: "Depot",
    latitude: 36.5,
    longitude: 139.5,
    importance: 5,
  },
  {
    id: "C",
    name: "School",
    latitude: 35.4,
    longitude: 139.4,
    importance: 3,
  },
];

test("ranks flooded sites higher", () => {
  const result = rankInspectionSites(flood, sites);

  assert.deepEqual(
    result.map((site) => site.id),
    ["A", "C", "B"]
  );

  assert.deepEqual(
    result.map((site) => site.priorityScore),
    [10, 8, 5]
  );
});

test("identifies sites inside and outside the flood", () => {
  const result = rankInspectionSites(flood, sites);

  assert.deepEqual(
    result.map((site) => site.inFloodArea),
    [true, true, false]
  );
});

test("assigns ranks starting at one", () => {
  const result = rankInspectionSites(flood, sites);

  assert.deepEqual(
    result.map((site) => site.rank),
    [1, 2, 3]
  );
});
