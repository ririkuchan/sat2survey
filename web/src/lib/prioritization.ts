
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import type { Polygon, MultiPolygon } from "geojson";
import type {
  FloodFeatureCollection,
  InspectionSite,
} from "./scenario";

export type RankedSite = InspectionSite & {
  inFloodArea: boolean;
  priorityScore: number;
  rank: number;
};

export function rankInspectionSites(
  flood: FloodFeatureCollection,
  sites: InspectionSite[]
): RankedSite[] {
  const scoredSites = sites.map((site) => {
    const coordinates: [number, number] = [
      site.longitude,
      site.latitude,
    ];

    const inFloodArea = flood.features.some((feature) =>
      booleanPointInPolygon(
        coordinates,
        feature.geometry as Polygon | MultiPolygon
      )
    );

    const priorityScore =
      site.importance + (inFloodArea ? 5 : 0);

    return {
      ...site,
      inFloodArea,
      priorityScore,
    };
  });

  scoredSites.sort(
    (a, b) =>
      b.priorityScore - a.priorityScore ||
      a.id.localeCompare(b.id)
  );

  return scoredSites.map((site, index) => ({
    ...site,
    rank: index + 1,
  }));
}
