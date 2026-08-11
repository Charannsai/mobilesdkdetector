-- Mobile SDK Detector Schema (SQLite / PostgreSQL Compatible)

CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bundle_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(10) CHECK (platform IN ('android', 'ios')),
    developer VARCHAR(255),
    installs INT DEFAULT 0,
    crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sdks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    signature_pattern TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_sdks (
    app_id INT REFERENCES apps(id) ON DELETE CASCADE,
    sdk_id INT REFERENCES sdks(id) ON DELETE CASCADE,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (app_id, sdk_id)
);

-- Index 1: Optimize reverse SDK lookup (Find all apps using a specific SDK)
CREATE INDEX IF NOT EXISTS idx_app_sdks_sdk_id ON app_sdks(sdk_id);

-- Index 2: Optimize app lookups filtered by platform and ordered by install count
CREATE INDEX IF NOT EXISTS idx_apps_platform_installs ON apps(platform, installs DESC);
