"""
CoastGuard AI — Synthetic Data Generator
Generates fake fishermen/boatmen registry for demo purposes.
Uses ONLY synthetic coordinates near Indian coastal/riverine areas.
No real personal data. Complies with Gnani AI contest rules.
"""

import json
import random
import math
from pathlib import Path
from typing import List, Dict

try:
    from geo_matcher import haversine_km, get_phones_in_radius
except ImportError:
    from .geo_matcher import haversine_km, get_phones_in_radius

# Synthetic ghat/coastal locations (public geographic centroids, no real people)
SYNTHETIC_LOCATIONS = [
    {"name": "Varanasi Ghat Cluster (Assi - Dashashwamedh)", "lat": 25.3176, "lon": 83.0060, "region": "Uttar Pradesh", "primary_lang": "hi"},
    {"name": "Patna Ganga Ghat Cluster", "lat": 25.5941, "lon": 85.1376, "region": "Bihar", "primary_lang": "hi"},
    {"name": "Kolkata Hooghly Ferry Terminal", "lat": 22.5726, "lon": 88.3639, "region": "West Bengal", "primary_lang": "bn"},
    {"name": "Mumbai Sassoon Fishing Harbour", "lat": 18.9388, "lon": 72.8354, "region": "Maharashtra", "primary_lang": "mr"},
    {"name": "Chilika Lake Fishermen Settlement", "lat": 19.7254, "lon": 85.3298, "region": "Odisha", "primary_lang": "or"},
    {"name": "Sundarbans Delta Mangrove Hub", "lat": 21.9497, "lon": 88.9220, "region": "West Bengal", "primary_lang": "bn"},
    {"name": "Prayagraj Triveni Sangam", "lat": 25.4358, "lon": 81.8463, "region": "Uttar Pradesh", "primary_lang": "hi"},
    {"name": "Haridwar Har Ki Pauri", "lat": 29.9457, "lon": 78.1642, "region": "Uttarakhand", "primary_lang": "hi"},
]

HINDI_NAMES = [
    "Ramesh Kumar", "Suresh Yadav", "Mohan Lal", "Rajesh Singh",
    "Dinesh Gupta", "Mahesh Sharma", "Umesh Patel", "Ganesh Das",
    "Brajesh Mishra", "Kamlesh Tiwari", "Shyamlal Chauhan", "Devkaran Bind",
    "Awadhesh Nishad", "Harikesh Mallah", "Phoolchand Kevat", "Dhruv Sahani",
    "Ramdeen Fisherman", "Lallan Boatman", "Chappu Nishad", "Nathu Kevat",
    "Shankar Mallah", "Kallu Bind", "Chhagan Das", "Bhura Sahni",
    "Tota Ram", "Munna Lal", "Chetan Nishad", "Babu Ram Kevat",
    "Subrata Mondal", "Debasish Halder", "Bikash Barman", "Tapan Majhi",
    "Prabhat Behera", "Narayan Nayak", "Sudam Jena", "Prakash Rout",
    "Eknath Koli", "Tukaram Patil", "Vithal Vaity", "Gopal Nakhawa"
]

BOAT_TYPES = [
    "Country Wood Dinghy (लकड़ी की डोंगी)",
    "Small Motorized Skiff (छोटी मोटर बोट)",
    "Machua Fishing Boat (मछुआ नाव)",
    "Fibre Reinforced Hull (फाइबर नाव)",
    "Oar-powered River Ferry (चप्पू वाली नाव)",
    "Mechanized River Catamaran"
]


def random_offset(radius_km=1.8):
    """Random geographical offset within radius_km kilometers."""
    r = radius_km * math.sqrt(random.random())
    theta = random.uniform(0, 2 * math.pi)
    dlat = (r / 111.0) * math.cos(theta)
    dlon = (r / (111.0 * math.cos(math.radians(25)))) * math.sin(theta)
    return dlat, dlon


def generate_synthetic_registry(n_per_cluster=8) -> List[Dict]:
    """
    Generate a synthetic registry of fishermen/boatmen.
    All phone numbers are synthetic mock format (starts with 0000).
    """
    registry = []
    uid = 1001

    for location in SYNTHETIC_LOCATIONS:
        for i in range(n_per_cluster):
            dlat, dlon = random_offset(1.5)
            name = random.choice(HINDI_NAMES)
            lang = location["primary_lang"] if random.random() > 0.25 else "hi"
            entry = {
                "id": f"CG-{uid}",
                "name": name,
                "lat": round(location["lat"] + dlat, 6),
                "lon": round(location["lon"] + dlon, 6),
                "cluster": location["name"],
                "region": location["region"],
                # Synthetic phone numbers — format: 0000-XXXXXXX (clearly fake mock numbers)
                "phone": f"0000-{random.randint(1100000, 9999999)}",
                "language": lang,
                "boat_type": random.choice(BOAT_TYPES),
                "active": True,
                "crew_size": random.randint(1, 5)
            }
            registry.append(entry)
            uid += 1

    return registry


REGISTRY_FILE = Path(__file__).parent / "synthetic_registry.json"


def load_or_generate_registry() -> List[Dict]:
    """Load registry from synthetic_registry.json or generate and save it."""
    if REGISTRY_FILE.exists():
        try:
            with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    registry = generate_synthetic_registry(n_per_cluster=8)
    with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
    print(f"[CoastGuard] Generated {len(registry)} synthetic registrations at {REGISTRY_FILE.name}")
    return registry


if __name__ == "__main__":
    reg = load_or_generate_registry()
    print(f"Generated {len(reg)} synthetic boatmen records across {len(SYNTHETIC_LOCATIONS)} clusters.")
    print("Sample record:", json.dumps(reg[0], ensure_ascii=False, indent=2))
