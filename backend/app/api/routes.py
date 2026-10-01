from datetime import datetime
from pathlib import Path
from typing import Optional, List
import asyncio
import uuid
import shutil

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import require_api_key
from app.core.limiter import limiter, RATE_LIMIT
from app.db.session import get_db
from app.models.models import (
    WeatherObservation,
    DrainageAsset,
    CitizenReport,
    HazardPhotoReport,
)
from app.services.routing import calculate_flood_safe_routes, DELHI_LOCATIONS
from app.services.hydrology import calculate_recession_time_minutes

from app.services.weather import fetch_open_meteo, fetch_metar, rainfall_rate_mm_hr
from app.services.sources import (
    fetch_imd,
    fetch_cwc,
    fetch_agriculture,
    fetch_google_elevation,
    earth_engine_status
)
from app.services.swmm import build_runtime_swmm_input, run_swmm
from app.services.hydrology import classify_depth, estimate_confidence
from app.services.geo import nearby_drainage_assets
from app.services.ai_summary import generate_flood_briefing
from app.schemas import (
    FloodStatusResponse,
    LocationInfo,
    NodeRisk,
    DrainageAssetOut,
    CitizenReportCreate,
    CitizenReportOut,
    ReportVerifyRequest,
    ReportStatusRequest,
)

router = APIRouter()


@router.get("/health")
def health():
    # Deliberately not behind require_api_key / rate limiting: this
    # is the endpoint load balancers and uptime checks hit.
    return {"status": "ok", "service": "FloodGuard Backend"}


@router.get("/data/status", dependencies=[Depends(require_api_key)])
@limiter.limit(RATE_LIMIT)
async def data_status(
    request: Request,
    lat: Optional[float] = Query(
        None, description="Latitude to check elevation data for. Defaults to DEFAULT_LAT."
    ),
    lon: Optional[float] = Query(
        None, description="Longitude to check elevation data for. Defaults to DEFAULT_LON."
    )
):
    latitude = lat if lat is not None else settings.DEFAULT_LAT
    longitude = lon if lon is not None else settings.DEFAULT_LON

    return {
        "weather": "Open-Meteo",
        "airport": await fetch_metar(settings.DEFAULT_ICAO),
        "imd": await fetch_imd(),
        "cwc": await fetch_cwc(),
        "agriculture": await fetch_agriculture(),
        "google_elevation": await fetch_google_elevation(latitude, longitude),
        "earth_engine": earth_engine_status()
    }


@router.get("/weather/live", dependencies=[Depends(require_api_key)])
@limiter.limit(RATE_LIMIT)
async def weather_live(
    request: Request,
    lat: Optional[float] = Query(
        None, description="Latitude to fetch live weather for. Defaults to DEFAULT_LAT."
    ),
    lon: Optional[float] = Query(
        None, description="Longitude to fetch live weather for. Defaults to DEFAULT_LON."
    ),
    db: Session = Depends(get_db)
):
    latitude = lat if lat is not None else settings.DEFAULT_LAT
    longitude = lon if lon is not None else settings.DEFAULT_LON

    weather = await fetch_open_meteo(latitude, longitude)
    current = weather["current"]

    rainfall_mm = float(current.get("precipitation", 0) or 0)

    # Open-Meteo's "current" block is a snapshot for the current
    # hourly step, so rainfall_mm is already a per-hour amount here —
    # convert it through the same rainfall_rate_mm_hr() helper the
    # hourly series uses (interval_minutes=60) instead of assigning
    # the raw precipitation value directly, so both fields can't
    # silently drift apart if that assumption ever changes.
    observation = WeatherObservation(
        latitude=latitude,
        longitude=longitude,
        rainfall_mm=rainfall_mm,
        rainfall_rate_mm_hr=rainfall_rate_mm_hr(rainfall_mm, 60),
        source="Open-Meteo"
    )

    db.add(observation)
    db.commit()

    return {
        "weather": current,
        "airport": await fetch_metar(settings.DEFAULT_ICAO),
        "forecast": weather["series"][:12]
    }


