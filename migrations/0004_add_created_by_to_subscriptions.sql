-- Migration number: 0004    2025-02-10T00:00:00.000Z
ALTER TABLE subscriptions ADD COLUMN created_by TEXT;
