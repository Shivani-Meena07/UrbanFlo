const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const API_KEY = import.meta.env.VITE_API_KEY || "";

/* =========================================================
   GENERIC API REQUEST
========================================================= */

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers);

  headers.set("Content-Type", "application/json");

  if (API_KEY) {
    headers.set("X-API-Key", API_KEY);
  }

  const response = await fetch(
    `${API_BASE_URL}/api${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  if (!response.ok) {
    let message = `API request failed: ${response.status} ${response.statusText}`;

    try {
      const errorBody = await response.json();

      if (errorBody?.detail) {
        message = errorBody.detail;
      }
    } catch {
      // Keep default error message.
    }

    throw new Error(message);
  }

  return response.json();
}

/* =========================================================
   HEALTH
   GET /api/health
========================================================= */

export interface HealthResponse {
  status: string;
  service?: string;
}

export function getHealth() {
  return apiRequest<HealthResponse>("/health");
}

/* =========================================================
   SYSTEM STATUS
   GET /api/data/status
========================================================= */

export interface SystemStatusResponse {
  weather?: string;
  airport?: unknown;
  imd?: unknown;
  cwc?: unknown;
  agriculture?: unknown;
  google_elevation?: unknown;
  earth_engine?: unknown;
}

export function getSystemStatus() {
  return apiRequest<SystemStatusResponse>(
    "/data/status"
  );
}

/* =========================================================
   LIVE WEATHER
   GET /api/weather/live
========================================================= */

export interface LiveWeatherCurrent {
  temperature_2m: number | null;
  relative_humidity_2m: number | null;
  pressure_msl: number | null;
  wind_speed_10m: number | null;
  precipitation: number | null;
}

export interface WeatherForecastPoint {
  time: string;
  rainfall_mm: number;
  interval_minutes: number;
  rainfall_rate_mm_hr: number;
}

export interface LiveWeatherResponse {
  source?: string;

  latitude?: number;
  longitude?: number;

  weather: LiveWeatherCurrent;

  airport?: {
    source?: string;
    icao?: string;
    raw?: string;
    status?: string;
    error?: string;
  };

  forecast: WeatherForecastPoint[];
}

export interface WeatherParams {
  lat?: number;
  lon?: number;
}

export function getLiveWeather(
  params?: WeatherParams
) {
  const searchParams =
    new URLSearchParams();

  if (params?.lat !== undefined) {
    searchParams.set(
      "lat",
      String(params.lat)
    );
  }

  if (params?.lon !== undefined) {
    searchParams.set(
      "lon",
      String(params.lon)
    );
  }

  const query =
    searchParams.toString();

  return apiRequest<LiveWeatherResponse>(
    `/weather/live${
      query ? `?${query}` : ""
    }`
  );
}

/* =========================================================
   DRAINAGE ASSETS
   GET /api/assets/drainage
========================================================= */

export interface DrainageAsset {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  condition: string;
  swmm_node_id?: string | null;
}

export interface DrainageParams {
  lat?: number;
  lon?: number;
  radius_km?: number;
}

export function getDrainageAssets(
  params?: DrainageParams
) {
  const searchParams =
    new URLSearchParams();

  if (params?.lat !== undefined) {
    searchParams.set(
      "lat",
      String(params.lat)
    );
  }

  if (params?.lon !== undefined) {
    searchParams.set(
      "lon",
      String(params.lon)
    );
  }

  if (
    params?.radius_km !== undefined
  ) {
    searchParams.set(
      "radius_km",
      String(params.radius_km)
    );
  }

  const query =
    searchParams.toString();

  return apiRequest<DrainageAsset[]>(
    `/assets/drainage${
      query ? `?${query}` : ""
    }`
  );
}

/* =========================================================
   FLOOD STATUS
   GET /api/flood/status
========================================================= */

export interface FloodLocation {
  latitude: number;
  longitude: number;
  matched_assets: number;
}

export interface FloodNode {
  node: string;
  max_depth_m: number;
  risk: string;
  flooding: boolean;
}

export interface FloodStatusResponse {
  status: string;

  reason?: string | null;

  location?: FloodLocation | null;

  overall_risk?: string | null;

  forecast_hours?: number | null;

  forecast_rainfall_mm?: number | null;

  peak_depth_m?: number | null;

  time_to_peak?: string | null;

  critical_nodes?: string[] | null;

  flooded_nodes?: string[] | null;

  confidence?: number | null;

  nodes?: FloodNode[] | null;

  forecast?: WeatherForecastPoint[] | null;

  ai_summary?: string | null;
}

export interface FloodStatusParams {
  lat?: number;
  lon?: number;
  radius_km?: number;
  includeAiSummary?: boolean;
}

export function getFloodStatus(
  params?: FloodStatusParams
) {
  const searchParams =
    new URLSearchParams();

  if (params?.lat !== undefined) {
    searchParams.set(
      "lat",
      String(params.lat)
    );
  }

  if (params?.lon !== undefined) {
    searchParams.set(
      "lon",
      String(params.lon)
    );
  }

  if (
    params?.radius_km !== undefined
  ) {
    searchParams.set(
      "radius_km",
      String(params.radius_km)
    );
  }

  if (
    params?.includeAiSummary !==
    undefined
  ) {
    searchParams.set(
      "include_ai_summary",
      String(
        params.includeAiSummary
      )
    );
  }

  const query =
    searchParams.toString();

  return apiRequest<FloodStatusResponse>(
    `/flood/status${
      query ? `?${query}` : ""
    }`
  );
}

/* =========================================================
   CITIZEN REPORTS
   POST /api/reports
   GET /api/reports
   PATCH /api/reports/{id}/verify
   PATCH /api/reports/{id}/status
========================================================= */

export interface CitizenReport {
  id: number;
  issue_type: string;
  location: string;
  latitude: number;
  longitude: number;
  severity: string;
  description?: string | null;
  status: string;
  created_at: string;
  verified_at?: string | null;
  assigned_team?: string | null;
  model_relevant: boolean;
}

export interface CitizenReportCreate {
  issue_type: string;
  location: string;
  latitude: number;
  longitude: number;
  severity: string;
  description?: string;
}

export async function createCitizenReport(
  report: CitizenReportCreate
): Promise<CitizenReport> {
  return apiRequest<CitizenReport>("/reports", {
    method: "POST",
    body: JSON.stringify(report),
  });
}

export async function getCitizenReports(
  status?: string,
  severity?: string
): Promise<CitizenReport[]> {
  const searchParams = new URLSearchParams();

  if (status) {
    searchParams.set("status", status);
  }

  if (severity) {
    searchParams.set("severity", severity);
  }

  const query = searchParams.toString();

  return apiRequest<CitizenReport[]>(
    `/reports${query ? `?${query}` : ""}`
  );
}

export interface CitizenReportVerification {
  verified: boolean;
  model_relevant: boolean;
  assigned_team?: string | null;
}

export async function verifyCitizenReport(
  reportId: number,
  verification: CitizenReportVerification
): Promise<CitizenReport> {
  return apiRequest<CitizenReport>(
    `/reports/${reportId}/verify`,
    {
      method: "PATCH",
      body: JSON.stringify(verification),
    }
  );
}

export async function updateCitizenReportStatus(
  reportId: number,
  status: string
): Promise<CitizenReport> {
  return apiRequest<CitizenReport>(
    `/reports/${reportId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
      }),
    }
  );
}

