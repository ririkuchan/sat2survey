
"use client";

import { useEffect, useRef } from "react";

import type {
  FloodFeatureCollection,
  InspectionSite,
} from "@/lib/scenario";

import type {
  Coordinate,
  RoutePlan,
} from "@/lib/route";

type Props = {
  flood: FloodFeatureCollection | null;
  sites: InspectionSite[];
  base: Coordinate;
  routePlan: RoutePlan | null;
};

export default function ScenarioMap({
  flood,
  sites,
  base,
  routePlan,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;

    async function initializeMap() {
      const L = await import("leaflet");

      if (disposed || !containerRef.current) {
        return;
      }

      map = L.map(containerRef.current).setView(
        [35.67, 139.71],
        12
      );

      // OpenStreetMap base layer
      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
      ).addTo(map);

      const layers = L.featureGroup().addTo(map);

      // R1: Display flood polygons
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

      const validBase =
        Number.isFinite(base.latitude) &&
        Number.isFinite(base.longitude) &&
        Math.abs(base.latitude) <= 90 &&
        Math.abs(base.longitude) <= 180;

      // R3: Draw route including the return to base
      if (
        validBase &&
        routePlan &&
        routePlan.selectedSites.length > 0
      ) {
        const routeCoordinates: [number, number][] = [
          [base.latitude, base.longitude],

          ...routePlan.selectedSites.map(
            (site): [number, number] => [
              site.latitude,
              site.longitude,
            ]
          ),

          [base.latitude, base.longitude],
        ];

        L.polyline(routeCoordinates, {
          color: "#22c55e",
          weight: 4,
          opacity: 0.95,
          lineJoin: "round",
        }).addTo(layers);
      }

      // Identify selected sites and their visit order
      const visitOrder = new Map(
        routePlan?.selectedSites.map(
          (site, index) => [site.id, index + 1] as const
        ) ?? []
      );

      // R1/R3: Display all inspection sites
      for (const site of sites) {
        const coordinates: [number, number] = [
          site.latitude,
          site.longitude,
        ];

        const order = visitOrder.get(site.id);

        const popup = document.createElement("div");

        popup.textContent =
          `${site.name} — Importance: ${site.importance}` +
          (order !== undefined
            ? ` — Visit #${order}`
            : " — Not selected");

        if (order !== undefined) {
          // Selected site: green marker with visit number
          const icon = L.divIcon({
            className: "sat2survey-visit-marker",
            html: `
              <div style="
                display:flex;
                align-items:center;
                justify-content:center;
                width:26px;
                height:26px;
                border-radius:50%;
                background:#16a34a;
                color:#ffffff;
                border:2px solid #ffffff;
                font-size:13px;
                font-weight:700;
                box-shadow:0 2px 6px #0008;
              ">
                ${order}
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });

          L.marker(coordinates, { icon })
            .bindPopup(popup)
            .addTo(layers);
        } else {
          // Other site: orange circle marker
          L.circleMarker(coordinates, {
            radius: 7,
            color: "#ffffff",
            weight: 2,
            fillColor: "#f97316",
            fillOpacity: 0.95,
          })
            .bindPopup(popup)
            .addTo(layers);
        }
      }

      // R3: Display the launch and return point
      if (validBase) {
        L.circleMarker(
          [base.latitude, base.longitude],
          {
            radius: 10,
            color: "#ffffff",
            weight: 2,
            fillColor: "#a855f7",
            fillOpacity: 1,
          }
        )
          .bindPopup("BASE — Launch and return point")
          .bindTooltip("BASE", {
            permanent: true,
            direction: "top",
          })
          .addTo(layers);
      }

      // Zoom to include the displayed data
      if (layers.getLayers().length > 0) {
        map.fitBounds(layers.getBounds().pad(0.15));
      }
    }

    void initializeMap();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [flood, sites, base, routePlan]);

  return (
    <div
      ref={containerRef}
      className="mt-4 h-[420px] w-full rounded-lg"
      aria-label="Flood areas, inspection sites, and planned UAS route"
    />
  );
}
