from app.services.hydrology import (
    calculate_surface_runoff,
    calculate_recession_time_minutes
)
from app.services.routing import (
    calculate_flood_safe_routes,
    DELHI_LOCATIONS
)


def test_surface_runoff_asphalt_high_imperviousness():
    res = calculate_surface_runoff(rainfall_rate_mm_hr=50.0, surface_type="asphalt")
    assert res["runoff_rate_mm_hr"] > 40.0
    assert res["runoff_coefficient"] == 0.92


def test_surface_runoff_soil_high_absorption():
    res = calculate_surface_runoff(rainfall_rate_mm_hr=50.0, surface_type="soil")
    assert res["infiltration_rate_mm_hr"] > 35.0
    assert res["runoff_coefficient"] == 0.18


def test_recession_time_clear_road():
    res = calculate_recession_time_minutes(water_depth_cm=1.0)
    assert res["recession_minutes"] == 0
    assert res["status"] == "clear"


def test_recession_time_active_ponding():
    res = calculate_recession_time_minutes(
        water_depth_cm=25.0,
        surface_type="asphalt",
        drainage_condition="warning",
        current_rainfall_rate_mm_hr=0.0
    )
    assert res["recession_minutes"] > 0
    assert "to clear" in res["recession_text"]



def test_routing_diverts_traffic_when_direct_route_flooded():
    # Simulate high water depth at node 17 (Moolchand Underpass / Lajpat Nagar sag)
    swmm_node_depths = {
        "17": 0.35,  # 35 cm water in sag
        "9": 0.02,
        "20": 0.0,   # Barapullah elevated dry
    }

    result = calculate_flood_safe_routes(
        origin_id="connaught_place",
        destination_id="lajpat_nagar",
        swmm_node_depths=swmm_node_depths,
        active_hazards=[],
        current_rain_rate_mm_hr=70.0
    )

    assert result["is_diversion_recommended"] is True
    assert result["safe_route"]["max_depth_cm"] < result["direct_route"]["max_depth_cm"]
    # Check that safe route uses elevated Barapullah bypass
    assert "barapullah_elevated" in result["safe_route"]["path_nodes"]


def test_api_route_plan_endpoint(client):
    response = client.get("/api/route/plan", params={"origin": "connaught_place", "destination": "lajpat_nagar"})
    assert response.status_code == 200
    data = response.json()
    assert "safe_route" in data
    assert "direct_route" in data
    assert data["origin"]["id"] == "connaught_place"


def test_manning_open_channel_flow():
    from app.services.hydrology import calculate_manning_flow

    res = calculate_manning_flow(slope=0.015, depth_m=0.15, street_width_m=7.0, surface_type="asphalt")
    assert res["discharge_m3_s"] > 2.0
    assert res["roughness_n"] == 0.013


def test_bayesian_flood_probability_high_storm():
    from app.services.hydrology import calculate_bayesian_flood_probability

    res = calculate_bayesian_flood_probability(
        rain_rate_mm_hr=65.0,
        is_sag=True,
        speed_drop_ratio=0.85,
        crowd_pings_count=3,
        swmm_surcharge_ratio=0.80
    )
    assert res["inundation_probability"] > 0.85
    assert res["status"] == "CRITICAL_INUNDATION"


def test_telemetry_ingest_and_hydraulics_status(client):
    resp = client.post("/api/telemetry/ingest", json={
        "speed_kmh": 6.5,
        "rain_mm_hr": 60.0,
        "latitude": 28.5660,
        "longitude": 77.2340,
        "vehicle_id": "test_car_101"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["speed_anomaly_detected"] is True
    assert data["reroute_active"] is True

    status_resp = client.get("/api/hydraulics/live-status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert "manning_open_channel" in status_data
    assert "bayesian_sensor_fusion" in status_data

