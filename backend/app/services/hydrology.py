from typing import Any, Dict


def green_ampt_step(
    rainfall_rate_mm_hr: float,
    time_step_hr: float,
    cumulative_infiltration_mm: float,
    suction_head_mm: float,
    hydraulic_conductivity_mm_hr: float,
    moisture_deficit: float
):
    """
    GAHM (Green-Ampt Hydrology Model) step calculation.
    Computes incremental water infiltration into soil based on suction head,
    moisture deficit, and saturated hydraulic conductivity.
    """
    if rainfall_rate_mm_hr <= 0:
        return (0.0, cumulative_infiltration_mm)

    if cumulative_infiltration_mm <= 0:
        infiltration_capacity = hydraulic_conductivity_mm_hr
    else:
        infiltration_capacity = hydraulic_conductivity_mm_hr * (
            1 + (suction_head_mm * moisture_deficit) / cumulative_infiltration_mm
        )

    infiltration_rate = min(
        rainfall_rate_mm_hr,
        max(hydraulic_conductivity_mm_hr, infiltration_capacity)
    )

    infiltration_mm = infiltration_rate * time_step_hr
    new_cumulative = cumulative_infiltration_mm + infiltration_mm

    return (infiltration_mm, new_cumulative)


# Standard surface runoff parameters based on urban surface characteristics
SURFACE_PROPERTIES: Dict[str, Dict[str, Any]] = {
    "asphalt": {
        "label": "Paved Asphalt Road",
        "runoff_coefficient": 0.92,
        "hydraulic_conductivity_mm_hr": 0.8,
        "suction_head_mm": 110.0,
        "moisture_deficit": 0.05,
        "gutter_capacity_mm_hr": 65.0,  # Road storm drain discharge capacity
        "description": "High imperviousness. 92% of rainfall turns into surface runoff flowing toward curbs and storm inlets."
    },
    "concrete": {
        "label": "Concrete / Flyover / Underpass",
        "runoff_coefficient": 0.95,
        "hydraulic_conductivity_mm_hr": 0.2,
        "suction_head_mm": 130.0,
        "moisture_deficit": 0.02,
        "gutter_capacity_mm_hr": 50.0,
        "description": "Impermeable surface. Water rapidly ponds in grade-separated sags (underpasses) without active pumping."
    },
    "semi_paved": {
        "label": "Interlocking Pavers / Gravel Shoulder",
        "runoff_coefficient": 0.55,
        "hydraulic_conductivity_mm_hr": 12.0,
        "suction_head_mm": 90.0,
        "moisture_deficit": 0.25,
        "gutter_capacity_mm_hr": 40.0,
        "description": "Moderate permeability. Traps initial precipitation before generating surface runoff."
    },
    "soil": {
        "label": "Unpaved Soil / Roadside Green Belt",
        "runoff_coefficient": 0.18,
        "hydraulic_conductivity_mm_hr": 25.0,
        "suction_head_mm": 60.0,
        "moisture_deficit": 0.38,
        "gutter_capacity_mm_hr": 20.0,
        "description": "High absorption. Permeable soil front absorbs majority of light-to-moderate showers."
    }
}


def calculate_surface_runoff(rainfall_rate_mm_hr: float, surface_type: str = "asphalt") -> Dict[str, Any]:
    """
    Computes runoff generation rate vs soil infiltration rate for the specified surface.
    """
    props = SURFACE_PROPERTIES.get(surface_type.lower(), SURFACE_PROPERTIES["asphalt"])
    c = props["runoff_coefficient"]

    runoff_rate_mm_hr = round(rainfall_rate_mm_hr * c, 2)
    infiltration_rate_mm_hr = round(max(0.0, rainfall_rate_mm_hr - runoff_rate_mm_hr), 2)

    return {
        "surface_type": surface_type,
        "surface_label": props["label"],
        "runoff_coefficient": c,
        "rainfall_rate_mm_hr": rainfall_rate_mm_hr,
        "runoff_rate_mm_hr": runoff_rate_mm_hr,
        "infiltration_rate_mm_hr": infiltration_rate_mm_hr,
        "description": props["description"]
    }


