
import test from "node:test";
import assert from "node:assert/strict";
import {
  planFlightRoute,
  haversineKm,
  type FlightSettings,
} from "./route.ts";
import type { RankedSite } from "./prioritization";

const settings: FlightSettings = {
  base: {
    latitude: 35,
    longitude: 139,
  },
  speedKmH: 36,
  maxFlightMinutes: 15,
  inspectionMinutes: 2,
};

const sites: RankedSite[] = [
  {
    id: "A",
    name: "Clinic",
    latitude: 35,
    longitude: 139.01,
    importance: 5,
    inFloodArea: true,
    priorityScore: 10,
    rank: 1,
  },
  {
    id: "B",
    name: "Remote Depot",
    latitude: 35,
    longitude: 139.2,
    importance: 4,
    inFloodArea: true,
    priorityScore: 9,
    rank: 2,
  },
  {
    id: "C",
    name: "School",
    latitude: 35,
    longitude: 139.015,
    importance: 3,
    inFloodArea: true,
    priorityScore: 8,
    rank: 3,
  },
];

test("calculates zero distance for identical coordinates", () => {
  assert.equal(
    haversineKm(settings.base, settings.base),
    0
  );
});

test("selects feasible sites and skips distant ones", () => {
  const result = planFlightRoute(sites, settings);

  assert.deepEqual(
    result.selectedSites.map((site) => site.id),
    ["A", "C"]
  );

  assert.deepEqual(
    result.skippedSites.map((site) => site.id),
    ["B"]
  );

  assert.ok(
    result.totalMinutes <= settings.maxFlightMinutes
  );
});

test("includes a return leg to base", () => {
  const result = planFlightRoute(sites, settings);

  assert.equal(result.legs[0].from, "BASE");
  assert.equal(result.legs[0].to, "A");
  assert.equal(result.legs.at(-1)?.to, "BASE");
});

test("rejects a site when there is not enough time to return", () => {
  const result = planFlightRoute(
    [sites[0]],
    {
      ...settings,
      maxFlightMinutes: 3.5,
    }
  );

  assert.equal(result.selectedSites.length, 0);
  assert.equal(result.skippedSites.length, 1);
  assert.equal(result.totalMinutes, 0);
});

test("handles an empty site list", () => {
  const result = planFlightRoute([], settings);

  assert.equal(result.selectedSites.length, 0);
  assert.equal(result.legs.length, 0);
  assert.equal(result.totalMinutes, 0);
});

test("rejects invalid flight settings", () => {
  assert.throws(() =>
    planFlightRoute(sites, {
      ...settings,
      speedKmH: 0,
    })
  );

  assert.throws(() =>
    planFlightRoute(sites, {
      ...settings,
      inspectionMinutes: -1,
    })
  );
});
