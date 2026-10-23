-- Additive only; preserve all ACT-48 tables.
CREATE TABLE IF NOT EXISTS hmo_step5_jobs (
 property_code TEXT PRIMARY KEY,
 digest TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('sending','accepted','needs-review')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