/* =========================================================
   FLOOD-AWARE SAFE ROUTING & HAZARDS
   GET  /api/route/locations
   GET  /api/route/plan
   POST /api/route/report-hazard
   GET  /api/route/hazards
========================================================= */

export interface RouteLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  is_flood_prone?: boolean;
  is_underpass?: boolean;
  is_elevated?: boolean;
}

export interface RouteEdgeDetails {
  name: string;
  km: number;
  base_min: number;
  surface: string;
  swmm_node?: string;
  water_depth_cm: number;
  risk_level: string;
  is_elevated: boolean;
  is_underpass: boolean;
  recession_info: {
    recession_minutes: number;
    recession_text: string;
    is_clearing: boolean;
    drainage_rate_mm_hr: number;
    status: string;
  };
  runoff_info: {
    surface_type: string;
    surface_label: string;
    runoff_coefficient: number;
    rainfall_rate_mm_hr: number;
    runoff_rate_mm_hr: number;
    infiltration_rate_mm_hr: number;
    description: string;
  };
}

export interface ManeuverStep {
  instruction: string;
  distance_m: number;
  duration_s: number;
  road_name?: string;
}

export interface RoutePlanDetails {
  path_nodes: string[];
  coordinates: [number, number][];
  total_km: number;
  duration_min: number;
  max_depth_cm: number;
  safety_score: number;
  safety_label: string;
  max_recession_minutes: number;
  recession_text: string;
  edges: RouteEdgeDetails[];
  maneuvers?: ManeuverStep[];
}

