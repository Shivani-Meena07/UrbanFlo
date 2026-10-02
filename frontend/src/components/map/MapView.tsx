import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useApp } from "../../state/AppContext";
import { cityData, RiskLevel } from "../../data/mockData";

import {
  getDrainageAssets,
  getFloodStatus,
  type DrainageAsset,
  type FloodStatusResponse,
} from "../../data/api";

/* =========================================================
   DELHI NCR BOUNDARY
========================================================= */

const ncrBoundary: [number, number][] = [
  [28.88, 76.84],
  [28.91, 77.02],
  [28.86, 77.18],
  [28.83, 77.32],
  [28.78, 77.47],
  [28.67, 77.53],
  [28.52, 77.50],
  [28.39, 77.38],
  [28.29, 77.20],
  [28.30, 77.04],
  [28.36, 76.91],
  [28.50, 76.82],
  [28.68, 76.80],
  [28.88, 76.84],
];

/* =========================================================
   CITY LOCATIONS
========================================================= */

const CITY_LOCATIONS: Record<
  string,
  {
    center: [number, number];
    zoom: number;
  }
> = {
  delhi: {
    center: [28.6139, 77.209],
    zoom: 10,
  },

  mumbai: {
    center: [19.076, 72.8777],
    zoom: 10,
  },

  chennai: {
    center: [13.0827, 80.2707],
    zoom: 10,
  },
};

/* =========================================================
   CITY BOUNDS
========================================================= */

const CITY_BOUNDS: Record<
  string,
  [[number, number], [number, number]]
> = {
  delhi: [
    [28.2, 76.7],
    [29.0, 77.65],
  ],

  mumbai: [
    [18.7, 72.6],
    [19.4, 73.2],
  ],

  chennai: [
    [12.75, 79.9],
    [13.45, 80.55],
  ],
};

/* =========================================================
   MOCK RISK COLORS
========================================================= */

const riskColors: Record<RiskLevel, string> = {
  CRITICAL: "#991B1B",
  HIGH: "#DC2626",
  MODERATE: "#F59E0B",
  LOW: "#84CC16",
  SAFE: "#16A34A",
};

/* =========================================================
   PROTOTYPE COORDINATE CONVERSION
========================================================= */

function prototypeToLatLng(
  x: number,
  y: number,
  city: string
): [number, number] {
  const bounds =
    CITY_BOUNDS[city] ||
    CITY_BOUNDS.delhi;

  const southWest = L.latLng(
    bounds[0][0],
    bounds[0][1]
  );

  const northEast = L.latLng(
    bounds[1][0],
    bounds[1][1]
  );

  const longitude =
    southWest.lng +
    (x / 1000) *
      (northEast.lng - southWest.lng);

  const latitude =
    northEast.lat -
    (y / 750) *
      (northEast.lat - southWest.lat);

  return [latitude, longitude];
}

/* =========================================================
   BACKEND RISK HELPERS
========================================================= */

function backendRiskColor(
  risk?: string
): string {
  switch (risk?.toLowerCase()) {
    case "severe":
    case "critical":
      return "#991B1B";

    case "high":
      return "#DC2626";

    case "moderate":
      return "#F59E0B";

    case "low":
      return "#16A34A";

    default:
      return "#6B7280";
  }
}

function backendNodeStatus(
  risk: string | undefined,
  flooding: boolean
): string {
  if (flooding) {
    return "Flooding";
  }

  switch (risk?.toLowerCase()) {
    case "severe":
      return "Severe";

    case "high":
      return "High";

    case "moderate":
      return "Moderate";

    case "low":
      return "Low";

    default:
      return "Normal";
  }
}

/* =========================================================
   BACKEND COORDINATE HELPERS
========================================================= */

function getValidCoordinate(
  value: unknown
): number | null {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue;
}

/* =========================================================
   MAP COMPONENT
========================================================= */

