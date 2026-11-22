
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MissionRouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/missions/:id
// Retrieve a saved mission and restore its data.
export async function GET(
  _request: Request,
  { params }: MissionRouteContext
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Mission ID is required." },
      { status: 400 }
    );
  }

  try {
    const saved = await prisma.mission.findUnique({
      where: { id },
    });

    if (!saved) {
      return NextResponse.json(
        { error: "Mission not found." },
        { status: 404 }
      );
    }

    const mission = {
      id: saved.id,
      name: saved.name,
      flood: JSON.parse(saved.floodGeoJson),
      sites: JSON.parse(saved.inspectionSitesJson),
      flightSettings: JSON.parse(saved.flightSettingsJson),
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };

    return NextResponse.json({ mission });
  } catch (error) {
    console.error("Failed to retrieve mission:", error);

    return NextResponse.json(
      { error: "Could not retrieve mission." },
      { status: 500 }
    );
  }
}

// DELETE /api/missions/:id
// Delete a previously saved mission.
export async function DELETE(
  _request: Request,
  { params }: MissionRouteContext
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Mission ID is required." },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.mission.deleteMany({
      where: { id },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Mission not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      deleted: true,
      id,
    });
  } catch (error) {
    console.error("Failed to delete mission:", error);

    return NextResponse.json(
      { error: "Could not delete mission." },
      { status: 500 }
    );
  }
}
