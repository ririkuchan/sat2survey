
import type { RankedSite } from "./prioritization";

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type FlightSettings = {
  base: Coordinate;
  speedKmH: number;
  maxFlightMinutes: number;
  inspectionMinutes: number;
};

export type RouteLeg = {
  from: string;
  to: string;
  distanceKm: number;
};

export type RoutePlan = {
  selectedSites: RankedSite[];
  skippedSites: RankedSite[];
  legs: RouteLeg[];
  totalDistanceKm: number;
  travelMinutes: number;
  inspectionMinutes: number;
  totalMinutes: number;
  remainingMinutes: number;
};

// Estimate straight-line distance between two coordinates.
export function haversineKm(
  a: Coordinate,
  b: Coordinate
): number {
  const toRadians = (degrees: number) =>
    (degrees * Math.PI) / 180;

  const deltaLatitude = toRadians(
    b.latitude - a.latitude
  );
  const deltaLongitude = toRadians(
    b.longitude - a.longitude
  );

  const value =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;

  const clamped = Math.min(1, Math.max(0, value));

  return (
    6371.0088 *
    2 *
    Math.atan2(
      Math.sqrt(clamped),
      Math.sqrt(1 - clamped)
    )
  );
}

export function planFlightRoute(
  sites: RankedSite[],
  settings: FlightSettings
): RoutePlan {
  const {
    base,
    speedKmH,
    maxFlightMinutes,
    inspectionMinutes,
  } = settings;

  if (
    !Number.isFinite(base.latitude) ||
    !Number.isFinite(base.longitude) ||
    Math.abs(base.latitude) > 90 ||
    Math.abs(base.longitude) > 180
  ) {
    throw new Error("Invalid base coordinates");
  }

  if (
    !Number.isFinite(speedKmH) ||
    speedKmH <= 0 ||
    !Number.isFinite(maxFlightMinutes) ||
    maxFlightMinutes <= 0 ||
    !Number.isFinite(inspectionMinutes) ||
    inspectionMinutes < 0
  ) {
    throw new Error("Invalid flight settings");
  }

  const selectedSites: RankedSite[] = [];
  const skippedSites: RankedSite[] = [];
  const legs: RouteLeg[] = [];

  const orderedSites = [...sites].sort(
    (a, b) =>
      a.rank - b.rank ||
      a.id.localeCompare(b.id)
  );

  let currentLocation: Coordinate = base;
  let currentId = "BASE";
  let totalDistanceKm = 0;

  for (const site of orderedSites) {
    const distanceToSite = haversineKm(
      currentLocation,
      site
    );

    const distanceBackToBase = haversineKm(
      site,
      base
    );

    const projectedDistance =
      totalDistanceKm +
      distanceToSite +
      distanceBackToBase;

    const projectedTravelMinutes =
      (projectedDistance / speedKmH) * 60;

    const projectedInspectionMinutes =
      (selectedSites.length + 1) *
      inspectionMinutes;

    const projectedTotalMinutes =
      projectedTravelMinutes +
      projectedInspectionMinutes;

    // Include this site only if return to base is possible.
    if (projectedTotalMinutes <= maxFlightMinutes) {
      selectedSites.push(site);

      legs.push({
        from: currentId,
        to: site.id,
        distanceKm: distanceToSite,
      });

      totalDistanceKm += distanceToSite;
      currentLocation = site;
      currentId = site.id;
    } else {
      skippedSites.push(site);
    }
  }

  // Always include the return leg when sites are selected.
  if (selectedSites.length > 0) {
    const returnDistance = haversineKm(
      currentLocation,
      base
    );

    legs.push({
      from: currentId,
      to: "BASE",
      distanceKm: returnDistance,
    });

    totalDistanceKm += returnDistance;
  }

  const travelMinutes =
    (totalDistanceKm / speedKmH) * 60;

  const totalInspectionMinutes =
    selectedSites.length * inspectionMinutes;

  const totalMinutes =
    travelMinutes + totalInspectionMinutes;

  return {
    selectedSites,
    skippedSites,
    legs,
    totalDistanceKm,
    travelMinutes,
    inspectionMinutes: totalInspectionMinutes,
    totalMinutes,
    remainingMinutes: Math.max(
      0,
      maxFlightMinutes - totalMinutes
    ),
  };
}
