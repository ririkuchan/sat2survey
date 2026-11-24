
import test from "node:test";
import assert from "node:assert/strict";

import { buildWaypointCsv } from "./waypoints.ts";
import {
  planFlightRoute,
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

test("exports BASE departure and return", () => {
  const plan = planFlightRoute(sites, settings);

  const csv = buildWaypointCsv(
    plan,
    settings.base
  );

  const rows = csv
    .replace(/^\uFEFF/, "")
    .trimEnd()
    .split("\r\n");

  assert.equal(
    rows[0],
    "sequence,name,latitude,longitude,action"
  );

  assert.equal(
    rows[1],
    "0,BASE,35,139,TAKEOFF"
  );

  assert.equal(
    rows.at(-1),
    "3,BASE,35,139,RETURN"
  );
});

test("preserves visit order and excludes skipped sites", () => {
  const plan = planFlightRoute(sites, settings);

  const csv = buildWaypointCsv(
    plan,
    settings.base
  );

  assert.ok(
    csv.includes("1,Clinic,35,139.01,INSPECT")
  );

  assert.ok(
    csv.includes("2,School,35,139.015,INSPECT")
  );

  assert.ok(!csv.includes("Remote Depot"));
});

test("escapes commas and quotes in waypoint names", () => {
  const plan = planFlightRoute(
    [
      {
        ...sites[0],
        name: 'Clinic "East", Main',
      },
    ],
    settings
  );

  const csv = buildWaypointCsv(
    plan,
    settings.base
  );

  assert.ok(
    csv.includes(
      '1,"Clinic ""East"", Main",35,139.01,INSPECT'
    )
  );
});

test("protects against spreadsheet formulas in names", () => {
  const plan = planFlightRoute(
    [{ ...sites[0], name: "=1+1" }],
    settings
  );

  const csv = buildWaypointCsv(
    plan,
    settings.base
  );

  assert.ok(
    csv.includes("1,'=1+1,35,139.01,INSPECT")
  );
});

test("rejects an empty mission route", () => {
  const plan = planFlightRoute([], settings);

  assert.throws(
    () => buildWaypointCsv(plan, settings.base),
    /No inspection sites selected/
  );
});

test("rejects invalid waypoint coordinates", () => {
  const plan = planFlightRoute(sites, settings);

  assert.throws(
    () =>
      buildWaypointCsv(plan, {
        latitude: 95,
        longitude: 139,
      }),
    /Invalid base coordinates/
  );
});
