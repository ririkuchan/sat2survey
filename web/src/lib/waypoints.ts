
import type {
  Coordinate,
  RoutePlan,
} from "./route";

function validCoordinate(
  latitude: number,
  longitude: number
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

// Escape commas, quotes, and line breaks in CSV fields.
function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

// Prevent spreadsheet programs from treating site names
// beginning with formula characters as executable formulas.
function safeSiteName(name: string): string {
  return /^\s*[=+\-@]/.test(name)
    ? `'${name}`
    : name;
}

/**
 * Export a planned route as a CSV waypoint list.
 *
 * Order:
 * BASE (takeoff) -> selected sites -> BASE (return)
 *
 * Skipped inspection sites are intentionally excluded.
 */
export function buildWaypointCsv(
  plan: RoutePlan,
  base: Coordinate
): string {
  if (
    !validCoordinate(
      base.latitude,
      base.longitude
    )
  ) {
    throw new Error("Invalid base coordinates.");
  }

  if (plan.selectedSites.length === 0) {
    throw new Error(
      "No inspection sites selected for export."
    );
  }

  const rows: string[][] = [
    [
      "sequence",
      "name",
      "latitude",
      "longitude",
      "action",
    ],
    [
      "0",
      "BASE",
      String(base.latitude),
      String(base.longitude),
      "TAKEOFF",
    ],
  ];

  plan.selectedSites.forEach((site, index) => {
    if (
      !validCoordinate(
        site.latitude,
        site.longitude
      ) ||
      !site.name.trim()
    ) {
      throw new Error(
        `Invalid waypoint: ${site.id}`
      );
    }

    rows.push([
      String(index + 1),
      safeSiteName(site.name),
      String(site.latitude),
      String(site.longitude),
      "INSPECT",
    ]);
  });

  rows.push([
    String(plan.selectedSites.length + 1),
    "BASE",
    String(base.latitude),
    String(base.longitude),
    "RETURN",
  ]);

  // UTF-8 BOM helps Excel display non-English names.
  // CRLF is widely supported by spreadsheet programs.
  return (
    "\uFEFF" +
    rows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
