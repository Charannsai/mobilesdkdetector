# Mobile SDK Detector & Crawl Pipeline

A functional, lightweight data pipeline and high-density database query profiler mirroring **MixRank’s** core business architecture: crawling app metadata, running static signature analysis to detect third-party SDKs, storing relationships in an optimized relational database, and profiling query execution costs in real time.

---

## 🎯 Architectural Overview

```
[Local HTML/JSON Raw Files] (Mock App Store Listings / Plist / XML Manifests)
               │
               ▼
   [Python ETL Parser Script] ──(Detects SDK signatures via regex patterns)
               │
               ▼
     [SQLite Database Engine] ──(Indexed Join Tables: apps, sdks, app_sdks)
               │
               ▼
[Next.js API Routes (TypeScript)] ──(Runs parameterized SQL + captures EXPLAIN QUERY PLAN)
               │
               ▼
 [Minimal Black & Lime Dashboard] ──(Renders adoption metrics & latency profiles)
```

---

## 💾 Database Schema (`schema.sql`)

The schema is highly normalized with explicit indexes designed to handle large-scale many-to-many lookups (Millions of Apps × Thousands of SDKs):

```sql
CREATE TABLE apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bundle_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(10) CHECK (platform IN ('android', 'ios')),
    developer VARCHAR(255),
    installs INT DEFAULT 0,
    crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sdks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    signature_pattern TEXT NOT NULL
);

CREATE TABLE app_sdks (
    app_id INT REFERENCES apps(id) ON DELETE CASCADE,
    sdk_id INT REFERENCES sdks(id) ON DELETE CASCADE,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (app_id, sdk_id)
);

-- Query 1: Find all Apps using a specific SDK (Reverse index lookup)
CREATE INDEX idx_app_sdks_sdk_id ON app_sdks(sdk_id);

-- Query 2: App lookup by platform & installs ranking
CREATE INDEX idx_apps_platform_installs ON apps(platform, installs DESC);
```

---

## 🛠️ CLI Engine & Benchmark Tools

### 1. Python ETL Static Analysis (`pipeline.py`)
Parses raw app files from `mock_sources/`, executes signature matching against defined SDK footprints (Stripe, Firebase Analytics, Sentry, Mixpanel, Segment, Adjust, AppsFlyer, RevenueCat, Amplitude, OneSignal, Datadog, Branch), and performs batch ingestion inside transaction blocks:

```bash
python pipeline.py --mock-dir mock_sources
```

### 2. High-Scale Generator (`seed.py`)
Generates 50,000 synthetic apps and 150,000 SDK relationships to test database indexing under high-volume load:

```bash
python seed.py --apps 50000 --links 150000
```

### 3. Query Latency & Index Profiler (`benchmark.py`)
Compares SQL query execution latencies and execution trees (`EXPLAIN QUERY PLAN`) WITH vs WITHOUT `idx_app_sdks_sdk_id`:

```bash
python benchmark.py --sdk-id 1 --platform android --iterations 10
```

---

## 🚀 Web Dashboard & EXPLAIN Console

A minimal, high-density dashboard built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**.

### Key UI Features:
1. **Pipeline Health Panel**: Live counters for total apps crawled, SDK links established, DB file storage metrics, and active index status.
2. **SDK Adoption Grid**: Tracked SDKs sorted by penetration percentage with category filters and platform breakdowns (iOS vs Android).
3. **Real-Time Query Console**: Select an SDK & Platform, execute parameterized SQL queries on the server, and render live execution plan trees (`EXPLAIN QUERY PLAN`) alongside latency metrics in milliseconds.
4. **Index Performance Lab**: Interactive test comparing query performance with B-Tree index vs sequential table scan.

---

## 🚦 Quickstart

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run ETL Pipeline & Seed Mock Database**:
   ```bash
   python pipeline.py
   python seed.py --apps 10000 --links 30000
   ```

3. **Start Web Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.
