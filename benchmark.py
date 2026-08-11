#!/usr/bin/env python3
"""
benchmark.py - Indexing Performance & Query Profiler CLI
Compares SQL query execution latency and execution plans (EXPLAIN QUERY PLAN)
WITH vs WITHOUT database index 'idx_app_sdks_sdk_id' on app_sdks.
"""

import os
import time
import sqlite3
import argparse

DB_FILE = os.path.join(os.path.dirname(__file__), "sdk_detector.db")

def run_benchmark(sdk_id=1, platform="android", iterations=10, db_path=DB_FILE):
    if not os.path.exists(db_path):
        print(f"[Error] Database '{db_path}' does not exist. Run seed.py first.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check total rows
    cursor.execute("SELECT COUNT(*) FROM apps;")
    app_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM app_sdks;")
    link_count = cursor.fetchone()[0]

    print("=" * 65)
    print(" [PROFILER] MOBILE SDK DETECTOR - SQL QUERY PERFORMANCE PROFILER")
    print("=" * 65)
    print(f" Database State: {app_count:,} Apps | {link_count:,} SDK Relationships")
    print(f" Target Query: Apps using SDK #{sdk_id} on '{platform}' platform (TOP 50 by installs)")
    print("-" * 65)

    test_query = """
        SELECT a.name, a.bundle_id, a.installs 
        FROM apps a
        JOIN app_sdks link ON a.id = link.app_id
        WHERE link.sdk_id = ? AND a.platform = ?
        ORDER BY a.installs DESC
        LIMIT 50;
    """

    # -------------------------------------------------------------
    # 1. WITH INDEX BENCHMARK
    # -------------------------------------------------------------
    # Ensure index exists
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_app_sdks_sdk_id ON app_sdks(sdk_id);")
    conn.commit()

    cursor.execute(f"EXPLAIN QUERY PLAN {test_query}", (sdk_id, platform))
    indexed_plan = cursor.fetchall()

    start_t = time.perf_counter()
    for _ in range(iterations):
        cursor.execute(test_query, (sdk_id, platform))
        _ = cursor.fetchall()
    indexed_time_ms = ((time.perf_counter() - start_t) / iterations) * 1000

    # -------------------------------------------------------------
    # 2. WITHOUT INDEX BENCHMARK
    # -------------------------------------------------------------
    # Drop index temporarily in transaction
    cursor.execute("DROP INDEX IF EXISTS idx_app_sdks_sdk_id;")
    conn.commit()

    cursor.execute(f"EXPLAIN QUERY PLAN {test_query}", (sdk_id, platform))
    unindexed_plan = cursor.fetchall()

    start_t = time.perf_counter()
    for _ in range(iterations):
        cursor.execute(test_query, (sdk_id, platform))
        _ = cursor.fetchall()
    unindexed_time_ms = ((time.perf_counter() - start_t) / iterations) * 1000

    # Restore index
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_app_sdks_sdk_id ON app_sdks(sdk_id);")
    conn.commit()
    conn.close()

    # -------------------------------------------------------------
    # PRINT COMPARISON RESULTS
    # -------------------------------------------------------------
    speedup = (unindexed_time_ms / indexed_time_ms) if indexed_time_ms > 0 else 1.0

    print("\n[1] WITHOUT INDEX (idx_app_sdks_sdk_id removed):")
    print(f"  -> Execution Latency: {unindexed_time_ms:.3f} ms")
    print("  -> Query Execution Plan:")
    for step in unindexed_plan:
        print(f"      * {step[3]}")

    print("\n[2] WITH B-TREE INDEX (idx_app_sdks_sdk_id ACTIVE):")
    print(f"  -> Execution Latency: {indexed_time_ms:.3f} ms")
    print("  -> Query Execution Plan:")
    for step in indexed_plan:
        print(f"      * {step[3]}")

    print("-" * 65)
    print(f" [RESULT] INDEX PROVIDES A {speedup:.1f}x LATENCY REDUCTION! ({unindexed_time_ms:.2f}ms -> {indexed_time_ms:.2f}ms)")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Query Performance & Index Profiler")
    parser.add_argument("--sdk-id", type=int, default=1, help="SDK ID to query")
    parser.add_argument("--platform", default="android", help="Platform ('android' or 'ios')")
    parser.add_argument("--iterations", type=int, default=10, help="Number of benchmark iterations")
    args = parser.parse_args()

    run_benchmark(args.sdk_id, args.platform, args.iterations)