def calculate_recession_time_minutes(
    water_depth_cm: float,
    surface_type: str = "asphalt",
    drainage_condition: str = "normal",
    current_rainfall_rate_mm_hr: float = 0.0
) -> Dict[str, Any]:
    """
    Calculates Water Clearance / Recession Time (kitni der me paani utrega).
    Uses physical mass-balance:
      Effective Drainage Rate = (Gutter Discharge Rate * condition_factor + Soil Infiltration) - Rain Rate
    Returns estimated minutes required to drop water level below safe driving threshold (5 cm).
    """
    if water_depth_cm <= 2.0:
        return {
            "recession_minutes": 0,
            "recession_text": "Road is dry / normal",
            "is_clearing": True,
            "drainage_rate_mm_hr": 0.0,
            "status": "clear"
        }

    props = SURFACE_PROPERTIES.get(surface_type.lower(), SURFACE_PROPERTIES["asphalt"])

    # Drainage condition factor (normal = 1.0, warning/partial block = 0.6, blocked = 0.15, surcharge/backflow = -0.2)
    condition_factors = {
        "normal": 1.0,
        "warning": 0.65,
        "restricted": 0.45,
        "blocked": 0.15,
        "backflow": 0.0
    }
    factor = condition_factors.get(drainage_condition.lower(), 0.8)

    effective_gutter_drain_mm_hr = props["gutter_capacity_mm_hr"] * factor
    effective_infiltration_mm_hr = props["hydraulic_conductivity_mm_hr"]

    total_discharge_mm_hr = effective_gutter_drain_mm_hr + effective_infiltration_mm_hr
    net_drain_rate_mm_hr = total_discharge_mm_hr - (current_rainfall_rate_mm_hr * props["runoff_coefficient"])

    # Target water depth to consider road passable is <= 5 cm
    excess_depth_mm = max(0.0, (water_depth_cm - 5.0) * 10.0)

    if net_drain_rate_mm_hr <= 0:
        # Water is actively rising or stagnated due to ongoing rain and clogged drains
        return {
            "recession_minutes": 999,
            "recession_text": "Water accumulating — active surcharge / heavy rain",
            "is_clearing": False,
            "drainage_rate_mm_hr": round(total_discharge_mm_hr, 1),
            "status": "accumulating"
        }

    # Time in hours = depth / drain rate
    hours = excess_depth_mm / net_drain_rate_mm_hr
    minutes = max(3, int(round(hours * 60)))

    recession_text = f"~{minutes} mins to clear" if minutes < 60 else f"~{round(minutes / 60, 1)} hrs to clear"

    return {
        "recession_minutes": minutes,
        "recession_text": recession_text,
        "is_clearing": True,
        "drainage_rate_mm_hr": round(net_drain_rate_mm_hr, 1),
        "target_safe_depth_cm": 5.0,
        "status": "receding"
    }


def classify_depth(depth_m: float) -> str:
    if depth_m < 0.05:
        return "low"
    if depth_m < 0.15:
        return "moderate"
    if depth_m < 0.30:
        return "high"
    return "severe"


def estimate_confidence(
    forecast_hours_available: int,
    forecast_hours_requested: int,
    nearby_assets_found: int,
    using_demo_model: bool
) -> float:
    score = 1.0
    if forecast_hours_requested > 0:
        coverage_ratio = min(1.0, forecast_hours_available / forecast_hours_requested)
        score *= (0.6 + 0.4 * coverage_ratio)

    if nearby_assets_found <= 0:
        score *= 0.85

    if using_demo_model:
        score *= 0.85

    return round(max(0.0, min(1.0, score)), 2)


