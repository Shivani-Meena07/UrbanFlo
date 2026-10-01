from typing import Dict, List, Any, Optional, Tuple
import heapq
import math

from app.services.hydrology import (
    calculate_surface_runoff,
    calculate_recession_time_minutes,
    classify_depth
)

# Canonical Delhi locations with accurate coordinates
DELHI_LOCATIONS: Dict[str, Dict[str, Any]] = {
    "connaught_place": {
        "id": "connaught_place",
        "name": "Connaught Place (Central Hub)",
        "lat": 28.6315,
        "lon": 77.2167,
        "swmm_node": "9"
    },
    "india_gate": {
        "id": "india_gate",
        "name": "India Gate / Central Vista",
        "lat": 28.6129,
        "lon": 77.2295,
        "swmm_node": "9"
    },
    "ito_junction": {
        "id": "ito_junction",
        "name": "ITO Junction (Yamuna Basin Sag)",
        "lat": 28.6289,
        "lon": 77.2415,
        "swmm_node": "19",
        "is_flood_prone": True
    },
    "pragati_maidan": {
        "id": "pragati_maidan",
        "name": "Pragati Maidan / Bhairon Marg",
        "lat": 28.6180,
        "lon": 77.2450,
        "swmm_node": "19",
        "is_flood_prone": True
    },
    "lajpat_nagar": {
        "id": "lajpat_nagar",
        "name": "Lajpat Nagar Ring Road",
        "lat": 28.5677,
        "lon": 77.2431,
        "swmm_node": "17",
        "is_flood_prone": True
    },
    "moolchand_underpass": {
        "id": "moolchand_underpass",
        "name": "Moolchand Underpass (Ring Road Sag)",
        "lat": 28.5660,
        "lon": 77.2340,
        "swmm_node": "17",
        "is_underpass": True,
        "is_flood_prone": True
    },
    "barapullah_elevated": {
        "id": "barapullah_elevated",
        "name": "Barapullah Elevated Corridor",
        "lat": 28.5820,
        "lon": 77.2480,
        "swmm_node": "20",
        "is_elevated": True
    },
    "ashram_chowk": {
        "id": "ashram_chowk",
        "name": "Ashram Chowk (Mathura Road)",
        "lat": 28.5710,
        "lon": 77.2590,
        "swmm_node": "21"
    },
    "aiims_dhaula_kuan": {
        "id": "aiims_dhaula_kuan",
        "name": "AIIMS / Ring Road Flyover",
        "lat": 28.5685,
        "lon": 77.2085,
        "swmm_node": "20",
        "is_elevated": True
    },
    "delhi_airport": {
        "id": "delhi_airport",
        "name": "Indira Gandhi International Airport (T3)",
        "lat": 28.5562,
        "lon": 77.1000,
        "swmm_node": "15"
    },
    "sarita_vihar": {
        "id": "sarita_vihar",
        "name": "Sarita Vihar / Mathura Road",
        "lat": 28.5290,
        "lon": 77.2920,
        "swmm_node": "23"
    },
    "yamuna_bazar": {
        "id": "yamuna_bazar",
        "name": "Yamuna Bazar / ISBT Kashmere Gate",
        "lat": 28.6655,
        "lon": 77.2322,
        "swmm_node": "18"
    }
}