export default function MapView() {
  const mapContainer =
    useRef<HTMLDivElement>(null);

  const mapRef =
    useRef<L.Map | null>(null);

  const rainfallOverlayRef =
    useRef<L.ImageOverlay | null>(null);

  const boundaryRef =
    useRef<L.Polygon | null>(null);

  const floodZonesRef =
    useRef<L.Polygon[]>([]);

  const hotspotMarkersRef =
    useRef<L.CircleMarker[]>([]);

  const drainageMarkersRef =
    useRef<L.CircleMarker[]>([]);

  const drainageLinesRef =
    useRef<L.Polyline[]>([]);

  const backendDrainageMarkersRef =
    useRef<L.CircleMarker[]>([]);

  const backendFloodMarkersRef =
    useRef<L.CircleMarker[]>([]);

  const { state, dispatch } = useApp();

  const city = String(state.city);

  const [drainageAssets, setDrainageAssets] =
    useState<DrainageAsset[]>([]);

  const [floodStatus, setFloodStatus] =
    useState<FloodStatusResponse | null>(null);

  const [backendLoading, setBackendLoading] =
    useState(false);

  const [backendError, setBackendError] =
    useState<string | null>(null);

  /* =======================================================
     FETCH BACKEND FLOOD DATA
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadBackendData() {
      if (city !== "delhi") {
        setDrainageAssets([]);
        setFloodStatus(null);
        setBackendError(null);
        setBackendLoading(false);

        return;
      }

      setBackendLoading(true);
      setBackendError(null);

      try {
        const [
          drainageResponse,
          floodResponse,
        ] = await Promise.all([
          getDrainageAssets(),
          getFloodStatus(),
        ]);

        if (cancelled) {
          return;
        }

        setDrainageAssets(
          Array.isArray(drainageResponse)
            ? drainageResponse
            : []
        );

        setFloodStatus(
          floodResponse || null
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "UrbanFlo backend map integration error:",
          error
        );

        setBackendError(
          error instanceof Error
            ? error.message
            : "Unable to load live flood model data."
        );

        setDrainageAssets([]);
        setFloodStatus(null);
      } finally {
        if (!cancelled) {
          setBackendLoading(false);
        }
      }
    }

    loadBackendData();

    const interval = window.setInterval(
      loadBackendData,
      5 * 60 * 1000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [city]);

  /* =======================================================
     CREATE MAP
  ======================================================= */

  useEffect(() => {
    if (!mapContainer.current) {
      return;
    }

    if (mapRef.current) {
      return;
    }

    const initialLocation =
      CITY_LOCATIONS[city] ||
      CITY_LOCATIONS.delhi;

    const map = L.map(
      mapContainer.current,
      {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
      }
    ).setView(
      initialLocation.center,
      initialLocation.zoom
    );

    mapRef.current = map;

    /*
     * Keep the Leaflet map itself inside the
     * React map stacking context.
     */

    /* =====================================================
       OPENSTREETMAP
    ===================================================== */

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }
    ).addTo(map);

    /* =====================================================
       RAINFALL LEGEND
    ===================================================== */

    const legend = L.DomUtil.create(
      "div",
      "rainfall-legend"
    );

    legend.style.position =
      "absolute";

    /*
     * Keep the Leaflet legend in the
     * upper-right map area without
     * colliding with the React cards.
     */
    legend.style.right = "55px";
    legend.style.top = "12px";

    legend.style.zIndex = "500";

    legend.style.background =
      "rgba(255,255,255,0.94)";

    legend.style.padding =
      "9px 11px";

    legend.style.border =
      "1px solid #E5E0DA";

    legend.style.borderRadius =
      "5px";

    legend.style.boxShadow =
      "0 2px 8px rgba(0,0,0,0.12)";

    legend.style.fontSize = "11px";
    legend.style.lineHeight = "1.5";
    legend.style.minWidth = "170px";

    legend.innerHTML = `
      <div style="
        font-weight:700;
        margin-bottom:7px;
        color:#2E2A26;
        font-size:11px;
      ">
        Rainfall Intensity
      </div>

      <div style="
        height:9px;
        width:100%;
        border-radius:4px;
        background:linear-gradient(
          to right,
          #84CC16,
          #FACC15,
          #F97316,
          #DC2626,
          #991B1B
        );
        margin-bottom:5px;
      "></div>

      <div style="
        display:flex;
        justify-content:space-between;
        color:#6B6560;
        font-size:9px;
      ">
        <span>Low</span>
        <span>Moderate</span>
        <span>Heavy</span>
        <span>Extreme</span>
      </div>
    `;

    map
      .getContainer()
      .appendChild(legend);

    /* =====================================================
       MAP RESIZE
    ===================================================== */

    const resizeObserver =
      new ResizeObserver(() => {
        map.invalidateSize({
          animate: false,
        });
      });

    resizeObserver.observe(
      mapContainer.current
    );

    window.setTimeout(() => {
      map.invalidateSize({
        animate: false,
      });
    }, 100);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* =======================================================
     CHANGE CITY
  ======================================================= */

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const location =
      CITY_LOCATIONS[city] ||
      CITY_LOCATIONS.delhi;

    map.flyTo(
      location.center,
      location.zoom,
      {
        animate: true,
        duration: 1.2,
        easeLinearity: 0.25,
      }
    );

    const resizeTimer =
      window.setTimeout(() => {
        map.invalidateSize({
          animate: false,
        });
      }, 300);

    return () => {
      window.clearTimeout(
        resizeTimer
      );
    };
  }, [city]);

  /* =======================================================
     RAINFALL OVERLAY
  ======================================================= */

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (rainfallOverlayRef.current) {
      map.removeLayer(
        rainfallOverlayRef.current
      );

      rainfallOverlayRef.current = null;
    }

    if (boundaryRef.current) {
      map.removeLayer(
        boundaryRef.current
      );

      boundaryRef.current = null;
    }

    /*
     * Synthetic rainfall visualization.
     *
     * Current backend does not provide a radar/raster
     * rainfall image.
     */

    const rainfallSvg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1000"
        height="750"
        viewBox="0 0 1000 750"
      >
        <defs>
          <radialGradient
            id="rainMain"
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop
              offset="0%"
              stop-color="#F97316"
              stop-opacity="0.72"
            />

            <stop
              offset="35%"
              stop-color="#FACC15"
              stop-opacity="0.52"
            />

            <stop
              offset="70%"
              stop-color="#84CC16"
              stop-opacity="0.24"
            />

            <stop
              offset="100%"
              stop-color="#84CC16"
              stop-opacity="0"
            />
          </radialGradient>

          <radialGradient
            id="rainHeavy"
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop
              offset="0%"
              stop-color="#DC2626"
              stop-opacity="0.82"
            />

            <stop
              offset="25%"
              stop-color="#F97316"
              stop-opacity="0.70"
            />

            <stop
              offset="55%"
              stop-color="#FACC15"
              stop-opacity="0.45"
            />

            <stop
              offset="100%"
              stop-color="#84CC16"
              stop-opacity="0"
            />
          </radialGradient>
        </defs>

        <ellipse
          cx="455"
          cy="350"
          rx="300"
          ry="210"
          fill="url(#rainMain)"
        />

        <ellipse
          cx="735"
          cy="285"
          rx="235"
          ry="190"
          fill="url(#rainHeavy)"
        />

        <ellipse
          cx="650"
          cy="500"
          rx="235"
          ry="170"
          fill="url(#rainMain)"
        />

        <ellipse
          cx="300"
          cy="535"
          rx="270"
          ry="175"
          fill="url(#rainMain)"
        />
      </svg>
    `;

    const svgUrl =
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(
        rainfallSvg
      );

    const rainfallBounds =
      CITY_BOUNDS[city] ||
      CITY_BOUNDS.delhi;

    const rainfallOverlay =
      L.imageOverlay(
        svgUrl,
        rainfallBounds,
        {
          opacity: 0.34,
          interactive: false,
        }
      );

    rainfallOverlay.addTo(map);

    rainfallOverlayRef.current =
      rainfallOverlay;

    /* =====================================================
       DELHI NCR BOUNDARY
    ===================================================== */

    if (city === "delhi") {
      const boundary = L.polygon(
        ncrBoundary,
        {
          color: "#374151",
          weight: 2,
          opacity: 0.75,
          fill: false,
          dashArray: "7,5",
          interactive: false,
        }
      );

      boundary.addTo(map);

      boundaryRef.current =
        boundary;
    }
  }, [city]);

  /* =======================================================
     FLOOD + DRAINAGE LAYERS
  ======================================================= */

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const data = cityData[city];

    if (!data) {
      return;
    }

    /* =====================================================
       CLEAR OLD LAYERS
    ===================================================== */

    floodZonesRef.current.forEach(
      (layer) => {
        map.removeLayer(layer);
      }
    );

    hotspotMarkersRef.current.forEach(
      (layer) => {
        map.removeLayer(layer);
      }
    );

    drainageMarkersRef.current.forEach(
      (layer) => {
        map.removeLayer(layer);
      }
    );

    drainageLinesRef.current.forEach(
      (layer) => {
        map.removeLayer(layer);
      }
    );

    backendDrainageMarkersRef.current.forEach(
      (layer) => {
        map.removeLayer(layer);
      }
    );

    backendFloodMarkersRef.current.forEach(
      (layer) => {
        map.removeLayer(layer);
      }
    );

    floodZonesRef.current = [];
    hotspotMarkersRef.current = [];
    drainageMarkersRef.current = [];
    drainageLinesRef.current = [];
    backendDrainageMarkersRef.current = [];
    backendFloodMarkersRef.current = [];

    /* =====================================================
       PROTOTYPE FLOOD ZONES
    ===================================================== */

    if (
      state.activeLayers.has(
        "floodRisk"
      )
    ) {
      data.floodZones.forEach(
        (zone) => {
          const points = zone.points
            .split(" ")
            .map((point) => {
              const [x, y] =
                point
                  .split(",")
                  .map(Number);

              return prototypeToLatLng(
                x,
                y,
                city
              );
            });

          const polygon =
            L.polygon(
              points,
              {
                color:
                  riskColors[
                    zone.risk
                  ],
                weight: 1.5,
                opacity: 0.8,
                fillColor:
                  riskColors[
                    zone.risk
                  ],
                fillOpacity: 0.25,
              }
            );

          polygon.bindTooltip(
            `${zone.label} • ${zone.risk} • Prototype zone`,
            {
              direction: "top",
            }
          );

          polygon.addTo(map);

          floodZonesRef.current.push(
            polygon
          );
        }
      );
    }

    /* =====================================================
       PROTOTYPE HOTSPOTS
    ===================================================== */

    if (
      state.activeLayers.has(
        "floodRisk"
      )
    ) {
      data.hotspots.forEach(
        (hotspot) => {
          const position =
            prototypeToLatLng(
              hotspot.x,
              hotspot.y,
              city
            );

          const marker =
            L.circleMarker(
              position,
              {
                radius: 9,
                color: "#ffffff",
                weight: 2,
                fillColor:
                  riskColors[
                    hotspot.risk
                  ],
                fillOpacity: 0.95,
              }
            );

          marker.bindTooltip(
            `${hotspot.label} • ${hotspot.risk} • Prototype hotspot`,
            {
              direction: "top",
            }
          );

          marker.on(
            "click",
            () => {
              dispatch({
                type: "SELECT_HOTSPOT",
                id: hotspot.id,
              });
            }
          );

          marker.addTo(map);

          hotspotMarkersRef.current.push(
            marker
          );
        }
      );
    }

    /* =====================================================
       DRAINAGE NETWORK
    ===================================================== */

    const hasBackendDrainage =
      city === "delhi" &&
      drainageAssets.length > 0;

    if (
      state.activeLayers.has(
        "drainage"
      ) &&
      (!hasBackendDrainage ||
        backendError)
    ) {
      const nodePositions =
        new Map<
          string,
          [number, number]
        >();

      data.drainageNodes.forEach(
        (node) => {
          nodePositions.set(
            node.id,
            prototypeToLatLng(
              node.x,
              node.y,
              city
            )
          );
        }
      );

      /* Prototype drainage edges */

      data.drainageEdges.forEach(
        (edge) => {
          const from =
            nodePositions.get(
              edge.from
            );

          const to =
            nodePositions.get(
              edge.to
            );

          if (!from || !to) {
            return;
          }

          const line =
            L.polyline(
              [from, to],
              {
                color: "#6B7280",
                weight: 3,
                opacity: 0.65,
              }
            );

          line.bindTooltip(
            "Prototype drainage network"
          );

          line.addTo(map);

          drainageLinesRef.current.push(
            line
          );
        }
      );

      const nodeColors: Record<
        string,
        string
      > = {
        Normal: "#16A34A",
        Warning: "#F59E0B",
        Overloaded: "#DC2626",
        Blocked: "#991B1B",
        Backflow: "#7C3AED",
      };

      data.drainageNodes.forEach(
        (node) => {
          const position =
            prototypeToLatLng(
              node.x,
              node.y,
              city
            );

          const marker =
            L.circleMarker(
              position,
              {
                radius: 7,
                color: "#ffffff",
                weight: 2,
                fillColor:
                  nodeColors[
                    node.status
                  ] ||
                  "#6B7280",
                fillOpacity: 1,
              }
            );

          marker.bindTooltip(
            `${node.label} • ${node.status} • Prototype network`,
            {
              direction: "top",
            }
          );

          marker.on(
            "click",
            () => {
              dispatch({
                type:
                  "SELECT_DRAINAGE_NODE",
                id: node.id,
              });
            }
          );

          marker.addTo(map);

          drainageMarkersRef.current.push(
            marker
          );
        }
      );
    }

    /* =====================================================
       REAL BACKEND DRAINAGE ASSETS
    ===================================================== */

    if (
      state.activeLayers.has(
        "drainage"
      ) &&
      city === "delhi" &&
      !backendError
    ) {
      drainageAssets.forEach(
        (asset) => {
          const latitude =
            getValidCoordinate(
              asset.latitude
            );

          const longitude =
            getValidCoordinate(
              asset.longitude
            );

          if (
            latitude === null ||
            longitude === null
          ) {
            return;
          }

          const marker =
            L.circleMarker(
              [
                latitude,
                longitude,
              ],
              {
                radius: 8,
                color: "#ffffff",
                weight: 2,
                fillColor: "#2563EB",
                fillOpacity: 0.95,
              }
            );

          marker.bindTooltip(
            `
              <strong>${asset.name}</strong><br/>
              SWMM node: ${
                asset.swmm_node_id ||
                "unmapped"
              }<br/>
              Condition: ${
                asset.condition
              }<br/>
              <span style="color:#6B7280">
                Backend model asset
              </span>
            `,
            {
              direction: "top",
            }
          );

          marker.addTo(map);

          backendDrainageMarkersRef.current.push(
            marker
          );
        }
      );
    }

    /* =====================================================
       REAL BACKEND FLOOD MODEL NODES
    ===================================================== */

    if (
      state.activeLayers.has(
        "floodRisk"
      ) &&
      city === "delhi" &&
      !backendError &&
      floodStatus?.nodes
    ) {
      const assetByNode =
        new Map<
          string,
          DrainageAsset
        >();

      drainageAssets.forEach(
        (asset) => {
          if (asset.swmm_node_id) {
            assetByNode.set(
              asset.swmm_node_id,
              asset
            );
          }
        }
      );

      floodStatus.nodes.forEach(
        (node) => {
          const asset =
            assetByNode.get(
              node.node
            );

          if (!asset) {
            return;
          }

          const latitude =
            getValidCoordinate(
              asset.latitude
            );

          const longitude =
            getValidCoordinate(
              asset.longitude
            );

          if (
            latitude === null ||
            longitude === null
          ) {
            return;
          }

          const color =
            backendRiskColor(
              node.risk
            );

          const marker =
            L.circleMarker(
              [
                latitude,
                longitude,
              ],
              {
                radius: node.flooding
                  ? 11
                  : 9,
                color: "#ffffff",
                weight: 2,
                fillColor: color,
                fillOpacity: 0.95,
              }
            );

          const depthCm =
            Number(
              node.max_depth_m
            ) * 100;

          marker.bindTooltip(
            `
              <strong>SWMM node ${
                node.node
              }</strong><br/>
              Risk: ${node.risk}<br/>
              Max depth: ${
                Number.isFinite(
                  depthCm
                )
                  ? depthCm.toFixed(
                      1
                    )
                  : "—"
              } cm<br/>
              Status: ${backendNodeStatus(
                node.risk,
                node.flooding
              )}<br/>
              <span style="color:#6B7280">
                Backend flood model
              </span>
            `,
            {
              direction: "top",
            }
          );

          marker.addTo(map);

          backendFloodMarkersRef.current.push(
            marker
          );
        }
      );
    }
  }, [
    city,
    state.activeLayers,
    state.timeStep,
    dispatch,
    drainageAssets,
    floodStatus,
    backendError,
  ]);

  /* =======================================================
     MAP CONTAINER
  ======================================================= */

  return (
    <div
      className="
        relative
        z-0
        h-full
        w-full
        min-h-0
        overflow-hidden
      "
    >
      {/* ===================================================
          LEAFLET MAP
      =================================================== */}

      <div
        ref={mapContainer}
        className="
          absolute
          inset-0
          h-full
          w-full
          z-0
        "
      />

      {/* ===================================================
          BACKEND LOADING
      =================================================== */}

      {backendLoading && (
        <div
          className="
            absolute
            left-3
            top-19
            sm:top-3
            z-1500
            rounded-[5px]
            border border-blue-200
            bg-white/95
            backdrop-blur-sm
            px-3
            py-2
            text-[11px]
            text-blue-800
            shadow-sm
          "
        >
          <div className="flex items-center gap-2">
            <span
              className="
                h-2
                w-2
                shrink-0
                rounded-full
                bg-blue-500
                animate-pulse
              "
            />

            Updating flood model…
          </div>
        </div>
      )}

      {/* ===================================================
          BACKEND ERROR
      =================================================== */}

      {backendError && (
        <div
          className="
            absolute
            bottom-19
            sm:bottom-3
            left-3
            z-1500
            max-w-xs
            rounded-[5px]
            border border-amber-200
            bg-amber-50/95
            backdrop-blur-sm
            px-3
            py-2
            text-[11px]
            leading-4
            text-amber-800
            shadow-sm
          "
        >
          <strong>
            Backend unavailable.
          </strong>

          <br />

          Showing prototype map data.
        </div>
      )}

      {/* ===================================================
          BACKEND MODEL SUMMARY
      =================================================== */}

      {!backendLoading &&
        !backendError &&
        floodStatus && (
          <div
            className="
              absolute
              left-3
              top-28
              sm:top-28
              z-1600
              w-45
              sm:w-48.75
              max-w-[calc(100vw-1.5rem)]
              rounded-[5px]
              border border-stone-200
              bg-white/95
              backdrop-blur-sm
              shadow-[0_3px_12px_rgba(0,0,0,0.12)]
              overflow-hidden
            "
          >
            <div className="px-3 pt-2.5 pb-2">
              <div
                className="
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-stone-500
                "
              >
                Live flood model
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className="
                    h-2.5
                    w-2.5
                    shrink-0
                    rounded-full
                  "
                  style={{
                    backgroundColor:
                      backendRiskColor(
                        floodStatus.overall_risk ||
                          undefined
                      ),
                  }}
                />

                <span
                  className="
                    text-xs
                    font-bold
                    uppercase
                    text-stone-800
                  "
                >
                  {floodStatus.overall_risk ||
                    floodStatus.status}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {typeof floodStatus.confidence ===
                  "number" && (
                  <div>
                    <div className="text-[9px] text-stone-400 uppercase">
                      Confidence
                    </div>

                    <div className="font-mono text-[11px] font-semibold text-stone-700">
                      {Math.round(
                        floodStatus.confidence *
                          100
                      )}
                      %
                    </div>
                  </div>
                )}

                {typeof floodStatus.peak_depth_m ===
                  "number" && (
                  <div>
                    <div className="text-[9px] text-stone-400 uppercase">
                      Peak depth
                    </div>

                    <div className="font-mono text-[11px] font-semibold text-stone-700">
                      {(
                        floodStatus.peak_depth_m *
                        100
                      ).toFixed(1)}
                      cm
                    </div>
                  </div>
                )}
              </div>

              {typeof floodStatus.forecast_rainfall_mm ===
                "number" && (
                <div className="mt-2 border-t border-stone-100 pt-2">
                  <div className="text-[9px] uppercase text-stone-400">
                    Forecast rainfall
                  </div>

                  <div className="font-mono text-[11px] font-semibold text-blue-700">
                    {floodStatus.forecast_rainfall_mm.toFixed(
                      1
                    )}{" "}
                    mm
                  </div>
                </div>
              )}

              {floodStatus.critical_nodes &&
                floodStatus.critical_nodes.length >
                  0 && (
                  <div className="mt-1.5 text-[9px] leading-3.5 text-stone-500">
                    Critical nodes{" "}
                    {floodStatus.critical_nodes.join(
                      ", "
                    )}
                  </div>
                )}
            </div>

            <div
              className="
                border-t
                border-stone-100
                bg-stone-50
                px-3
                py-1.5
                text-[9px]
                text-stone-500
              "
            >
              Backend hydraulic model
            </div>
          </div>
        )}
    </div>
  );
}