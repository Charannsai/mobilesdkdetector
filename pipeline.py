#!/usr/bin/env python3
"""
pipeline.py - Mobile SDK Detector ETL & Static Analysis Engine
Crawls/parses mock app metadata, executes regex signature matching,
and performs batch ingestion into SQLite (or PostgreSQL).
"""

import os
import re
import glob
import time
import sqlite3
import argparse

DB_FILE = os.path.join(os.path.dirname(__file__), "sdk_detector.db")
SCHEMA_FILE = os.path.join(os.path.dirname(__file__), "schema.sql")

# Curated SDK Signature Definitions for Static Analysis
SDK_SIGNATURES = [
    {
        "name": "Stripe",
        "slug": "stripe",
        "category": "Payments",
        "pattern": r"(com\.stripe|StripeSDK|js\.stripe\.com|PaymentElement)"
    },
    {
        "name": "Firebase Analytics",
        "slug": "firebase-analytics",
        "category": "Analytics",
        "pattern": r"(google-services|FirebaseAnalytics|com\.google\.firebase\.analytics|firebase-measurement)"
    },
    {
        "name": "Sentry",
        "slug": "sentry",
        "category": "Crash Reporting",
        "pattern": r"(io\.sentry|SentryClient|SentrySDK|sentry-cocoa)"
    },
    {
        "name": "Mixpanel",
        "slug": "mixpanel",
        "category": "Analytics",
        "pattern": r"(com\.mixpanel|MixpanelAPI|mixpanel-iphone)"
    },
    {
        "name": "Segment",
        "slug": "segment",
        "category": "Customer Data",
        "pattern": r"(com\.segment\.analytics|analytics-ios|SegmentIntegration)"
    },
    {
        "name": "Adjust",
        "slug": "adjust",
        "category": "Attribution",
        "pattern": r"(com\.adjust\.sdk|AdjustSDK|AdjustConfig)"
    },
    {
        "name": "AppsFlyer",
        "slug": "appsflyer",
        "category": "Attribution",
        "pattern": r"(com\.appsflyer|AppsFlyerLib|AppsFlyerTracker)"
    },
    {
        "name": "RevenueCat",
        "slug": "revenuecat",
        "category": "In-App Purchases",
        "pattern": r"(com\.revenuecat|RevenueCat|Purchases\.framework)"
    },
    {
        "name": "Amplitude",
        "slug": "amplitude",
        "category": "Analytics",
        "pattern": r"(com\.amplitude|Amplitude\.framework|amplitude-android)"
    },
    {
        "name": "OneSignal",
        "slug": "onesignal",
        "category": "Push Notifications",
        "pattern": r"(com\.onesignal|OneSignalSDK|onesignal_app_id)"
    },
    {
        "name": "Datadog",
        "slug": "datadog",
        "category": "Monitoring",
        "pattern": r"(com\.datadog\.android|DatadogEventListener|DatadogSDK)"
    },
    {
        "name": "Branch",
        "slug": "branch",
        "category": "Deep Linking",
        "pattern": r"(io\.branch\.referral|BranchMetrics|BranchSDK)"
    }
]

def get_connection(db_path=DB_FILE):
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(conn):
    """Initializes schema and seeds default SDK definitions."""
    if os.path.exists(SCHEMA_FILE):
        with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        conn.executescript(schema_sql)
    
    cursor = conn.cursor()
    sdk_tuples = [(sdk["name"], sdk["slug"], sdk["category"], sdk["pattern"]) for sdk in SDK_SIGNATURES]
    
    cursor.executemany("""
        INSERT OR IGNORE INTO sdks (name, slug, category, signature_pattern)
        VALUES (?, ?, ?, ?);
    """, sdk_tuples)
    conn.commit()

def analyze_raw_content(file_content):
    """Scans content for matching SDK signatures."""
    detected_slugs = []
    for sdk in SDK_SIGNATURES:
        if re.search(sdk["pattern"], file_content, re.IGNORECASE):
            detected_slugs.append(sdk["slug"])
    return detected_slugs

def parse_mock_file(filepath):
    """Parses metadata and raw content from mock store/manifest file."""
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    filename = os.path.basename(filepath)
    
    # Infer bundle ID, name, platform, installs from file metadata or content
    bundle_match = re.search(r'(?:package|content|CFBundleIdentifier)="([^"]+)"', content)
    name_match = re.search(r'(?:<title>|<key>CFBundleName</key>\s*<string>|android:label=")([^<"]+)', content)
    installs_match = re.search(r'(?:installs|InstallsEstimated)[^\d]*(\d+)', content, re.IGNORECASE)

    bundle_id = bundle_match.group(1) if bundle_match else f"com.example.{filename.split('.')[0]}"
    name = name_match.group(1).strip() if name_match else filename.replace("_", " ").title()
    platform = "ios" if "ios" in filename.lower() or "plist" in filename.lower() else "android"
    installs = int(installs_match.group(1)) if installs_match else 500000

    return {
        "bundle_id": bundle_id,
        "name": name,
        "platform": platform,
        "developer": "Sample Developer Inc.",
        "installs": installs,
        "raw_content": content
    }

def run_etl_pipeline(mock_dir="mock_sources"):
    """Runs the main ETL pipeline across raw mock files."""
    start_time = time.time()
    conn = get_connection()
    init_db(conn)
    
    pattern = os.path.join(mock_dir, "*")
    files = glob.glob(pattern)
    
    if not files:
        print(f"[ETL] Warning: No mock files found in '{mock_dir}/'. Using sample payload.")
        return

    print(f"[ETL] Ingesting {len(files)} raw app metadata files...")
    cursor = conn.cursor()

    # Load SDK slug -> ID mapping
    cursor.execute("SELECT slug, id FROM sdks;")
    sdk_map = {row[0]: row[1] for row in cursor.fetchall()}

    app_records = []
    link_records = []

    for filepath in files:
        app_info = parse_mock_file(filepath)

        # 1. Upsert app
        cursor.execute("""
            INSERT INTO apps (bundle_id, name, platform, developer, installs)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(bundle_id) DO UPDATE SET
                name = excluded.name,
                crawled_at = CURRENT_TIMESTAMP
            RETURNING id;
        """, (app_info["bundle_id"], app_info["name"], app_info["platform"], app_info["developer"], app_info["installs"]))
        
        app_id = cursor.fetchone()[0]

        # 2. Signature detection
        detected_slugs = analyze_raw_content(app_info["raw_content"])
        print(f"  -> App '{app_info['name']}' ({app_info['platform']}): Detected {len(detected_slugs)} SDKs -> {', '.join(detected_slugs)}")

        for slug in detected_slugs:
            if slug in sdk_map:
                link_records.append((app_id, sdk_map[slug]))

    # 3. Batch insert SDK relationships
    if link_records:
        cursor.executemany("""
            INSERT OR IGNORE INTO app_sdks (app_id, sdk_id)
            VALUES (?, ?);
        """, link_records)

    conn.commit()
    conn.close()
    
    elapsed = time.time() - start_time
    print(f"\n[ETL] Complete! Processed {len(files)} files, registered {len(link_records)} SDK links in {elapsed:.3f}s.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mobile SDK Detector ETL Pipeline")
    parser.add_argument("--mock-dir", default="mock_sources", help="Directory containing raw crawl files")
    args = parser.parse_args()
    
    run_etl_pipeline(args.mock_dir)
