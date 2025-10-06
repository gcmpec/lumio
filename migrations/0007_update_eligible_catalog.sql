-- Migration number: 0007    2025-10-07T00:00:00.000Z

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS eligible_tasks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    macroprocess TEXT NOT NULL,
    process TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (macroprocess, process, label)
);

INSERT INTO eligible_tasks_new (id, macroprocess, process, label, created_at, updated_at)
SELECT id, 'Other' AS macroprocess, 'Other' AS process, label, created_at, updated_at
FROM eligible_tasks;

DROP TABLE eligible_tasks;

ALTER TABLE eligible_tasks_new RENAME TO eligible_tasks;

CREATE INDEX IF NOT EXISTS idx_eligible_tasks_macroprocess ON eligible_tasks(macroprocess);
CREATE INDEX IF NOT EXISTS idx_eligible_tasks_process ON eligible_tasks(process);

PRAGMA foreign_keys=ON;

ALTER TABLE eligible_deliverables ADD COLUMN periodicity TEXT NOT NULL DEFAULT 'not_applicable';

CREATE UNIQUE INDEX IF NOT EXISTS idx_eligible_deliverables_label_periodicity
    ON eligible_deliverables(label, periodicity);

CREATE INDEX IF NOT EXISTS idx_eligible_deliverables_periodicity ON eligible_deliverables(periodicity);
