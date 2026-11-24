
"use client";

import {
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  FlightSettings,
  RoutePlan,
} from "@/lib/route";

import { buildWaypointCsv } from "@/lib/waypoints";

type Props = {
  settings: FlightSettings;
  onSettingsChange: Dispatch<SetStateAction<FlightSettings>>;
  plan: RoutePlan | null;
  hasData: boolean;
};

export default function FlightPlanner({
  settings,
  onSettingsChange,
  plan,
  hasData,
}: Props) {
  const [exportError, setExportError] = useState("");

  function updateSetting(
    key: "speedKmH" | "maxFlightMinutes" | "inspectionMinutes",
    value: string
  ) {
    onSettingsChange((current) => ({
      ...current,
      [key]: Number(value),
    }));
  }

  function updateBase(
    key: "latitude" | "longitude",
    value: string
  ) {
    onSettingsChange((current) => ({
      ...current,
      base: {
        ...current.base,
        [key]: Number(value),
      },
    }));
  }

  // E2: Download the selected flight route as CSV.
  function downloadWaypoints() {
    if (!plan || plan.selectedSites.length === 0) {
      setExportError("No inspection sites selected for export.");
      return;
    }

    setExportError("");

    try {
      const csv = buildWaypointCsv(plan, settings.base);

      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "sat2survey-waypoints.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Release the temporary URL after the download starts.
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Could not export waypoints."
      );
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">
          UAS Flight Route Planner
        </h3>

        <span className="text-xs text-slate-400">
          R3 / Route Planning
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-400">
        Plan an inspection route within a mission time limit,
        including the return flight to base.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-300">
          Base Latitude
          <input
            type="number"
            step="any"
            min={-90}
            max={90}
            value={settings.base.latitude}
            onChange={(event) =>
              updateBase("latitude", event.target.value)
            }
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Base Longitude
          <input
            type="number"
            step="any"
            min={-180}
            max={180}
            value={settings.base.longitude}
            onChange={(event) =>
              updateBase("longitude", event.target.value)
            }
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Flight Speed (km/h)
          <input
            type="number"
            step="1"
            min="1"
            value={settings.speedKmH}
            onChange={(event) =>
              updateSetting("speedKmH", event.target.value)
            }
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Maximum Mission Time (min)
          <input
            type="number"
            step="1"
            min="1"
            value={settings.maxFlightMinutes}
            onChange={(event) =>
              updateSetting("maxFlightMinutes", event.target.value)
            }
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          />
        </label>

        <label className="block text-sm text-slate-300">
          Inspection Time per Site (min)
          <input
            type="number"
            step="1"
            min="0"
            value={settings.inspectionMinutes}
            onChange={(event) =>
              updateSetting("inspectionMinutes", event.target.value)
            }
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          />
        </label>
      </div>

      <div className="mt-6 border-t border-slate-700 pt-5">
        <h4 className="font-semibold">
          Mission Plan
        </h4>

        {!hasData ? (
          <p className="mt-4 text-sm text-slate-400">
            Upload flood GeoJSON and inspection-site CSV
            to generate a flight plan.
          </p>
        ) : !plan ? (
          <p className="mt-4 text-sm text-orange-400">
            Enter valid base coordinates and flight settings
            to calculate a mission plan.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-800 p-4">
                <p className="text-xs text-slate-400">
                  Selected Sites
                </p>
                <p className="mt-2 text-2xl font-bold text-sky-300">
                  {plan.selectedSites.length}
                </p>
              </div>

              <div className="rounded-lg bg-slate-800 p-4">
                <p className="text-xs text-slate-400">
                  Skipped Sites
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {plan.skippedSites.length}
                </p>
              </div>

              <div className="rounded-lg bg-slate-800 p-4">
                <p className="text-xs text-slate-400">
                  Total Distance
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {plan.totalDistanceKm.toFixed(2)} km
                </p>
              </div>

              <div className="rounded-lg bg-slate-800 p-4">
                <p className="text-xs text-slate-400">
                  Total Mission Time
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {plan.totalMinutes.toFixed(1)} min
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2 text-sm text-slate-300">
              <p>
                Travel Time: {plan.travelMinutes.toFixed(1)} min
              </p>
              <p>
                Inspection Time: {plan.inspectionMinutes.toFixed(1)} min
              </p>
              <p>
                Remaining Time: {plan.remainingMinutes.toFixed(1)} min
              </p>
            </div>

            <div className="mt-5">
              <h4 className="text-sm font-semibold">
                Planned Route
              </h4>

              {plan.selectedSites.length === 0 ? (
                <p className="mt-2 text-sm text-orange-400">
                  No inspection sites fit within the mission time limit.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-7 text-sky-300">
                  {[
                    "BASE",
                    ...plan.selectedSites.map((site) => site.name),
                    "BASE",
                  ].join(" → ")}
                </p>
              )}
            </div>

            {plan.skippedSites.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold">
                  Skipped Inspection Sites
                </h4>

                <p className="mt-2 text-sm text-slate-400">
                  {plan.skippedSites
                    .map((site) => site.name)
                    .join(", ")}
                </p>
              </div>
            )}

            {/* E2: Waypoint CSV Export */}
            <div className="mt-6 border-t border-slate-700 pt-5">
              <div className="flex items-center justify-between gap-4">
                <h4 className="font-semibold">
                  Waypoint CSV Export
                </h4>

                <span className="text-xs text-sky-400">
                  E2 / Enhancement
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-400">
                Export the selected route in visit order,
                including departure and return to base.
              </p>

              <button
                type="button"
                onClick={downloadWaypoints}
                disabled={plan.selectedSites.length === 0}
                className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download Waypoints CSV
              </button>

              {plan.selectedSites.length === 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  No route available for export.
                </p>
              )}

              {exportError && (
                <p
                  role="alert"
                  className="mt-3 text-sm text-red-400"
                >
                  {exportError}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <p className="mt-5 text-xs leading-5 text-slate-500">
        Straight-line distance estimate only. This prototype
        does not account for weather, obstacles, airspace,
        or battery reserves. The exported CSV is not a
        QGroundControl mission file. Not for operational
        flight use.
      </p>
    </div>
  );
}
