"""
CoastGuard AI — Geo-Matching Engine
Calculates spatial proximity, compass bearing, and radius lookup for registered fishermen/boats.
Complies with Gnani AI contest rules (uses purely synthetic GPS coordinates).
"""

import math
from typing import List, Dict, Tuple, Optional

EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth in kilometers.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_KM * c


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate compass bearing in degrees from point 1 to point 2 (0° - 360°).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = (math.cos(phi1) * math.sin(phi2) -
         math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda))

    bearing_deg = (math.degrees(math.atan2(y, x)) + 360.0) % 360.0
    return round(bearing_deg, 1)


def bearing_to_cardinal(bearing_deg: float) -> str:
    """
    Convert compass bearing to 8-point cardinal direction.
    """
    directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"]
    index = int((bearing_deg + 22.5) / 45.0)
    return directions[index]


def get_bounding_box(lat: float, lon: float, radius_km: float) -> Tuple[float, float, float, float]:
    """
    Returns (min_lat, max_lat, min_lon, max_lon) bounding box for fast pre-filtering.
    """
    dlat = radius_km / 111.0
    dlon = radius_km / (111.0 * math.cos(math.radians(lat)))
    return (lat - dlat, lat + dlat, lon - dlon, lon + dlon)


def get_phones_in_radius(
    registry: List[Dict],
    caller_lat: float,
    caller_lon: float,
    radius_km: float = 2.0,
    only_active: bool = True
) -> List[Dict]:
    """
    Find all registered vessels/phones within radius_km of caller coordinates.
    Sorts results from nearest to farthest.
    """
    min_lat, max_lat, min_lon, max_lon = get_bounding_box(caller_lat, caller_lon, radius_km)
    nearby = []

    for person in registry:
        if only_active and not person.get("active", True):
            continue

        p_lat = person.get("lat")
        p_lon = person.get("lon")
        if p_lat is None or p_lon is None:
            continue

        # Fast bounding box check first
        if not (min_lat <= p_lat <= max_lat and min_lon <= p_lon <= max_lon):
            continue

        # Exact haversine distance
        dist = haversine_km(caller_lat, caller_lon, p_lat, p_lon)
        if dist <= radius_km:
            bearing = calculate_bearing(caller_lat, caller_lon, p_lat, p_lon)
            cardinal = bearing_to_cardinal(bearing)

            nearby_item = dict(person)
            nearby_item["distance_km"] = round(dist, 3)
            nearby_item["bearing_deg"] = bearing
            nearby_item["direction"] = cardinal
            nearby_item["relative_position"] = f"{int(dist * 1000)}m {cardinal}"
            nearby.append(nearby_item)

    # Sort nearest first
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby


if __name__ == "__main__":
    # Test with synthetic coordinates
    caller = (25.3176, 83.0060)  # Varanasi Ghat
    dummy_registry = [
        {"id": "TEST-1", "name": "Ramesh", "lat": 25.3200, "lon": 83.0090, "active": True},
        {"id": "TEST-2", "name": "Mohan", "lat": 25.3150, "lon": 83.0040, "active": True},
        {"id": "TEST-3", "name": "Far Away", "lat": 26.5000, "lon": 84.0000, "active": True},
    ]
    results = get_phones_in_radius(dummy_registry, caller[0], caller[1], radius_km=2.0)
    print(f"Found {len(results)} vessels within 2km:")
    for r in results:
        print(f" - {r['name']}: {r['relative_position']} ({r['distance_km']} km)")