# Road segments defining connectivity, length (km), nominal travel time (min), and hydraulic link
ROAD_EDGES = [
    # CP <-> India Gate
    {"u": "connaught_place", "v": "india_gate", "km": 2.8, "base_min": 6, "surface": "asphalt", "name": "Janpath / Rajpath", "swmm_node": "9"},
    
    # India Gate <-> ITO (low lying)
    {"u": "india_gate", "v": "ito_junction", "km": 3.1, "base_min": 7, "surface": "asphalt", "name": "Tilak Marg to ITO", "swmm_node": "19", "sag": True},
    
    # ITO <-> Pragati Maidan (Bhairon Marg underpass area)
    {"u": "ito_junction", "v": "pragati_maidan", "km": 1.9, "base_min": 5, "surface": "concrete", "name": "Vikas Marg - Ring Road Sag", "swmm_node": "19", "underpass": True},
    
    # Pragati Maidan <-> Lajpat Nagar via Ring Road (passes through low points)
    {"u": "pragati_maidan", "v": "moolchand_underpass", "km": 4.5, "base_min": 9, "surface": "asphalt", "name": "Ring Road via Moolchand Underpass", "swmm_node": "17", "underpass": True},
    
    # Direct Mathura Road Corridor (Fastest in dry weather, but passes through Moolchand Underpass sag)
    {"u": "india_gate", "v": "moolchand_underpass", "km": 3.8, "base_min": 6, "surface": "asphalt", "name": "Mathura Road via Moolchand Underpass", "swmm_node": "17", "underpass": True},

    # Moolchand Underpass <-> Lajpat Nagar
    {"u": "moolchand_underpass", "v": "lajpat_nagar", "km": 1.2, "base_min": 3, "surface": "concrete", "name": "Moolchand Sag to Lajpat Nagar", "swmm_node": "17", "underpass": True},
    
    # India Gate <-> Barapullah Elevated (Flood-Free Alternative!)
    {"u": "india_gate", "v": "barapullah_elevated", "km": 4.6, "base_min": 10, "surface": "concrete", "name": "Lodhi Road to Barapullah Flyover", "swmm_node": "20", "elevated": True},
    
    # Barapullah Elevated <-> Lajpat Nagar / Ashram (High elevation, immune to surface inundation)
    {"u": "barapullah_elevated", "v": "lajpat_nagar", "km": 2.8, "base_min": 6, "surface": "concrete", "name": "Barapullah Elevated Bypass Ramp", "swmm_node": "20", "elevated": True},

    
    # Barapullah Elevated <-> Ashram Chowk
    {"u": "barapullah_elevated", "v": "ashram_chowk", "km": 3.0, "base_min": 6, "surface": "concrete", "name": "Barapullah Extension to Ashram", "swmm_node": "21", "elevated": True},
    
    # Lajpat Nagar <-> Ashram Chowk
    {"u": "lajpat_nagar", "v": "ashram_chowk", "km": 2.1, "base_min": 5, "surface": "asphalt", "name": "Ring Road Eastbound", "swmm_node": "21"},
    
    # Ashram Chowk <-> Sarita Vihar
    {"u": "ashram_chowk", "v": "sarita_vihar", "km": 5.4, "base_min": 10, "surface": "asphalt", "name": "Mathura Road Corridor", "swmm_node": "23"},
    
    # India Gate <-> AIIMS / Dhaula Kuan
    {"u": "india_gate", "v": "aiims_dhaula_kuan", "km": 5.8, "base_min": 11, "surface": "asphalt", "name": "Aurobindo Marg to AIIMS Flyover", "swmm_node": "20", "elevated": True},
    
    # AIIMS <-> Moolchand
    {"u": "aiims_dhaula_kuan", "v": "moolchand_underpass", "km": 3.2, "base_min": 7, "surface": "asphalt", "name": "Ring Road Central Corridor", "swmm_node": "17"},
    
    # AIIMS <-> Delhi Airport
    {"u": "aiims_dhaula_kuan", "v": "delhi_airport", "km": 11.5, "base_min": 18, "surface": "asphalt", "name": "NH-48 Airport Expressway", "swmm_node": "15"},
    
    # Connaught Place <-> Yamuna Bazar
    {"u": "connaught_place", "v": "yamuna_bazar", "km": 4.8, "base_min": 11, "surface": "asphalt", "name": "Netaji Subhash Marg to ISBT", "swmm_node": "18"},
    
    # Yamuna Bazar <-> ITO
    {"u": "yamuna_bazar", "v": "ito_junction", "km": 3.8, "base_min": 9, "surface": "asphalt", "name": "Ring Road Yamuna Embankment", "swmm_node": "19"}
]


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def find_closest_location(lat: float, lon: float) -> str:
    """Finds the closest road network node to a given lat/lon."""
    closest_id = "connaught_place"
    min_dist = float("inf")
    for loc_id, loc in DELHI_LOCATIONS.items():
        d = _haversine_distance(lat, lon, loc["lat"], loc["lon"])
        if d < min_dist:
            min_dist = d
            closest_id = loc_id
    return closest_id