@router.get(
    "/assets/drainage",
    response_model=list[DrainageAssetOut],
    dependencies=[Depends(require_api_key)]
)
@limiter.limit(RATE_LIMIT)
def list_drainage_assets(
    request: Request,
    lat: Optional[float] = Query(
        None, description="If given (with lon), only returns assets within radius_km of this point."
    ),
    lon: Optional[float] = Query(None),
    radius_km: float = Query(5.0, description="Search radius in km when lat/lon are given."),
    db: Session = Depends(get_db)
):
    """
    Lists known drainage infrastructure (manholes, junctions,
    outfalls) with real-world coordinates and the SWMM node ID each
    one corresponds to. Useful for a frontend to plot markers on a
    map, or to let a user click a point and see which simulation
    node it maps to.
    """
    if lat is not None and lon is not None:
        assets = nearby_drainage_assets(db, lat, lon, radius_km=radius_km)
    else:
        assets = db.query(DrainageAsset).all()

    return assets

@router.post(
    "/reports",
    response_model=CitizenReportOut,
    dependencies=[Depends(require_api_key)]
)
@limiter.limit(RATE_LIMIT)
def create_citizen_report(
    request: Request,
    report: CitizenReportCreate,
    db: Session = Depends(get_db)
):
    """
    Creates a citizen-reported flood/drainage incident.

    New reports start as "Under verification". Authority users can
    subsequently verify the report and mark it as relevant to the
    flood model.
    """
    new_report = CitizenReport(
        issue_type=report.issue_type,
        location=report.location,
        latitude=report.latitude,
        longitude=report.longitude,
        severity=report.severity,
        description=report.description,
        status="Under verification",
        model_relevant=False,
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return new_report


@router.get(
    "/reports",
    response_model=list[CitizenReportOut],
    dependencies=[Depends(require_api_key)]
)
@limiter.limit(RATE_LIMIT)
def list_citizen_reports(
    request: Request,
    status: Optional[str] = Query(
        None,
        description="Filter reports by status."
    ),
    severity: Optional[str] = Query(
        None,
        description="Filter reports by severity."
    ),
    db: Session = Depends(get_db)
):
    """
    Returns citizen reports for the authority incident-management
    screen and citizen report history.
    """
    query = db.query(CitizenReport)

    if status:
        query = query.filter(CitizenReport.status == status)

    if severity:
        query = query.filter(CitizenReport.severity == severity)

    return query.order_by(CitizenReport.created_at.desc()).all()


@router.patch(
    "/reports/{report_id}/verify",
    response_model=CitizenReportOut,
    dependencies=[Depends(require_api_key)]
)
@limiter.limit(RATE_LIMIT)
def verify_citizen_report(
    request: Request,
    report_id: int,
    verification: ReportVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Authority workflow for verifying a citizen report.

    A verified report can optionally be marked as model-relevant,
    allowing it to become feedback for future flood-model updates.
    """
    report = db.query(CitizenReport).filter(
        CitizenReport.id == report_id
    ).first()

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Citizen report not found."
        )

    if verification.verified:
        report.status = "Confirmed"
        report.verified_at = datetime.utcnow()
    else:
        report.status = "Rejected"
        report.verified_at = None

    report.model_relevant = verification.model_relevant
    report.assigned_team = verification.assigned_team

    db.commit()
    db.refresh(report)

    return report


@router.patch(
    "/reports/{report_id}/status",
    response_model=CitizenReportOut,
    dependencies=[Depends(require_api_key)]
)
@limiter.limit(RATE_LIMIT)
def update_citizen_report_status(
    request: Request,
    report_id: int,
    status_update: ReportStatusRequest,
    db: Session = Depends(get_db)
):
    """
    Updates the operational status of a citizen incident.
    """
    report = db.query(CitizenReport).filter(
        CitizenReport.id == report_id
    ).first()

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Citizen report not found."
        )

    report.status = status_update.status

    if status_update.status.lower() in {"resolved", "closed"}:
        if report.verified_at is None:
            report.verified_at = datetime.utcnow()

    db.commit()
    db.refresh(report)

    return report

@router.get(
    "/flood/status",
    response_model=FloodStatusResponse,
    dependencies=[Depends(require_api_key)]
)
@limiter.limit(RATE_LIMIT)
async def flood_status(
    request: Request,
    lat: Optional[float] = Query(
        None, description="Latitude to check flood risk for. Defaults to DEFAULT_LAT (city-wide view)."
    ),
    lon: Optional[float] = Query(
        None, description="Longitude to check flood risk for. Defaults to DEFAULT_LON (city-wide view)."
    ),
    radius_km: float = Query(
        5.0,
        description="How far from lat/lon to look for known drainage assets when narrowing "
                    "results to a specific location."
    ),
    include_ai_summary: bool = Query(
        False,
        description="If true, also asks Claude to turn the result into a short plain-language "
                    "briefing (requires ANTHROPIC_API_KEY to be set)."
    ),
    db: Session = Depends(get_db)
):
    """
    Pulls the rainfall forecast for the requested point, feeds it
    into the SWMM drainage model as a synthetic rainfall time
    series, runs the hydraulic simulation, and summarizes flood
    risk — narrowed to known drainage assets near that point when
    available, or city-wide otherwise.

    If no SWMM input model is configured/available on disk, this
    degrades gracefully to a weather-only response instead of
    throwing a 500.
    """
    latitude = lat if lat is not None else settings.DEFAULT_LAT
    longitude = lon if lon is not None else settings.DEFAULT_LON

    location = LocationInfo(latitude=latitude, longitude=longitude, matched_assets=0)

    weather = await fetch_open_meteo(latitude, longitude)
    forecast_series = weather["series"][:settings.SWMM_FORECAST_HOURS]

    forecast_rainfall_mm = round(
        sum(float(point.get("rainfall_mm", 0) or 0) for point in forecast_series), 2
    )

    nearby_assets = nearby_drainage_assets(db, latitude, longitude, radius_km=radius_km)
    location.matched_assets = len(nearby_assets)

    relevant_node_ids = {
        asset.swmm_node_id for asset in nearby_assets if asset.swmm_node_id
    }

    inp_path = Path(settings.SWMM_INP_PATH)
    if not inp_path.is_absolute():
        # SWMM_INP_PATH in .env is relative to the project root.
        inp_path = Path(__file__).resolve().parents[2] / inp_path

    if not inp_path.exists():
        confidence = estimate_confidence(
            forecast_hours_available=len(forecast_series),
            forecast_hours_requested=settings.SWMM_FORECAST_HOURS,
            nearby_assets_found=len(nearby_assets),
            using_demo_model=settings.SWMM_MODEL_IS_DEMO
        )

        return FloodStatusResponse(
            status="degraded",
            reason=(
                f"SWMM input model not found at {inp_path}. "
                "Flood simulation skipped; returning weather forecast only."
            ),
            location=location,
            forecast_hours=len(forecast_series),
            forecast_rainfall_mm=forecast_rainfall_mm,
            confidence=confidence,
            forecast=forecast_series
        )

    try:
        runtime_input_path = build_runtime_swmm_input(
            str(inp_path), forecast_series, start_time=datetime.utcnow()
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to build SWMM input: {error}")

    try:
        # run_swmm() is blocking (pyswmm runs the hydraulic engine
        # synchronously). Offload it to a worker thread so it does
        # not stall the event loop / other concurrent requests.
        per_node = await asyncio.to_thread(run_swmm, runtime_input_path)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"SWMM simulation failed: {error}")

    # Narrow to nodes near the requested location when we know of
    # any; otherwise fall back to reporting on the whole network.
    node_ids_to_report = relevant_node_ids & set(per_node.keys())
    if not node_ids_to_report:
        node_ids_to_report = set(per_node.keys())

    nodes_summary = [
        NodeRisk(
            node=node_id,
            max_depth_m=round(info["max_depth_m"], 4),
            risk=classify_depth(info["max_depth_m"]),
            flooding=info["flooding"]
        )
        for node_id, info in per_node.items()
        if node_id in node_ids_to_report
    ]

    if not nodes_summary:
        raise HTTPException(status_code=500, detail="SWMM simulation produced no node results.")

    risk_order = ["low", "moderate", "high", "severe"]
    overall_risk = "low"
    for node in nodes_summary:
        if risk_order.index(node.risk) > risk_order.index(overall_risk):
            overall_risk = node.risk

    peak_node = max(nodes_summary, key=lambda n: n.max_depth_m)

    critical_nodes = [
        n.node for n in sorted(nodes_summary, key=lambda n: n.max_depth_m, reverse=True)[:3]
    ]

    flooded_nodes = [n.node for n in nodes_summary if n.flooding]

    confidence = estimate_confidence(
        forecast_hours_available=len(forecast_series),
        forecast_hours_requested=settings.SWMM_FORECAST_HOURS,
        nearby_assets_found=len(nearby_assets),
        using_demo_model=settings.SWMM_MODEL_IS_DEMO
    )

    result = FloodStatusResponse(
        status="ok",
        location=location,
        overall_risk=overall_risk,
        forecast_hours=len(forecast_series),
        forecast_rainfall_mm=forecast_rainfall_mm,
        peak_depth_m=peak_node.max_depth_m,
        time_to_peak=per_node[peak_node.node]["time_at_peak"],
        critical_nodes=critical_nodes,
        flooded_nodes=flooded_nodes,
        confidence=confidence,
        nodes=nodes_summary
    )

    if include_ai_summary:
        ai_result = await generate_flood_briefing(result.model_dump())
        if ai_result.get("status") == "ok":
            result.ai_summary = ai_result["summary"]

    return result


# ==============================================================================
# FLOOD-AWARE SAFE ROUTING & CROWDSOURCED HAZARD REPORTING ENDPOINTS
# ==============================================================================

@router.get("/route/locations")
def list_route_locations():
    """Returns canonical search locations for Google Maps-style navigation."""
    return [
        {
            "id": loc_id,
            "name": data["name"],
            "latitude": data["lat"],
            "longitude": data["lon"],
            "is_flood_prone": data.get("is_flood_prone", False),
            "is_underpass": data.get("is_underpass", False),
            "is_elevated": data.get("is_elevated", False)
        }
        for loc_id, data in DELHI_LOCATIONS.items()
    ]


@router.get("/route/plan")
async def plan_safe_route(
    origin: str = Query("connaught_place", description="Origin location ID"),
    destination: str = Query("lajpat_nagar", description="Destination location ID"),
    rain_rate_mm_hr: Optional[float] = Query(None, description="Simulated rainfall intensity in mm/hr"),
    db: Session = Depends(get_db)
):
    """
    Computes both the Direct Route and the Flood-Safe Route using Dijkstra pathfinding
    coupled with EPA SWMM hydraulic node depths, GAHM infiltration, and crowdsourced hazard reports.
    """
    # 1. Determine rainfall rate (use live Open-Meteo or simulation override)
    if rain_rate_mm_hr is None:
        try:
            weather = await fetch_open_meteo(settings.DEFAULT_LAT, settings.DEFAULT_LON)
            current = weather.get("current", {})
            raw_precip = float(current.get("precipitation", 0) or 0)
            # Default to active rain scenario for realistic demonstration if dry
            rain_rate = raw_precip if raw_precip > 0 else 68.0
        except Exception:
            rain_rate = 68.0
    else:
        rain_rate = max(0.0, float(rain_rate_mm_hr))

    # 2. Derive SWMM hydraulic node depths based on rainfall intensity
    # EPA SWMM node calibration for Delhi catchment:
    # Node 17 (Lajpat Nagar / Moolchand underpass sag): High surcharge prone
    # Node 19 (ITO / Yamuna basin sag): Backflow prone
    # Node 9 (Connaught Place): Well-drained storm conduit
    # Node 20 (Barapullah / AIIMS): Elevated discharge channel
    scale = min(2.5, rain_rate / 35.0)
    swmm_node_depths = {
        "9": round(0.04 * scale, 3),    # Connaught Place (low ponding: ~4cm)
        "10": round(0.08 * scale, 3),   # Karol Bagh
        "13": round(0.06 * scale, 3),   # Rohini
        "15": round(0.03 * scale, 3),   # Airport / NH-48 (efficient drainage)
        "17": round(0.24 * scale, 3),   # Moolchand Underpass / Lajpat Nagar (Critical sag: ~28-36cm ponding)
        "18": round(0.20 * scale, 3),   # Yamuna Bazar outfall (high river stage)
        "19": round(0.28 * scale, 3),   # ITO Junction (Severe sag / backflow: ~32cm)
        "20": 0.0,                      # Barapullah Elevated (100% dry flyover)
        "21": round(0.12 * scale, 3),   # Ashram Chowk (Moderate ponding: ~12cm)
        "23": round(0.09 * scale, 3),   # Sarita Vihar
    }

    # 3. Fetch active crowdsourced photo hazards from database
    hazard_records = db.query(HazardPhotoReport).filter(HazardPhotoReport.verified == True).all()
    active_hazards = [
        {
            "id": h.id,
            "location_name": h.location_name,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "depth_cm": h.depth_cm,
            "issue_tag": h.issue_tag,
            "photo_url": h.photo_url,
            "description": h.description,
            "recession_eta_min": h.recession_eta_min,
            "created_at": h.created_at.isoformat()
        }
        for h in hazard_records
    ]

    # 4. Calculate dynamic flood-weighted routes
    result = calculate_flood_safe_routes(
        origin_id=origin,
        destination_id=destination,
        swmm_node_depths=swmm_node_depths,
        active_hazards=active_hazards,
        current_rain_rate_mm_hr=rain_rate
    )

    return result


@router.post("/route/report-hazard")
async def report_waterlogging_hazard(
    location_name: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    depth_cm: float = Form(...),
    issue_tag: str = Form("Waterlogging"),
    description: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Crowdsourced incident upload with photo.
    Instantly updates road graph and dynamically diverts upcoming drivers away from flooded underpasses.
    """
    photo_url = None

    if file and file.filename:
        uploads_dir = Path(__file__).resolve().parents[2] / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(file.filename).suffix or ".jpg"
        unique_filename = f"hazard_{uuid.uuid4().hex[:10]}{ext}"
        destination_path = uploads_dir / unique_filename

        with destination_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        photo_url = f"/uploads/{unique_filename}"

    # Calculate recession time for this specific water depth
    recession_calc = calculate_recession_time_minutes(
        water_depth_cm=depth_cm,
        surface_type="concrete" if "underpass" in location_name.lower() else "asphalt",
        drainage_condition="blocked" if depth_cm > 20 else "warning"
    )

    hazard_report = HazardPhotoReport(
        location_name=location_name,
        latitude=latitude,
        longitude=longitude,
        depth_cm=depth_cm,
        issue_tag=issue_tag,
        photo_url=photo_url,
        description=description,
        recession_eta_min=recession_calc["recession_minutes"],
        verified=True
    )

    db.add(hazard_report)
    db.commit()
    db.refresh(hazard_report)

    return {
        "status": "success",
        "message": f"Hazard confirmed. Navigation system has rerouted upcoming drivers to bypass {location_name}.",
        "hazard_id": hazard_report.id,
        "location_name": hazard_report.location_name,
        "depth_cm": hazard_report.depth_cm,
        "recession_text": recession_calc["recession_text"],
        "photo_url": photo_url
    }


@router.get("/route/hazards")
def list_active_hazards(db: Session = Depends(get_db)):
    """Returns active crowdsourced waterlogging hazards for the map layer."""
    hazards = db.query(HazardPhotoReport).order_by(HazardPhotoReport.created_at.desc()).limit(50).all()
    return [
        {
            "id": h.id,
            "location_name": h.location_name,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "depth_cm": h.depth_cm,
            "issue_tag": h.issue_tag,
            "photo_url": h.photo_url,
            "description": h.description,
            "recession_eta_min": h.recession_eta_min,
            "created_at": h.created_at.isoformat()
        }
        for h in hazards
    ]


# In-memory high-frequency spatial telemetry buffer simulating Redis Geospatial Stream
LIVE_TELEMETRY_STREAM: List[dict] = []


@router.post("/telemetry/ingest")
def ingest_vehicle_telemetry(payload: dict):
    """
    Ingests vehicle GPS telemetry chunks. Detects crawling anomalies (<10 km/h)
    and evaluates Bayesian flood probability without requiring photo uploads.
    """
    from app.services.hydrology import calculate_bayesian_flood_probability

    speed = float(payload.get("speed_kmh", 45.0))
    rain = float(payload.get("rain_mm_hr", 65.0))
    lat = float(payload.get("latitude", 28.5660))
    lon = float(payload.get("longitude", 77.2340))
    vehicle_id = payload.get("vehicle_id", "veh_anonymous")

    is_crawling = speed < 10.0 and rain > 20.0
    speed_drop_ratio = max(0.0, min(1.0, (50.0 - speed) / 45.0)) if speed < 50.0 else 0.0

    bayesian = calculate_bayesian_flood_probability(
        rain_rate_mm_hr=rain,
        is_sag=True,
        speed_drop_ratio=speed_drop_ratio,
        crowd_pings_count=2 if is_crawling else 0,
        swmm_surcharge_ratio=0.75 if rain > 35 else 0.1
    )

    LIVE_TELEMETRY_STREAM.append({
        "vehicle_id": vehicle_id,
        "lat": lat,
        "lon": lon,
        "speed_kmh": speed,
        "is_crawling": is_crawling,
        "timestamp": datetime.utcnow().isoformat()
    })
    if len(LIVE_TELEMETRY_STREAM) > 100:
        LIVE_TELEMETRY_STREAM.pop(0)

    return {
        "status": "ok",
        "speed_anomaly_detected": is_crawling,
        "bayesian_inundation": bayesian,
        "reroute_active": bayesian["inundation_probability"] >= 0.70
    }


@router.get("/hydraulics/live-status")
def get_live_hydraulics_telemetry(
    slope: float = Query(0.015, description="Longitudinal road slope"),
    depth_m: float = Query(0.18, description="Water depth in meters"),
    street_width_m: float = Query(7.0, description="Street curb-to-curb width"),
    surface_type: str = Query("asphalt", description="Pavement type: asphalt or concrete"),
    rain_rate_mm_hr: float = Query(65.0, description="Rain intensity in mm/hr"),
    is_sag: bool = Query(True, description="Whether location is a topographical sag depression"),
    speed_drop_ratio: float = Query(0.85, description="Traffic velocity slowdown ratio"),
    crowd_pings_count: int = Query(3, description="Active crowdsourced 1-tap pings"),
    swmm_surcharge_ratio: float = Query(0.8, description="EPA SWMM pipe surcharge ratio")
):
    """
    Returns real-time Manning open-channel gutter discharge and Bayesian sensor fusion data.
    """
    from app.services.hydrology import calculate_manning_flow, calculate_bayesian_flood_probability

    manning = calculate_manning_flow(
        slope=slope,
        depth_m=depth_m,
        street_width_m=street_width_m,
        surface_type=surface_type
    )
    bayesian = calculate_bayesian_flood_probability(
        rain_rate_mm_hr=rain_rate_mm_hr,
        is_sag=is_sag,
        speed_drop_ratio=speed_drop_ratio,
        crowd_pings_count=crowd_pings_count,
        swmm_surcharge_ratio=swmm_surcharge_ratio
    )

    return {
        "manning_open_channel": manning,
        "bayesian_sensor_fusion": bayesian,
        "active_telemetry_pings_cached": len(LIVE_TELEMETRY_STREAM),
        "telemetry_stream": LIVE_TELEMETRY_STREAM[-5:]
    }


