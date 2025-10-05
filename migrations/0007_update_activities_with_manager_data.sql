-- Migration number: 0007    2025-10-06T11:30:00.000Z

ALTER TABLE activities ADD COLUMN manager_id INTEGER;
ALTER TABLE activities ADD COLUMN manager_name TEXT;
ALTER TABLE activities ADD COLUMN engagement_code TEXT;
ALTER TABLE activities ADD COLUMN manager_engagement_id INTEGER;
ALTER TABLE activities ADD COLUMN manager_engagement_task_id INTEGER;
ALTER TABLE activities ADD COLUMN manager_engagement_deliverable_id INTEGER;
ALTER TABLE activities ADD COLUMN is_review INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activities ADD COLUMN review_target TEXT;