def build_road_graph(
    swmm_node_depths: Dict[str, float],
    active_hazards: List[Dict[str, Any]],
    current_rain_rate_mm_hr: float = 0.0
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Constructs adjacency list for road network, mapping SWMM hydraulic node depths
    and crowdsourced hazards to edge weights and water depth in cm.
    """
    graph: Dict[str, List[Dict[str, Any]]] = {loc_id: [] for loc_id in DELHI_LOCATIONS}

    # Map crowdsourced hazards to SWMM node or locations
    hazard_depth_by_location: Dict[str, float] = {}
    for h in active_hazards:
        loc = h.get("location_id") or find_closest_location(h.get("latitude", 0), h.get("longitude", 0))
        h_depth = float(h.get("depth_cm", 0.0))
        hazard_depth_by_location[loc] = max(hazard_depth_by_location.get(loc, 0.0), h_depth)

    for edge in ROAD_EDGES:
        u, v = edge["u"], edge["v"]
        swmm_node = edge.get("swmm_node")
        surface = edge.get("surface", "asphalt")
        is_elevated = edge.get("elevated", False)
        is_underpass = edge.get("underpass", False)

        # Base SWMM depth in meters -> converted to cm
        swmm_depth_m = swmm_node_depths.get(swmm_node, 0.0)
        water_depth_cm = round(swmm_depth_m * 100.0, 1)

        # Underpasses amplify water depth due to low elevation sag
        if is_underpass and water_depth_cm > 2.0:
            water_depth_cm = round(water_depth_cm * 1.5, 1)

        # Elevated roads never collect ponded water
        if is_elevated:
            water_depth_cm = 0.0

        # Check if crowdsourced photo hazard was reported on this road segment
        extra_hazard_cm = max(
            hazard_depth_by_location.get(u, 0.0),
            hazard_depth_by_location.get(v, 0.0)
        )
        if extra_hazard_cm > 0:
            water_depth_cm = max(water_depth_cm, extra_hazard_cm)

        # Hydrology and recession calculation
        recession_info = calculate_recession_time_minutes(
            water_depth_cm=water_depth_cm,
            surface_type=surface,
            drainage_condition="blocked" if water_depth_cm > 20 else ("warning" if water_depth_cm > 8 else "normal"),
            current_rainfall_rate_mm_hr=current_rain_rate_mm_hr
        )

        runoff_info = calculate_surface_runoff(
            rainfall_rate_mm_hr=current_rain_rate_mm_hr,
            surface_type=surface
        )

        edge_data = {
            "to": v,
            "km": edge["km"],
            "base_min": edge["base_min"],
            "surface": surface,
            "name": edge["name"],
            "swmm_node": swmm_node,
            "is_elevated": is_elevated,
            "is_underpass": is_underpass,
            "water_depth_cm": water_depth_cm,
            "risk_level": classify_depth(water_depth_cm / 100.0),
            "recession_info": recession_info,
            "runoff_info": runoff_info
        }

        # Bidirectional road
        graph[u].append(edge_data)
        reverse_data = dict(edge_data)
        reverse_data["to"] = u
        graph[v].append(reverse_data)

    return graph


def _dijkstra(
    graph: Dict[str, List[Dict[str, Any]]],
    start: str,
    target: str,
    apply_flood_penalty: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Dijkstra shortest path algorithm.
    When apply_flood_penalty is True:
      Cost = Base_Time * (1 + alpha * Depth^2) + Impassable_Block
    When apply_flood_penalty is False:
      Cost = Base_Time (pure distance/travel time)
    """
    # Priority queue: (cost, current_node, path, edges_traversed)
    queue: List[Tuple[float, str, List[str], List[Dict[str, Any]]]] = [(0.0, start, [start], [])]
    visited: Dict[str, float] = {}

    while queue:
        cost, node, path, edges = heapq.heappop(queue)

        if node == target:
            # Reconstruct route details
            total_km = sum(e["km"] for e in edges)
            base_duration_min = sum(e["base_min"] for e in edges)
            max_depth_cm = max((e["water_depth_cm"] for e in edges), default=0.0)

            # Max recession time on any segment of the path
            max_recession = max(
                (e["recession_info"]["recession_minutes"] for e in edges if e["recession_info"]["is_clearing"]),
                default=0
            )

            # Compile route coordinates
            coords: List[List[float]] = []
            for p in path:
                loc = DELHI_LOCATIONS[p]
                coords.append([loc["lat"], loc["lon"]])

            # Determine flood safety score (100 = completely dry, 0 = impassable)
            if max_depth_cm == 0:
                safety_score = 100
                safety_label = "SAFE (100% Flood-Free)"
            elif max_depth_cm < 10:
                safety_score = 85
                safety_label = "PASSABLE (Minor Splash)"
            elif max_depth_cm < 25:
                safety_score = 45
                safety_label = "CAUTION (Moderate Ponding)"
            else:
                safety_score = 10
                safety_label = "HAZARDOUS (Severe Waterlogging)"

            return {
                "path_nodes": path,
                "coordinates": coords,
                "total_km": round(total_km, 1),
                "duration_min": int(math.ceil(cost if not apply_flood_penalty else base_duration_min + (max_depth_cm * 0.2))),
                "max_depth_cm": max_depth_cm,
                "safety_score": safety_score,
                "safety_label": safety_label,
                "max_recession_minutes": max_recession,
                "recession_text": f"~{max_recession} mins to drain" if max_recession > 0 else "Road is dry",
                "edges": edges
            }

        if node in visited and visited[node] <= cost:
            continue
        visited[node] = cost

        for edge in graph.get(node, []):
            nxt = edge["to"]
            base_time = edge["base_min"]
            depth_cm = edge["water_depth_cm"]

            if apply_flood_penalty:
                if depth_cm >= 28.0:
                    # Impassable road - severely penalized so algorithm actively finds elevated/dry bypass
                    edge_cost = base_time + 1000.0 + (depth_cm * 10)
                elif depth_cm >= 15.0:
                    # Heavy waterlogging - high penalty
                    edge_cost = base_time * 3.5 + 25.0
                elif depth_cm >= 5.0:
                    # Moderate waterlogging
                    edge_cost = base_time * 1.6 + 5.0
                else:
                    # Safe road
                    edge_cost = base_time
            else:
                # Direct route without detour penalty (natural route)
                edge_cost = base_time

            new_cost = cost + edge_cost
            if nxt not in visited or new_cost < visited.get(nxt, float("inf")):
                heapq.heappush(queue, (new_cost, nxt, path + [nxt], edges + [edge]))

    return None


def fetch_real_road_geometry(coords: List[List[float]]) -> Tuple[List[List[float]], List[Dict[str, Any]]]:
    """
    Queries OSRM routing engine to fetch real-world road geometry with exact curves,
    intersections, flyover alignments, and turn-by-turn maneuvers.
    Falls back gracefully to smooth densified geometry if offline or timeout occurs.
    """
    if len(coords) < 2:
        return coords, []

    try:
        import urllib.request
        import json

        coord_str = ";".join(f"{c[1]},{c[0]}" for c in coords)
        url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}?overview=full&geometries=geojson&steps=true"
        req = urllib.request.Request(url, headers={"User-Agent": "INUNDRA_Navigation/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("code") == "Ok" and data.get("routes"):
                route = data["routes"][0]
                geojson_coords = route["geometry"]["coordinates"]
                real_lat_lngs = [[round(c[1], 6), round(c[0], 6)] for c in geojson_coords]

                maneuvers = []
                for leg in route.get("legs", []):
                    for step in leg.get("steps", []):
                        m = step.get("maneuver", {})
                        m_type = m.get("type", "turn")
                        m_mod = m.get("modifier", "")
                        street = step.get("name") or "Corridor"
                        action = f"{m_type} {m_mod}".strip()
                        maneuvers.append({
                            "instruction": f"{action.capitalize()} onto {street}",
                            "distance_m": round(step.get("distance", 0)),
                            "duration_s": round(step.get("duration", 0)),
                            "road_name": street
                        })

                if len(real_lat_lngs) > 10:
                    return real_lat_lngs, maneuvers
    except Exception:
        pass

    # High-fidelity densified fallback: smooth road curves so car never jumps across buildings
    densified = []
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i + 1]
        steps = 15
        for s in range(steps):
            t = s / steps
            densified.append([
                round(p1[0] + (p2[0] - p1[0]) * t, 6),
                round(p1[1] + (p2[1] - p1[1]) * t, 6)
            ])
    densified.append(coords[-1])
    return densified, []


def calculate_flood_safe_routes(
    origin_id: str,
    destination_id: str,
    swmm_node_depths: Dict[str, float],
    active_hazards: List[Dict[str, Any]],
    current_rain_rate_mm_hr: float = 0.0
) -> Dict[str, Any]:
    """
    Main Route Planning function:
    Returns both the 'Direct Route' (pure shortest distance) and the 'Safe Route' (flood-penalized bypass).
    Enriches paths with real-world OSRM road geometry for realistic turn-by-turn navigation.
    """
    # Normalize origin / destination IDs
    if origin_id not in DELHI_LOCATIONS:
        origin_id = "connaught_place"
    if destination_id not in DELHI_LOCATIONS:
        destination_id = "lajpat_nagar"

    if origin_id == destination_id:
        destination_id = "lajpat_nagar" if origin_id != "lajpat_nagar" else "connaught_place"

    graph = build_road_graph(swmm_node_depths, active_hazards, current_rain_rate_mm_hr)

    # 1. Direct Route (No flood diversion)
    direct_route = _dijkstra(graph, origin_id, destination_id, apply_flood_penalty=False)
    
    # 2. Flood-Safe Route (With dynamic flood diversion)
    safe_route = _dijkstra(graph, origin_id, destination_id, apply_flood_penalty=True)

    if not safe_route:
        safe_route = direct_route

    # Enrich both routes with real road curves and street maneuvers
    if direct_route and direct_route.get("coordinates"):
        d_coords, d_maneuvers = fetch_real_road_geometry(direct_route["coordinates"])
        direct_route["coordinates"] = d_coords
        direct_route["maneuvers"] = d_maneuvers

    if safe_route and safe_route.get("coordinates"):
        s_coords, s_maneuvers = fetch_real_road_geometry(safe_route["coordinates"])
        safe_route["coordinates"] = s_coords
        safe_route["maneuvers"] = s_maneuvers

    # Provide clear explanation why Safe Route is recommended
    is_diversion_needed = direct_route["max_depth_cm"] > 15.0 and safe_route["max_depth_cm"] < direct_route["max_depth_cm"]

    if is_diversion_needed:
        diff_mins = max(1, safe_route["duration_min"] - direct_route["duration_min"])
        explanation = (
            f"Bypasses {direct_route['max_depth_cm']:.0f}cm waterlogging via high-capacity elevated corridors. "
            f"Adds only +{diff_mins} mins while avoiding vehicle stalling risk."
        )
    elif safe_route["max_depth_cm"] == 0:
        explanation = "Direct route is completely dry and safe. No flood diversion required."
    else:
        explanation = f"Route has minor surface wetness ({safe_route['max_depth_cm']:.0f}cm), but storm gutters are functioning normally."

    return {
        "origin": DELHI_LOCATIONS[origin_id],
        "destination": DELHI_LOCATIONS[destination_id],
        "is_diversion_recommended": is_diversion_needed,
        "recommendation_summary": explanation,
        "direct_route": direct_route,
        "safe_route": safe_route,
        "hydraulics_summary": {
            "rain_rate_mm_hr": current_rain_rate_mm_hr,
            "engine": "EPA SWMM Dynamic Wave Routing",
            "active_hazards_count": len(active_hazards)
        }
    }

