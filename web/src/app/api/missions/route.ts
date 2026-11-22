
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { parseFloodGeoJSON } from "@/lib/scenario";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validCoordinate(
  value: unknown,
  limit: number
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  );
}

// GET /api/missions
// List previously saved missions.
export async function GET() {
  try {
    const missions = await prisma.mission.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ missions });
  } catch (error) {
    console.error("Failed to list missions:", error);

    return NextResponse.json(
      { error: "Could not load missions." },
      { status: 500 }
    );
  }
}

// POST /api/missions
// Save a mission snapshot to SQLite.
export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!isRecord(payload)) {
    return NextResponse.json(
      { error: "Invalid mission data." },
      { status: 400 }
    );
  }

  const { name, flood, sites, flightSettings } = payload;

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.trim().length > 100
  ) {
    return NextResponse.json(
      { error: "Mission name must be 1–100 characters." },
      { status: 400 }
    );
  }

  // Validate the flood GeoJSON using our existing R1 parser.
  try {
    parseFloodGeoJSON(JSON.stringify(flood));
  } catch {
    return NextResponse.json(
      { error: "Invalid flood GeoJSON." },
      { status: 400 }
    );
  }

  // Validate inspection sites.
  if (
    !Array.isArray(sites) ||
    sites.length === 0 ||
    sites.length > 1000
  ) {
    return NextResponse.json(
      { error: "A mission needs 1–1000 inspection sites." },
      { status: 400 }
    );
  }

  const seenIds = new Set<string>();

  for (const site of sites) {
    if (
      !isRecord(site) ||
      typeof site.id !== "string" ||
      site.id.trim().length === 0 ||
      seenIds.has(site.id) ||
      typeof site.name !== "string" ||
      site.name.trim().length === 0 ||
      !validCoordinate(site.latitude, 90) ||
      !validCoordinate(site.longitude, 180) ||
      typeof site.importance !== "number" ||
      !Number.isInteger(site.importance) ||
      site.importance < 1 ||
      site.importance > 5
    ) {
      return NextResponse.json(
        { error: "Invalid inspection-site data." },
        { status: 400 }
      );
    }

    seenIds.add(site.id);
  }

  // Validate flight settings.
  if (
    !isRecord(flightSettings) ||
    !isRecord(flightSettings.base) ||
    !validCoordinate(flightSettings.base.latitude, 90) ||
    !validCoordinate(flightSettings.base.longitude, 180) ||
    typeof flightSettings.speedKmH !== "number" ||
    !Number.isFinite(flightSettings.speedKmH) ||
    flightSettings.speedKmH <= 0 ||
    typeof flightSettings.maxFlightMinutes !== "number" ||
    !Number.isFinite(flightSettings.maxFlightMinutes) ||
    flightSettings.maxFlightMinutes <= 0 ||
    typeof flightSettings.inspectionMinutes !== "number" ||
    !Number.isFinite(flightSettings.inspectionMinutes) ||
    flightSettings.inspectionMinutes < 0
  ) {
    return NextResponse.json(
      { error: "Invalid flight settings." },
      { status: 400 }
    );
  }

  try {
    const mission = await prisma.mission.create({
      data: {
        name: name.trim(),
        floodGeoJson: JSON.stringify(flood),
        inspectionSitesJson: JSON.stringify(sites),
        flightSettingsJson: JSON.stringify(flightSettings),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { mission },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to save mission:", error);

    return NextResponse.json(
      { error: "Could not save mission." },
      { status: 500 }
    );
  }
}
