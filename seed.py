#!/usr/bin/env python3
"""
seed.py - Large-Scale Database Generator for Mobile SDK Detector
Populates SQLite database with high-volume synthetic mock apps & SDK link relationships
to demonstrate database indexing & query latency profiling at scale (MixRank focus).
"""

import os
import time
import random
import sqlite3
import argparse

DB_FILE = os.path.join(os.path.dirname(__file__), "sdk_detector.db")
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), "schema.sql")

APP_PREFIXES = ["Apex", "Nova", "Zenith", "Quantum", "Hyper", "Vivid", "Pulse", "Echo", "Flux", "Nexus", "Swift", "Orbit"]
APP_CATEGORIES = ["Pay", "Analytics", "Tracker", "Fitness", "Crypto", "Social", "Shopping", "Mobility", "Messenger", "Studio"]
DEVELOPERS = ["Acme Software Corp", "Global Digital Labs", "Vanguard Interactive", "Starlight Systems", "Apex Mobile Inc", "ByteForge Studio"]

def seed_database(target_apps=50000, target_links=150000, db_path=DB_FILE):
    start_time = time.time()
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    
    # Initialize Schema if missing
    if os.path.exists(SCHEMA_FILE):
        with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
            conn.executescript(f.read())

    cursor = conn.cursor()

    # Ensure base SDKs exist
    from pipeline import SDK_SIGNATURES
    sdk_tuples = [(sdk["name"], sdk["slug"], sdk["category"], sdk["pattern"]) for sdk in SDK_SIGNATURES]
    cursor.executemany("""
        INSERT OR IGNORE INTO sdks (name, slug, category, signature_pattern)
        VALUES (?, ?, ?, ?);
    """, sdk_tuples)
    conn.commit()

    cursor.execute("SELECT id FROM sdks;")
    sdk_ids = [r[0] for r in cursor.fetchall()]
    if not sdk_ids:
        print("[Error] No SDKs available in database.")
        return

    print(f"[Seed] Generating {target_apps:,} synthetic app records...")
    
    # Bulk insert apps inside transaction
    conn.execute("BEGIN TRANSACTION;")
    app_tuples = []
    
    platforms = ["android", "ios"]
    for i in range(1, target_apps + 1):
        bundle_id = f"com.{random.choice(DEVELOPERS).split()[0].lower()}.app{i}"
        name = f"{random.choice(APP_PREFIXES)} {random.choice(APP_CATEGORIES)} {i}"
        platform = random.choice(platforms)
        developer = random.choice(DEVELOPERS)
        installs = random.randint(100, 50000000)
        app_tuples.append((bundle_id, name, platform, developer, installs))

    cursor.executemany("""
        INSERT OR IGNORE INTO apps (bundle_id, name, platform, developer, installs)
        VALUES (?, ?, ?, ?, ?);
    """, app_tuples)
    conn.commit()

    cursor.execute("SELECT id FROM apps;")
    app_ids = [r[0] for r in cursor.fetchall()]
    print(f"[Seed] Created {len(app_ids):,} total apps in DB.")

    print(f"[Seed] Generating {target_links:,} app-SDK relationships...")
    conn.execute("BEGIN TRANSACTION;")
    
    link_tuples = set()
    links_generated = 0
    
    while len(link_tuples) < target_links and links_generated < target_links * 2:
        app_id = random.choice(app_ids)
        sdk_id = random.choice(sdk_ids)
        link_tuples.add((app_id, sdk_id))
        links_generated += 1

    cursor.executemany("""
        INSERT OR IGNORE INTO app_sdks (app_id, sdk_id)
        VALUES (?, ?);
    """, list(link_tuples))
    
    conn.commit()
    conn.close()

    elapsed = time.time() - start_time
    print(f"\n[Seed Success] Population complete in {elapsed:.2f} seconds!")
    print(f"  -> Total Apps: {len(app_ids):,}")
    print(f"  -> Total SDK Links: {len(link_tuples):,}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Mobile SDK Detector database")
    parser.add_argument("--apps", type=int, default=50000, help="Number of apps to generate")
    parser.add_argument("--links", type=int, default=150000, help="Number of SDK relationships to generate")
    args = parser.parse_args()
    
    seed_database(args.apps, args.links)
