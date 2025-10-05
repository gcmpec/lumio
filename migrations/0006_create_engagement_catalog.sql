-- Migration number: 0006    2025-10-06T10:00:00.000Z

CREATE TABLE IF NOT EXISTS eligible_engagements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    engagement_code TEXT NOT NULL UNIQUE,
    engagement_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eligible_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eligible_deliverables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manager_engagements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id INTEGER NOT NULL,
    engagement_code TEXT NOT NULL,
    engagement_name TEXT NOT NULL,
    eligible_engagement_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (eligible_engagement_id) REFERENCES eligible_engagements(id) ON DELETE SET NULL,
    UNIQUE (manager_id, engagement_code)
);

CREATE TRIGGER IF NOT EXISTS update_manager_engagements_updated_at
    AFTER UPDATE ON manager_engagements
    BEGIN
        UPDATE manager_engagements
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
    END;

CREATE TABLE IF NOT EXISTS manager_engagement_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_engagement_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    eligible_task_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_engagement_id) REFERENCES manager_engagements(id) ON DELETE CASCADE,
    FOREIGN KEY (eligible_task_id) REFERENCES eligible_tasks(id) ON DELETE SET NULL,
    UNIQUE (manager_engagement_id, label)
);

CREATE TRIGGER IF NOT EXISTS update_manager_engagement_tasks_updated_at
    AFTER UPDATE ON manager_engagement_tasks
    BEGIN
        UPDATE manager_engagement_tasks
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
    END;

CREATE TABLE IF NOT EXISTS manager_engagement_deliverables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_engagement_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    eligible_deliverable_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_engagement_id) REFERENCES manager_engagements(id) ON DELETE CASCADE,
    FOREIGN KEY (eligible_deliverable_id) REFERENCES eligible_deliverables(id) ON DELETE SET NULL,
    UNIQUE (manager_engagement_id, label)
);

CREATE TRIGGER IF NOT EXISTS update_manager_engagement_deliverables_updated_at
    AFTER UPDATE ON manager_engagement_deliverables
    BEGIN
        UPDATE manager_engagement_deliverables
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
    END;

CREATE INDEX IF NOT EXISTS idx_manager_engagements_manager_id
    ON manager_engagements(manager_id);

CREATE INDEX IF NOT EXISTS idx_manager_engagement_tasks_manager_engagement_id
    ON manager_engagement_tasks(manager_engagement_id);

CREATE INDEX IF NOT EXISTS idx_manager_engagement_deliverables_manager_engagement_id
    ON manager_engagement_deliverables(manager_engagement_id);