export interface SafeRoutePlanResponse {
  origin: RouteLocation;
  destination: RouteLocation;
  is_diversion_recommended: boolean;
  recommendation_summary: string;
  direct_route: RoutePlanDetails;
  safe_route: RoutePlanDetails;
  hydraulics_summary: {
    rain_rate_mm_hr: number;
    engine: string;
    active_hazards_count: number;
  };
}

export interface HazardReportItem {
  id: number;
  location_name: string;
  latitude: number;
  longitude: number;
  depth_cm: number;
  issue_tag: string;
  photo_url?: string | null;
  description?: string | null;
  recession_eta_min: number;
  created_at: string;
}

export async function getRouteLocations(): Promise<RouteLocation[]> {
  return apiRequest<RouteLocation[]>("/route/locations");
}

export async function planSafeRoute(
  origin: string,
  destination: string,
  rainRateMmHr?: number
): Promise<SafeRoutePlanResponse> {
  const params = new URLSearchParams({
    origin,
    destination,
  });
  if (rainRateMmHr !== undefined) {
    params.set("rain_rate_mm_hr", String(rainRateMmHr));
  }
  return apiRequest<SafeRoutePlanResponse>(`/route/plan?${params.toString()}`);
}

export async function getActiveHazards(): Promise<HazardReportItem[]> {
  return apiRequest<HazardReportItem[]>("/route/hazards");
}

export async function submitHazardPhotoReport(
  formData: FormData
): Promise<{
  status: string;
  message: string;
  hazard_id: number;
  location_name: string;
  depth_cm: number;
  recession_text: string;
  photo_url?: string | null;
}> {
  const headers = new Headers();
  if (API_KEY) {
    headers.set("X-API-Key", API_KEY);
  }

  const response = await fetch(`${API_BASE_URL}/api/route/report-hazard`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload hazard photo: ${response.statusText}`);
  }

  return response.json();
}

export async function ingestTelemetryPing(data: {
  speed_kmh: number;
  rain_mm_hr: number;
  latitude: number;
  longitude: number;
  vehicle_id?: string;
}): Promise<{
  status: string;
  speed_anomaly_detected: boolean;
  bayesian_inundation: {
    inundation_probability: number;
    probability_percentage: number;
    status: string;
    confidence_label: string;
  };
  reroute_active: boolean;
}> {
  return apiRequest("/telemetry/ingest", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface HydraulicsLiveParams {
  slope?: number;
  depth_m?: number;
  street_width_m?: number;
  surface_type?: string;
  rain_rate_mm_hr?: number;
  is_sag?: boolean;
  speed_drop_ratio?: number;
  crowd_pings_count?: number;
  swmm_surcharge_ratio?: number;
}

export async function getHydraulicsLiveStatus(params?: HydraulicsLiveParams): Promise<{
  manning_open_channel: {
    discharge_m3_s: number;
    flow_velocity_m_s: number;
    hydraulic_radius_m: number;
    roughness_n: number;
  };
  bayesian_sensor_fusion: {
    inundation_probability: number;
    probability_percentage: number;
    status: string;
    confidence_label: string;
  };
  active_telemetry_pings_cached: number;
}> {
  const searchParams = new URLSearchParams();
  if (params) {
    if (params.slope !== undefined) searchParams.set("slope", String(params.slope));
    if (params.depth_m !== undefined) searchParams.set("depth_m", String(params.depth_m));
    if (params.street_width_m !== undefined) searchParams.set("street_width_m", String(params.street_width_m));
    if (params.surface_type !== undefined) searchParams.set("surface_type", params.surface_type);
    if (params.rain_rate_mm_hr !== undefined) searchParams.set("rain_rate_mm_hr", String(params.rain_rate_mm_hr));
    if (params.is_sag !== undefined) searchParams.set("is_sag", String(params.is_sag));
    if (params.speed_drop_ratio !== undefined) searchParams.set("speed_drop_ratio", String(params.speed_drop_ratio));
    if (params.crowd_pings_count !== undefined) searchParams.set("crowd_pings_count", String(params.crowd_pings_count));
    if (params.swmm_surcharge_ratio !== undefined) searchParams.set("swmm_surcharge_ratio", String(params.swmm_surcharge_ratio));
  }
  const q = searchParams.toString();
  return apiRequest(`/hydraulics/live-status${q ? `?${q}` : ""}`);
}

/* =========================================================
   API BASE URL
========================================================= */

export { API_BASE_URL };
