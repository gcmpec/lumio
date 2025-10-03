-- Migration number: 0004    2025-02-10T20:00:00.000Z
DROP TABLE IF EXISTS customer_subscriptions;
DROP TABLE IF EXISTS subscription_features;
DROP TABLE IF EXISTS features;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS activities;

CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    engagement TEXT NOT NULL,
    manager_email TEXT,
    process TEXT,
    deliverable TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_activities_started_at ON activities(started_at);
CREATE INDEX idx_activities_user_email ON activities(user_email);