def calculate_manning_flow(
    slope: float = 0.012,
    depth_m: float = 0.15,
    street_width_m: float = 7.0,
    surface_type: str = "asphalt"
) -> Dict[str, float]:
    """
    Computes open-channel stormwater discharge rate using Manning's Equation:
      Q = (1 / n) * A * R^(2/3) * S^(1/2)
    where:
      n = Manning's roughness coefficient (0.013 for paved asphalt, 0.015 for concrete)
      A = Cross-sectional water flow area (m^2)
      R = Hydraulic radius A / P (m)
      S = Longitudinal slope of the road
    """
    import math

    n = 0.013 if surface_type.lower() == "asphalt" else 0.015
    area = street_width_m * depth_m
    wetted_perimeter = street_width_m + (2.0 * depth_m)
    hydraulic_radius = area / wetted_perimeter if wetted_perimeter > 0 else 0.0

    discharge_m3_s = (1.0 / n) * area * (hydraulic_radius ** (2.0 / 3.0)) * math.sqrt(max(0.0001, slope))

    return {
        "discharge_m3_s": round(discharge_m3_s, 3),
        "flow_velocity_m_s": round(discharge_m3_s / area, 2) if area > 0 else 0.0,
        "hydraulic_radius_m": round(hydraulic_radius, 4),
        "roughness_n": n
    }


def calculate_bayesian_flood_probability(
    rain_rate_mm_hr: float,
    is_sag: bool = False,
    speed_drop_ratio: float = 0.0,
    crowd_pings_count: int = 0,
    swmm_surcharge_ratio: float = 0.0
) -> Dict[str, Any]:
    """
    Bayesian Multi-Source Sensor Fusion Engine:
    Combines 5 independent telemetry and physical indicators:
      1. Live Rainfall Intensity (Open-Meteo / IMD)
      2. Topographical Sag Depression (DEM)
      3. Passive GPS Velocity Drop (Vehicles crawling <8 km/h)
      4. Crowdsourced 1-Tap Pings
      5. EPA SWMM Conduit Hydraulic Surcharge Ratio (Q_in / Q_cap)
    Returns:
      Probability P in [0.0, 1.0], Hazard Confidence, Risk Classification
    """
    import math

    # Weight assignments based on physical empirical sensitivity
    w_rain = min(1.0, rain_rate_mm_hr / 65.0) * 0.35
    w_sag = 0.20 if is_sag else 0.05
    w_speed = min(1.0, speed_drop_ratio) * 0.25
    w_crowd = min(1.0, crowd_pings_count / 3.0) * 0.15
    w_swmm = min(1.0, swmm_surcharge_ratio) * 0.25

    raw_fusion_score = w_rain + w_sag + w_speed + w_crowd + w_swmm
    # Logistic Sigmoidal normalization centered at threshold 0.45
    probability = round(1.0 / (1.0 + math.exp(-6.5 * (raw_fusion_score - 0.45))), 3)

    if probability >= 0.80:
        status = "CRITICAL_INUNDATION"
        confidence_label = "Confirmed Impassable (Auto-Reroute Active)"
    elif probability >= 0.50:
        status = "HIGH_PROBABILITY_FLOOD"
        confidence_label = "Severe Ponding / Caution Advised"
    elif probability >= 0.25:
        status = "SURFACE_WETNESS"
        confidence_label = "Passable with Minor Splash"
    else:
        status = "CLEAR_DRY"
        confidence_label = "Optimal Road Conditions"

    return {
        "inundation_probability": probability,
        "probability_percentage": round(probability * 100, 1),
        "status": status,
        "confidence_label": confidence_label,
        "fusion_components": {
            "rainfall_weight": round(w_rain, 3),
            "sag_weight": round(w_sag, 3),
            "speed_anomaly_weight": round(w_speed, 3),
            "crowd_pings_weight": round(w_crowd, 3),
            "swmm_surcharge_weight": round(w_swmm, 3)
        }
    }

