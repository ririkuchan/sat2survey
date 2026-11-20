
"use client";

import { useEffect, useRef } from "react";
import type {
  FloodFeatureCollection,
  InspectionSite,
} from "@/lib/scenario";

type Props = {
  flood: FloodFeatureCollection | null;
  sites: InspectionSite[];
};

export default function ScenarioMap({ flood, sites }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;

    async function initializeMap() {
      const L = await import("leaflet");

      if (disposed || !containerRef.current) return;

      map = L.map(containerRef.current).setView(
        [35.67, 139.71],
        12
      );

      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
      ).addTo(map);

      const layers = L.featureGroup().addTo(map);

      if (flood) {
        L.geoJSON(
          flood as unknown as Parameters<typeof L.geoJSON>[0],
          {
            style: {
              color: "#38bdf8",
              weight: 2,
              fillColor: "#38bdf8",
              fillOpacity: 0.3,
            },
          }
        ).addTo(layers);
      }

      for (const site of sites) {
        const marker = L.circleMarker(
          [site.latitude, site.longitude],
          {
            radius: 7,
            color: "#ffffff",
            weight: 2,
            fillColor: "#f97316",
            fillOpacity: 0.95,
          }
        );

        const popup = document.createElement("div");
        popup.textContent =
          `${site.name} — Importance: ${site.importance}`;

        marker.bindPopup(popup).addTo(layers);
      }

      if (layers.getLayers().length > 0) {
        map.fitBounds(layers.getBounds().pad(0.15));
      }
    }

    void initializeMap();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [flood, sites]);

  return (
    <div
      ref={containerRef}
      className="mt-4 h-[420px] w-full rounded-lg"
      aria-label="Flood areas and inspection sites map"
    />
  );
}
