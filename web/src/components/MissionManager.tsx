
"use client";

import { useEffect, useState } from "react";

import type {
  FloodFeatureCollection,
  InspectionSite,
} from "@/lib/scenario";

import type { FlightSettings } from "@/lib/route";

type MissionSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedMission = {
  id: string;
  name: string;
  flood: FloodFeatureCollection;
  sites: InspectionSite[];
  flightSettings: FlightSettings;
};

type Props = {
  flood: FloodFeatureCollection | null;
  sites: InspectionSite[];
  flightSettings: FlightSettings;
  onLoad: (mission: SavedMission) => void;
};

async function fetchMissionList(): Promise<MissionSummary[]> {
  const response = await fetch("/api/missions", {
    cache: "no-store",
  });

  const data = (await response.json()) as {
    missions?: MissionSummary[];
    error?: string;
  };

  if (!response.ok || !Array.isArray(data.missions)) {
    throw new Error(data.error ?? "Could not load mission list.");
  }

  return data.missions;
}

export default function MissionManager({
  flood,
  sites,
  flightSettings,
  onLoad,
}: Props) {
  const [missionName, setMissionName] = useState(
    "Tokyo Flood Assessment"
  );
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch previously saved missions on page load.
  useEffect(() => {
    let active = true;

    void fetchMissionList()
      .then((items) => {
        if (active) {
          setMissions(items);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load missions."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function saveMission() {
    if (!flood || sites.length === 0) {
      setError("Upload flood GeoJSON and inspection sites first.");
      return;
    }

    if (!missionName.trim()) {
      setError("Enter a mission name.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/missions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: missionName.trim(),
          flood,
          sites,
          flightSettings,
        }),
      });

      const data = (await response.json()) as {
        mission?: { id: string };
        error?: string;
      };

      if (!response.ok || !data.mission) {
        throw new Error(data.error ?? "Could not save mission.");
      }

      const items = await fetchMissionList();
      setMissions(items);
      setSelectedId(data.mission.id);
      setMessage("Mission saved to SQLite.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save mission."
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadMission() {
    if (!selectedId) {
      setError("Select a saved mission first.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/missions/${encodeURIComponent(selectedId)}`,
        { cache: "no-store" }
      );

      const data = (await response.json()) as {
        mission?: SavedMission;
        error?: string;
      };

      if (!response.ok || !data.mission) {
        throw new Error(data.error ?? "Could not load mission.");
      }

      onLoad(data.mission);
      setMissionName(data.mission.name);
      setMessage(`Loaded: ${data.mission.name}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load mission."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteMission() {
    if (!selectedId) {
      setError("Select a saved mission first.");
      return;
    }

    const selected = missions.find(
      (mission) => mission.id === selectedId
    );

    const confirmed = window.confirm(
      `Delete "${selected?.name ?? selectedId}" from SQLite?`
    );

    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/missions/${encodeURIComponent(selectedId)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = (await response.json()) as {
          error?: string;
        };

        throw new Error(data.error ?? "Could not delete mission.");
      }

      const items = await fetchMissionList();
      setMissions(items);
      setSelectedId("");
      setMessage("Saved mission deleted.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete mission."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">
          Mission Manager
        </h3>
        <span className="text-xs text-slate-400">
          R4 / Mission Persistence
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-400">
        Save flood data, inspection sites, and flight settings
        to SQLite. Load them again after refreshing the page.
      </p>

      <div className="mt-6">
        <label className="block text-sm text-slate-300">
          Mission Name
          <input
            type="text"
            maxLength={100}
            value={missionName}
            onChange={(event) =>
              setMissionName(event.target.value)
            }
            placeholder="Enter a mission name"
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          />
        </label>

        <button
          type="button"
          onClick={() => void saveMission()}
          disabled={busy || !flood || sites.length === 0}
          className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Processing..." : "Save Mission"}
        </button>
      </div>

      <div className="mt-6 border-t border-slate-700 pt-5">
        <h4 className="font-semibold">Saved Missions</h4>

        <p className="mt-2 text-xs text-slate-400">
          {missions.length} mission(s) in SQLite
        </p>

        <select
          aria-label="Choose saved mission"
          value={selectedId}
          onChange={(event) =>
            setSelectedId(event.target.value)
          }
          disabled={busy || missions.length === 0}
          className="mt-3 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          <option value="">Select a saved mission</option>
          {missions.map((mission) => (
            <option key={mission.id} value={mission.id}>
              {mission.name}
            </option>
          ))}
        </select>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadMission()}
            disabled={busy || !selectedId}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Load Mission
          </button>

          <button
            type="button"
            onClick={() => void deleteMission()}
            disabled={busy || !selectedId}
            className="rounded-md border border-red-700 px-4 py-2 text-sm font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete Mission
          </button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="mt-5 rounded-md border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-300"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-md border border-red-800 bg-red-950 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <p className="mt-5 text-xs text-slate-500">
        Each save creates a new mission record. Missions are
        stored locally and are not synchronized to the cloud.
      </p>
    </div>
  );
}
