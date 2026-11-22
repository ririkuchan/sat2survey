
"use client";

import { useState, type ChangeEvent } from "react";

import {
  parseFloodGeoJSON,
  parseInspectionSitesCsv,
  type FloodFeatureCollection,
  type InspectionSite,
} from "@/lib/scenario";

import { rankInspectionSites } from "@/lib/prioritization";

import {
  planFlightRoute,
  type FlightSettings,
} from "@/lib/route";

import ScenarioMap from "@/components/ScenarioMap";
import FlightPlanner from "@/components/FlightPlanner";
import MissionManager, {
  type SavedMission,
} from "@/components/MissionManager";

export default function Home() {
  // Flood dataset information
  const [flood, setFlood] = useState<{
    name: string;
    count: number;
  } | null>(null);

  const [floodData, setFloodData] =
    useState<FloodFeatureCollection | null>(null);

  // Inspection sites
  const [sites, setSites] = useState<InspectionSite[]>([]);
  const [siteFile, setSiteFile] = useState("");

  // Validation messages
  const [error, setError] = useState("");

  // UAS flight planning settings
  const [flightSettings, setFlightSettings] =
    useState<FlightSettings>({
      base: {
        latitude: 35.67,
        longitude: 139.71,
      },
      speedKmH: 36,
      maxFlightMinutes: 30,
      inspectionMinutes: 2,
    });

  // Load and validate flood GeoJSON
  async function loadFlood(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    try {
      const data = parseFloodGeoJSON(await file.text());

      setFloodData(data);

      setFlood({
        name: file.name,
        count: data.features.length,
      });
    } catch (err) {
      setFlood(null);
      setFloodData(null);

      setError(
        err instanceof Error
          ? err.message
          : "Invalid GeoJSON"
      );
    }
  }

  // Load and validate inspection-site CSV
  async function loadSites(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    try {
      const data = parseInspectionSitesCsv(await file.text());

      setSites(data);
      setSiteFile(file.name);
    } catch (err) {
      setSites([]);
      setSiteFile("");

      setError(
        err instanceof Error
          ? err.message
          : "Invalid CSV"
      );
    }
  }

  // Update importance for an individual inspection site
  function updateImportance(
    siteId: string,
    importance: number
  ) {
    if (
      !Number.isInteger(importance) ||
      importance < 1 ||
      importance > 5
    ) {
      return;
    }

    setSites((currentSites) =>
      currentSites.map((site) =>
        site.id === siteId
          ? { ...site, importance }
          : site
      )
    );
  }

  // R4: Restore a mission saved in SQLite
  function restoreMission(mission: SavedMission) {
    setFloodData(mission.flood);

    setFlood({
      name: `Saved mission: ${mission.name}`,
      count: mission.flood.features.length,
    });

    setSites(mission.sites);
    setSiteFile("Restored from SQLite");
    setFlightSettings(mission.flightSettings);
    setError("");
  }

  // R2: Calculate priorities using flood exposure and importance
  const rankedSites = floodData
    ? rankInspectionSites(floodData, sites)
    : [];

  // R3: Validate UAS flight settings
  const validFlightSettings =
    Number.isFinite(flightSettings.base.latitude) &&
    Math.abs(flightSettings.base.latitude) <= 90 &&
    Number.isFinite(flightSettings.base.longitude) &&
    Math.abs(flightSettings.base.longitude) <= 180 &&
    Number.isFinite(flightSettings.speedKmH) &&
    flightSettings.speedKmH > 0 &&
    Number.isFinite(flightSettings.maxFlightMinutes) &&
    flightSettings.maxFlightMinutes > 0 &&
    Number.isFinite(flightSettings.inspectionMinutes) &&
    flightSettings.inspectionMinutes >= 0;

  // R3: Generate a flight plan with a return-to-base constraint
  const routePlan =
    rankedSites.length > 0 && validFlightSettings
      ? planFlightRoute(rankedSites, flightSettings)
      : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 px-8 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Sat2Survey
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Satellite-Informed UAS Disaster Assessment Planner
            </p>
          </div>

          <span className="rounded-full border border-sky-800 px-3 py-1 text-xs text-sky-300">
            Development Prototype
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-8 py-10">
        {/* Introduction */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">
            Mission Planning
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Disaster Assessment Workspace
          </h2>

          <p className="mt-3 max-w-2xl text-slate-400">
            Start by loading a historical flood dataset and a list
            of inspection sites. The application will validate the
            files before they are used for mission planning.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left Column: Data Upload */}
          <section className="space-y-5">
            {/* Flood GeoJSON Upload */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold">
                01 / Disaster Data
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Upload a GeoJSON file containing flood polygons.
              </p>

              <input
                type="file"
                accept=".geojson,.json"
                onChange={loadFlood}
                aria-label="Upload flood GeoJSON"
                className="mt-5 block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-sky-700 file:px-3 file:py-2 file:text-white"
              />

              <p className="mt-4 text-sm text-slate-400">
                {flood
                  ? `Loaded: ${flood.name}`
                  : "No flood dataset loaded"}
              </p>
            </div>

            {/* Inspection Site CSV Upload */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold">
                02 / Inspection Sites
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Upload a CSV with id, name, latitude, longitude,
                and importance (1–5).
              </p>

              <input
                type="file"
                accept=".csv"
                onChange={loadSites}
                aria-label="Upload inspection sites CSV"
                className="mt-5 block w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-sky-700 file:text-white"
              />

              <p className="mt-4 text-sm text-slate-400">
                {siteFile
                  ? `Loaded: ${siteFile}`
                  : "No inspection sites loaded"}
              </p>
            </div>

            {/* Validation Error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-700 bg-red-950 p-4 text-sm text-red-200"
              >
                {error}
              </div>
            )}
          </section>

          {/* Right Column: Dashboard */}
          <section className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">
                  Flood Features
                </p>

                <p className="mt-3 text-4xl font-bold">
                  {flood?.count ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">
                  Inspection Sites
                </p>

                <p className="mt-3 text-4xl font-bold">
                  {sites.length}
                </p>
              </div>
            </div>

            {/* R1: Interactive Leaflet Map */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold">
                Flood & Inspection Map
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Blue: Flood area / Green: Planned route and visits /
                Orange: Other sites / Purple: Base
              </p>

              <ScenarioMap
                flood={floodData}
                sites={sites}
                base={flightSettings.base}
                routePlan={routePlan}
              />
            </div>

            {/* R2: Inspection Site Priority Ranking */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">
                  Inspection Site Priority Ranking
                </h3>

                <span className="text-xs text-slate-400">
                  R2 / Prioritization
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-400">
                Priority Score = Importance + Flood Bonus
                (5 points for sites inside a flooded area)
              </p>

              {rankedSites.length === 0 ? (
                <p className="mt-6 text-sm text-slate-400">
                  Upload both the flood GeoJSON and inspection-site
                  CSV to calculate site priorities.
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-700 text-slate-400">
                      <tr>
                        <th className="py-3">Rank</th>
                        <th>Site</th>
                        <th>Flood</th>
                        <th>Importance</th>
                        <th>Score</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rankedSites.map((site) => (
                        <tr
                          key={site.id}
                          className="border-b border-slate-800"
                        >
                          <td className="py-3 font-semibold text-sky-400">
                            #{site.rank}
                          </td>

                          <td>{site.name}</td>

                          <td>
                            <span
                              className={
                                site.inFloodArea
                                  ? "text-orange-400"
                                  : "text-slate-400"
                              }
                            >
                              {site.inFloodArea
                                ? "Inside"
                                : "Outside"}
                            </span>
                          </td>

                          <td>{site.importance}</td>

                          <td className="font-bold text-sky-300">
                            {site.priorityScore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* R3: UAS Flight Route Planner */}
            <FlightPlanner
              settings={flightSettings}
              onSettingsChange={setFlightSettings}
              plan={routePlan}
              hasData={
                floodData !== null &&
                sites.length > 0
              }
            />

            {/* R4: Mission Persistence */}
            <MissionManager
              flood={floodData}
              sites={sites}
              flightSettings={flightSettings}
              onLoad={restoreMission}
            />

            {/* R2: Scenario Overview with Editable Importance */}
            <div className="min-h-80 rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold">
                Scenario Overview
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Adjust the importance of each inspection site.
                Priority rankings update automatically.
              </p>

              {sites.length === 0 ? (
                <p className="mt-6 text-sm text-slate-400">
                  Upload inspection sites to see their details.
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-700 text-slate-400">
                      <tr>
                        <th className="py-3">Site</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Importance</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sites.map((site) => (
                        <tr
                          key={site.id}
                          className="border-b border-slate-800"
                        >
                          <td className="py-3">
                            {site.name}
                          </td>

                          <td>{site.latitude}</td>

                          <td>{site.longitude}</td>

                          <td>
                            <select
                              value={site.importance}
                              onChange={(event) =>
                                updateImportance(
                                  site.id,
                                  Number(event.target.value)
                                )
                              }
                              aria-label={`Importance for ${site.name}`}
                              className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
                            >
                              {[1, 2, 3, 4, 5].map(
                                (value) => (
                                  <option
                                    key={value}
                                    value={value}
                                  >
                                    {value}
                                  </option>
                                )
                              )}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-800 pt-5 text-xs text-slate-500">
          Sat2Survey / CSE499 Senior Project / BYU–Idaho

          <p className="mt-1">
            Research prototype — not for operational flight use.
          </p>
        </footer>
      </div>
    </main>
  );
}
