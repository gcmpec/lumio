import { DELIVERABLE_PERIODICITIES } from "@/lib/engagement/catalog";
import type { DeliverablePeriodicity, EligibleDeliverableInput, EligibleTaskInput } from "@/lib/engagement/catalog";


export interface EligibleEngagement {
  id: number;
  engagement_code: string;
  engagement_name: string;
  created_at: string;
  updated_at: string;
}

export interface EligibleTask {
  id: number;
  macroprocess: string;
  process: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface EligibleEngagementInput {
  engagement_code: string;
  engagement_name: string;
}

export type BulkImportResult<T> = {
  created: T[];
  updated: T[];
  skipped: Array<{ input: unknown; reason: string }>;
};

export interface EligibleDeliverable {
  id: number;
  label: string;
  periodicity: DeliverablePeriodicity;
  created_at: string;
  updated_at: string;
}

export interface ManagerEngagementTask {
  id: number;
  manager_engagement_id: number;
  label: string;
  eligible_task_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ManagerEngagementDeliverable {
  id: number;
  manager_engagement_id: number;
  label: string;
  eligible_deliverable_id: number | null;
  periodicity: DeliverablePeriodicity | null;
  created_at: string;
  updated_at: string;
}

export interface ManagerEngagementRecord {
  id: number;
  manager_id: number;
  engagement_code: string;
  engagement_name: string;
  eligible_engagement_id: number | null;
  created_at: string;
  updated_at: string;
  tasks: ManagerEngagementTask[];
  deliverables: ManagerEngagementDeliverable[];
}

export interface ManagerEngagementInput {
  engagement_code: string;
  engagement_name: string;
  eligible_engagement_id?: number | null;
  tasks?: Array<{ label: string; eligible_task_id?: number | null }>;
  deliverables?: Array<{ label: string; eligible_deliverable_id?: number | null }>;
}

function normalizeText(value: string | null | undefined) {
  if (!value) return "";
  return value.trim();
}

type DatabaseExecutor = Pick<D1Database, "prepare" | "batch">;

export class EngagementService {
  private DB: D1Database;

  constructor(DB: D1Database) {
    this.DB = DB;
  }

  private static mapEligibleEngagement(row: any): EligibleEngagement {
    return {
      id: row.id,
      engagement_code: row.engagement_code,
      engagement_name: row.engagement_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private static mapEligibleTask(row: any): EligibleTask {
    return {
      id: row.id,
      macroprocess: row.macroprocess,
      process: row.process,
      label: row.label,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private static mapEligibleDeliverable(row: any): EligibleDeliverable {
    const periodicity = (row.periodicity ?? "not_applicable") as DeliverablePeriodicity;
    return {
      id: row.id,
      label: row.label,
      periodicity,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private async getEligibleEngagementById(
    id: number,
    db: DatabaseExecutor = this.DB,
  ): Promise<EligibleEngagement | null> {
    const row = await db.prepare(
      "SELECT * FROM eligible_engagements WHERE id = ?",
    )
      .bind(id)
      .first();
    return row ? EngagementService.mapEligibleEngagement(row) : null;
  }

  private async getEligibleTaskById(
    id: number,
    db: DatabaseExecutor = this.DB,
  ): Promise<EligibleTask | null> {
    const row = await db.prepare(
      "SELECT * FROM eligible_tasks WHERE id = ?",
    )
      .bind(id)
      .first();
    return row ? EngagementService.mapEligibleTask(row) : null;
  }

  private async getEligibleDeliverableById(
    id: number,
    db: DatabaseExecutor = this.DB,
  ): Promise<EligibleDeliverable | null> {
    const row = await db.prepare(
      "SELECT * FROM eligible_deliverables WHERE id = ?",
    )
      .bind(id)
      .first();
    return row ? EngagementService.mapEligibleDeliverable(row) : null;
  }

  private async withTransaction<T>(callback: (db: DatabaseExecutor) => Promise<T>): Promise<T> {
    const session = this.DB.withSession("first-primary");
    return callback(session);
  }

  async upsertEligibleEngagement(
    code: string,
    name: string,
    db: DatabaseExecutor = this.DB,
  ): Promise<EligibleEngagement> {
    const engagementCode = normalizeText(code);
    const engagementName = normalizeText(name);
    if (!engagementCode || !engagementName) {
      throw new Error("Engagement code and name are required");
    }

    await db.prepare(
      "INSERT OR IGNORE INTO eligible_engagements (engagement_code, engagement_name) VALUES (?, ?)",
    )
      .bind(engagementCode, engagementName)
      .run();

    await db.prepare(
      "UPDATE eligible_engagements SET engagement_name = ?, updated_at = CURRENT_TIMESTAMP WHERE engagement_code = ?",
    )
      .bind(engagementName, engagementCode)
      .run();

    const row = await db.prepare(
      "SELECT * FROM eligible_engagements WHERE engagement_code = ?",
    )
      .bind(engagementCode)
      .first();

    if (!row) {
      throw new Error("Failed to load eligible engagement");
    }

    return EngagementService.mapEligibleEngagement(row);
  }

  async searchEligibleEngagements(query?: string, limit = 20): Promise<EligibleEngagement[]> {
    const normalizedQuery = normalizeText(query ?? "");
    const statement = normalizedQuery
      ? this.DB.prepare(
          "SELECT * FROM eligible_engagements WHERE engagement_name LIKE ? OR engagement_code LIKE ? ORDER BY engagement_name LIMIT ?",
        ).bind(`%${normalizedQuery}%`, `%${normalizedQuery}%`, limit)
      : this.DB.prepare(
          "SELECT * FROM eligible_engagements ORDER BY engagement_name LIMIT ?",
        ).bind(limit);

    const response = await statement.all();
    if (!response.success) {
      throw new Error("Failed to load eligible engagements");
    }

    return response.results.map(EngagementService.mapEligibleEngagement);
  }

  async searchEligibleTasks(query?: string, limit = 20): Promise<EligibleTask[]> {
    const normalizedQuery = normalizeText(query ?? "");
    const hasSearch = normalizedQuery.length > 0;
    const lowered = normalizedQuery.toLowerCase();
    const like = `%${lowered}%`;
    const statement = hasSearch
      ? this.DB.prepare(
          "SELECT * FROM eligible_tasks WHERE LOWER(macroprocess) LIKE ? OR LOWER(process) LIKE ? OR LOWER(label) LIKE ? ORDER BY macroprocess, process, label LIMIT ?",
        ).bind(like, like, like, limit)
      : this.DB.prepare(
          "SELECT * FROM eligible_tasks ORDER BY macroprocess, process, label LIMIT ?",
        ).bind(limit);

    const response = await statement.all();
    if (!response.success) {
      throw new Error("Failed to load eligible tasks");
    }

    return response.results.map(EngagementService.mapEligibleTask);
  }

  async searchEligibleDeliverables(query?: string, limit = 20): Promise<EligibleDeliverable[]> {
    const normalizedQuery = normalizeText(query ?? "");
    const hasSearch = normalizedQuery.length > 0;
    const lowered = normalizedQuery.toLowerCase();
    const like = `%${lowered}%`;
    const statement = hasSearch
      ? this.DB.prepare(
          "SELECT * FROM eligible_deliverables WHERE LOWER(label) LIKE ? OR LOWER(periodicity) LIKE ? ORDER BY label LIMIT ?",
        ).bind(like, like, limit)
      : this.DB.prepare(
          "SELECT * FROM eligible_deliverables ORDER BY label LIMIT ?",
        ).bind(limit);

    const response = await statement.all();
    if (!response.success) {
      throw new Error("Failed to load eligible deliverables");
    }

    return response.results.map(EngagementService.mapEligibleDeliverable);
  }


  async listEligibleEngagements(db: DatabaseExecutor = this.DB): Promise<EligibleEngagement[]> {
    const response = await db.prepare(
      "SELECT * FROM eligible_engagements ORDER BY engagement_name",
    ).all();

    if (!response.success) {
      throw new Error("Failed to load eligible engagements");
    }

    return response.results.map(EngagementService.mapEligibleEngagement);
  }

  async createEligibleEngagement(
    input: { engagement_code: string; engagement_name: string },
    db: DatabaseExecutor = this.DB,
  ): Promise<EligibleEngagement> {
    const code = normalizeText(input.engagement_code);
    const name = normalizeText(input.engagement_name);
    if (!code || !name) {
      throw new Error("Engagement code and name are required");
    }

    const existing = await db.prepare(
      "SELECT id FROM eligible_engagements WHERE LOWER(engagement_code) = LOWER(?)",
    )
      .bind(code)
      .first();
    if (existing) {
      throw new Error("Eligible engagement already exists");
    }

    const result = await db.prepare(
      "INSERT INTO eligible_engagements (engagement_code, engagement_name) VALUES (?, ?)",
    )
      .bind(code, name)
      .run();
    if (!result.success) {
      throw new Error("Failed to create eligible engagement");
    }

    const created = await this.getEligibleEngagementById(result.meta.last_row_id, db);
    if (!created) {
      throw new Error("Failed to load created eligible engagement");
    }
    return created;
  }

  async updateEligibleEngagement(
    id: number,
    input: { engagement_code: string; engagement_name: string },
    db: DatabaseExecutor = this.DB,
  ): Promise<EligibleEngagement> {
    const existing = await this.getEligibleEngagementById(id, db);
    if (!existing) {
      throw new Error("Eligible engagement not found");
    }

    const code = normalizeText(input.engagement_code);
    const name = normalizeText(input.engagement_name);
    if (!code || !name) {
      throw new Error("Engagement code and name are required");
    }

    const duplicate = await db.prepare(
      "SELECT id FROM eligible_engagements WHERE LOWER(engagement_code) = LOWER(?) AND id != ?",
    )
      .bind(code, id)
      .first();
    if (duplicate) {
      throw new Error("Eligible engagement already exists");
    }

    const response = await db.prepare(
      "UPDATE eligible_engagements SET engagement_code = ?, engagement_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
      .bind(code, name, id)
      .run();
    if (!response.success) {
      throw new Error("Failed to update eligible engagement");
    }

    const updated = await this.getEligibleEngagementById(id, db);
    if (!updated) {
      throw new Error("Failed to load updated eligible engagement");
    }
    return updated;
  }

  async deleteEligibleEngagement(id: number, db: DatabaseExecutor = this.DB): Promise<void> {
    const response = await db.prepare(
      "DELETE FROM eligible_engagements WHERE id = ?",
    )
      .bind(id)
      .run();

    if (!response.success) {
      throw new Error("Failed to delete eligible engagement");
    }

    const changes = response.meta?.changes ?? 0;
    if (changes === 0) {
      throw new Error("Eligible engagement not found");
    }
  }

  async listEligibleTasks(db: DatabaseExecutor = this.DB): Promise<EligibleTask[]> {
    const response = await db.prepare(
      "SELECT * FROM eligible_tasks ORDER BY macroprocess, process, label",
    ).all();

    if (!response.success) {
      throw new Error("Failed to load eligible tasks");
    }

    return response.results.map(EngagementService.mapEligibleTask);
  }

  async createEligibleTask(input: EligibleTaskInput, db: DatabaseExecutor = this.DB): Promise<EligibleTask> {
    const macroprocess = normalizeText(input.macroprocess);
    const process = normalizeText(input.process);
    const label = normalizeText(input.label);
    if (!macroprocess || !process || !label) {
      throw new Error("Macroprocess, process and task label are required");
    }

    const duplicate = await db.prepare(
      "SELECT id FROM eligible_tasks WHERE LOWER(macroprocess) = LOWER(?) AND LOWER(process) = LOWER(?) AND LOWER(label) = LOWER(?)",
    )
      .bind(macroprocess, process, label)
      .first();
    if (duplicate) {
      throw new Error("Eligible task already exists");
    }

    const result = await db.prepare(
      "INSERT INTO eligible_tasks (macroprocess, process, label) VALUES (?, ?, ?)",
    )
      .bind(macroprocess, process, label)
      .run();
    if (!result.success) {
      throw new Error("Failed to create eligible task");
    }

    const created = await this.getEligibleTaskById(result.meta.last_row_id, db);
    if (!created) {
      throw new Error("Failed to load created eligible task");
    }
    return created;
  }

  async updateEligibleTask(id: number, input: EligibleTaskInput, db: DatabaseExecutor = this.DB): Promise<EligibleTask> {
    const existing = await this.getEligibleTaskById(id, db);
    if (!existing) {
      throw new Error("Eligible task not found");
    }

    const macroprocess = normalizeText(input.macroprocess);
    const process = normalizeText(input.process);
    const label = normalizeText(input.label);
    if (!macroprocess || !process || !label) {
      throw new Error("Macroprocess, process and task label are required");
    }

    const duplicate = await db.prepare(
      "SELECT id FROM eligible_tasks WHERE LOWER(macroprocess) = LOWER(?) AND LOWER(process) = LOWER(?) AND LOWER(label) = LOWER(?) AND id != ?",
    )
      .bind(macroprocess, process, label, id)
      .first();
    if (duplicate) {
      throw new Error("Eligible task already exists");
    }

    const response = await db.prepare(
      "UPDATE eligible_tasks SET macroprocess = ?, process = ?, label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
      .bind(macroprocess, process, label, id)
      .run();
    if (!response.success) {
      throw new Error("Failed to update eligible task");
    }

    const updated = await this.getEligibleTaskById(id, db);
    if (!updated) {
      throw new Error("Failed to load updated eligible task");
    }
    return updated;
  }

  async deleteEligibleTask(id: number, db: DatabaseExecutor = this.DB): Promise<void> {
    const response = await db.prepare(
      "DELETE FROM eligible_tasks WHERE id = ?",
    )
      .bind(id)
      .run();

    if (!response.success) {
      throw new Error("Failed to delete eligible task");
    }

    const changes = response.meta?.changes ?? 0;
    if (changes === 0) {
      throw new Error("Eligible task not found");
    }
  }

  async listEligibleDeliverables(db: DatabaseExecutor = this.DB): Promise<EligibleDeliverable[]> {
    const response = await db.prepare(
      "SELECT * FROM eligible_deliverables ORDER BY label",
    ).all();

    if (!response.success) {
      throw new Error("Failed to load eligible deliverables");
    }

    return response.results.map(EngagementService.mapEligibleDeliverable);
  }

  private ensureValidPeriodicity(periodicity: DeliverablePeriodicity) {
    if (!DELIVERABLE_PERIODICITIES.includes(periodicity)) {
      throw new Error("Invalid deliverable periodicity");
    }
  }

  async createEligibleDeliverable(
    input: EligibleDeliverableInput,
    db: DatabaseExecutor = this.DB,
  ): Promise<EligibleDeliverable> {
    const label = normalizeText(input.label);
    const periodicity = input.periodicity;
    if (!label) {
      throw new Error("Deliverable label is required");
    }
    this.ensureValidPeriodicity(periodicity);

    const duplicate = await db.prepare(
      "SELECT id FROM eligible_deliverables WHERE LOWER(label) = LOWER(?) AND periodicity = ?",
    )
      .bind(label, periodicity)
      .first();
    if (duplicate) {
      throw new Error("Eligible deliverable already exists");
    }

    const result = await db.prepare(
      "INSERT INTO eligible_deliverables (label, periodicity) VALUES (?, ?)",
    )
      .bind(label, periodicity)
      .run();
    if (!result.success) {
      throw new Error("Failed to create eligible deliverable");
    }

    const created = await this.getEligibleDeliverableById(result.meta.last_row_id, db);
    if (!created) {
      throw new Error("Failed to load created eligible deliverable");
    }
    return created;
  }

  async updateEligibleDeliverable(
    id: number,
    input: EligibleDeliverableInput,
    db: DatabaseExecutor = this.DB,
  ): Promise<EligibleDeliverable> {
    const existing = await this.getEligibleDeliverableById(id, db);
    if (!existing) {
      throw new Error("Eligible deliverable not found");
    }

    const label = normalizeText(input.label);
    const periodicity = input.periodicity;
    if (!label) {
      throw new Error("Deliverable label is required");
    }
    this.ensureValidPeriodicity(periodicity);

    const duplicate = await db.prepare(
      "SELECT id FROM eligible_deliverables WHERE LOWER(label) = LOWER(?) AND periodicity = ? AND id != ?",
    )
      .bind(label, periodicity, id)
      .first();
    if (duplicate) {
      throw new Error("Eligible deliverable already exists");
    }

    const response = await db.prepare(
      "UPDATE eligible_deliverables SET label = ?, periodicity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
      .bind(label, periodicity, id)
      .run();
    if (!response.success) {
      throw new Error("Failed to update eligible deliverable");
    }

    const updated = await this.getEligibleDeliverableById(id, db);
    if (!updated) {
      throw new Error("Failed to load updated eligible deliverable");
    }
    return updated;
  }

  async deleteEligibleDeliverable(id: number, db: DatabaseExecutor = this.DB): Promise<void> {
    const response = await db.prepare(
      "DELETE FROM eligible_deliverables WHERE id = ?",
    )
      .bind(id)
      .run();

    if (!response.success) {
      throw new Error("Failed to delete eligible deliverable");
    }

    const changes = response.meta?.changes ?? 0;
    if (changes === 0) {
      throw new Error("Eligible deliverable not found");
    }
  }

  async importEligibleEngagements(items: EligibleEngagementInput[]): Promise<BulkImportResult<EligibleEngagement>> {
    if (!items.length) {
      return { created: [], updated: [], skipped: [] };
    }

    return this.withTransaction(async (db) => {
      const result: BulkImportResult<EligibleEngagement> = { created: [], updated: [], skipped: [] };

      for (const raw of items) {
        const code = normalizeText(raw.engagement_code);
        const name = normalizeText(raw.engagement_name);
        if (!code || !name) {
          result.skipped.push({ input: raw, reason: "Cdigo e nome so obrigatrios" });
          continue;
        }

        const existing = await db
          .prepare("SELECT id FROM eligible_engagements WHERE LOWER(engagement_code) = LOWER(?)")
          .bind(code)
          .first();
        const existingId = typeof (existing as any)?.id === "number" ? (existing as any).id as number : null;

        if (existingId) {
          await db
            .prepare(
              "UPDATE eligible_engagements SET engagement_code = ?, engagement_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind(code, name, existingId)
            .run();
          const updated = await this.getEligibleEngagementById(existingId, db);
          if (updated) {
            result.updated.push(updated);
          }
          continue;
        }

        const inserted = await db
          .prepare("INSERT INTO eligible_engagements (engagement_code, engagement_name) VALUES (?, ?)")
          .bind(code, name)
          .run();

        if (!inserted.success) {
          result.skipped.push({ input: raw, reason: "Falha ao inserir engagement" });
          continue;
        }

        const created = await this.getEligibleEngagementById(inserted.meta.last_row_id, db);
        if (created) {
          result.created.push(created);
        }
      }

      return result;
    });
  }

  async importEligibleTasks(items: EligibleTaskInput[]): Promise<BulkImportResult<EligibleTask>> {
    if (!items.length) {
      return { created: [], updated: [], skipped: [] };
    }

    return this.withTransaction(async (db) => {
      const result: BulkImportResult<EligibleTask> = { created: [], updated: [], skipped: [] };

      for (const raw of items) {
        const macroprocess = normalizeText(raw.macroprocess);
        const process = normalizeText(raw.process);
        const label = normalizeText(raw.label);

        if (!macroprocess || !process || !label) {
          result.skipped.push({ input: raw, reason: "Macroprocesso, processo e tarefa so obrigatrios" });
          continue;
        }

        const existing = await db
          .prepare(
            "SELECT id FROM eligible_tasks WHERE LOWER(macroprocess) = LOWER(?) AND LOWER(process) = LOWER(?) AND LOWER(label) = LOWER(?)",
          )
          .bind(macroprocess, process, label)
          .first();
        const existingId = typeof (existing as any)?.id === "number" ? (existing as any).id as number : null;

        if (existingId) {
          await db
            .prepare(
              "UPDATE eligible_tasks SET macroprocess = ?, process = ?, label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind(macroprocess, process, label, existingId)
            .run();
          const updated = await this.getEligibleTaskById(existingId, db);
          if (updated) {
            result.updated.push(updated);
          }
          continue;
        }

        const inserted = await db
          .prepare("INSERT INTO eligible_tasks (macroprocess, process, label) VALUES (?, ?, ?)")
          .bind(macroprocess, process, label)
          .run();

        if (!inserted.success) {
          result.skipped.push({ input: raw, reason: "Falha ao inserir tarefa" });
          continue;
        }

        const created = await this.getEligibleTaskById(inserted.meta.last_row_id, db);
        if (created) {
          result.created.push(created);
        }
      }

      return result;
    });
  }

  async importEligibleDeliverables(items: EligibleDeliverableInput[]): Promise<BulkImportResult<EligibleDeliverable>> {
    if (!items.length) {
      return { created: [], updated: [], skipped: [] };
    }

    return this.withTransaction(async (db) => {
      const result: BulkImportResult<EligibleDeliverable> = { created: [], updated: [], skipped: [] };

      for (const raw of items) {
        const label = normalizeText(raw.label);
        const periodicity = raw.periodicity;

        if (!label) {
          result.skipped.push({ input: raw, reason: "A descrio  obrigatria" });
          continue;
        }

        try {
          this.ensureValidPeriodicity(periodicity);
        } catch (error) {
          result.skipped.push({ input: raw, reason: (error as Error).message });
          continue;
        }

        const existing = await db
          .prepare(
            "SELECT id FROM eligible_deliverables WHERE LOWER(label) = LOWER(?) AND periodicity = ?",
          )
          .bind(label, periodicity)
          .first();
        const existingId = typeof (existing as any)?.id === "number" ? (existing as any).id as number : null;

        if (existingId) {
          await db
            .prepare(
              "UPDATE eligible_deliverables SET label = ?, periodicity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind(label, periodicity, existingId)
            .run();
          const updated = await this.getEligibleDeliverableById(existingId, db);
          if (updated) {
            result.updated.push(updated);
          }
          continue;
        }

        const inserted = await db
          .prepare("INSERT INTO eligible_deliverables (label, periodicity) VALUES (?, ?)")
          .bind(label, periodicity)
          .run();

        if (!inserted.success) {
          result.skipped.push({ input: raw, reason: "Falha ao inserir deliverable" });
          continue;
        }

        const created = await this.getEligibleDeliverableById(inserted.meta.last_row_id, db);
        if (created) {
          result.created.push(created);
        }
      }

      return result;
    });
  }

  private async loadEngagementTasks(
    engagementIds: number[],
    db: DatabaseExecutor = this.DB,
  ): Promise<Record<number, ManagerEngagementTask[]>> {
    if (!engagementIds.length) {
      return {};
    }

    const placeholders = engagementIds.map(() => "?").join(", ");
    const statement = db.prepare(
      `SELECT * FROM manager_engagement_tasks WHERE manager_engagement_id IN (${placeholders}) ORDER BY id`,
    ).bind(...engagementIds);

    const response = await statement.all();
    if (!response.success) {
      throw new Error("Failed to load engagement tasks");
    }

    const map: Record<number, ManagerEngagementTask[]> = {};
    for (const row of response.results) {
      const task = row as ManagerEngagementTask;
      if (!map[task.manager_engagement_id]) {
        map[task.manager_engagement_id] = [];
      }
      map[task.manager_engagement_id].push(task);
    }

    return map;
  }

  private async loadEngagementDeliverables(

    engagementIds: number[],

    db: DatabaseExecutor = this.DB,

  ): Promise<Record<number, ManagerEngagementDeliverable[]>> {

    if (!engagementIds.length) {

      return {};

    }


    const placeholders = engagementIds.map(() => "?").join(", " );

    const statement = db.prepare(

      `
        SELECT
          med.id,
          med.manager_engagement_id,
          med.label,
          med.eligible_deliverable_id,
          med.created_at,
          med.updated_at,
          ed.periodicity AS periodicity
        FROM manager_engagement_deliverables med
        LEFT JOIN eligible_deliverables ed ON ed.id = med.eligible_deliverable_id
        WHERE med.manager_engagement_id IN (${placeholders})
        ORDER BY med.id
      `,

    ).bind(...engagementIds);


    const response = await statement.all();

    if (!response.success) {

      throw new Error("Failed to load engagement deliverables");

    }


    const map: Record<number, ManagerEngagementDeliverable[]> = {};

    for (const row of response.results) {

      const managerEngagementId = Number(row.manager_engagement_id);

      const periodicityRaw =
        typeof row.periodicity === "string" && row.periodicity.length > 0
          ? (row.periodicity as DeliverablePeriodicity)
          : null;

      const deliverable: ManagerEngagementDeliverable = {
        id: Number(row.id),
        manager_engagement_id: managerEngagementId,
        label: String(row.label),
        eligible_deliverable_id: row.eligible_deliverable_id != null ? Number(row.eligible_deliverable_id) : null,
        periodicity: periodicityRaw,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
      };

      if (!map[managerEngagementId]) {

        map[managerEngagementId] = [];

      }

      map[managerEngagementId].push(deliverable);

    }


    return map;

  }


  private async replaceTasks(
    db: DatabaseExecutor,
    engagementId: number,
    tasks: Array<{ label: string; eligible_task_id?: number | null }>,
  ) {
    await db.prepare("DELETE FROM manager_engagement_tasks WHERE manager_engagement_id = ?")
      .bind(engagementId)
      .run();

    for (const task of tasks) {
      const label = normalizeText(task.label);
      if (!label) {
        continue;
      }
      const eligibleId = task.eligible_task_id ?? null;

      await db.prepare(
        "INSERT INTO manager_engagement_tasks (manager_engagement_id, label, eligible_task_id) VALUES (?, ?, ?)",
      )
        .bind(engagementId, label, eligibleId)
        .run();
    }
  }


  private async replaceDeliverables(
    db: DatabaseExecutor,
    engagementId: number,
    deliverables: Array<{ label: string; eligible_deliverable_id?: number | null }>,
  ) {
    await db.prepare("DELETE FROM manager_engagement_deliverables WHERE manager_engagement_id = ?")
      .bind(engagementId)
      .run();

    for (const deliverable of deliverables) {
      const label = normalizeText(deliverable.label);
      if (!label) {
        continue;
      }
      const eligibleId = deliverable.eligible_deliverable_id ?? null;

      await db.prepare(
        "INSERT INTO manager_engagement_deliverables (manager_engagement_id, label, eligible_deliverable_id) VALUES (?, ?, ?)",
      )
        .bind(engagementId, label, eligibleId)
        .run();
    }
  }

  private async getManagerEngagementRecord(
    managerId: number,
    engagementId: number,
    db: DatabaseExecutor = this.DB,
  ): Promise<ManagerEngagementRecord | null> {
    const engagementRow = await db.prepare(
      "SELECT * FROM manager_engagements WHERE id = ? AND manager_id = ?",
    )
      .bind(engagementId, managerId)
      .first();

    if (!engagementRow) {
      return null;
    }

    const tasksMap = await this.loadEngagementTasks([engagementId], db);
    const deliverablesMap = await this.loadEngagementDeliverables([engagementId], db);

    const base = engagementRow as Omit<ManagerEngagementRecord, "tasks" | "deliverables">;

    return {
      ...base,
      tasks: tasksMap[engagementId] ?? [],
      deliverables: deliverablesMap[engagementId] ?? [],
    };
  }

  async getManagerEngagement(managerId: number, engagementId: number): Promise<ManagerEngagementRecord | null> {
    return this.getManagerEngagementRecord(managerId, engagementId);
  }

  async listManagerEngagements(managerId: number): Promise<ManagerEngagementRecord[]> {
    const response = await db.prepare(
      "SELECT * FROM manager_engagements WHERE manager_id = ? ORDER BY engagement_name",
    )
      .bind(managerId)
      .all();

    if (!response.success) {
      throw new Error("Failed to load manager engagements");
    }

    const engagements = response.results as Array<Omit<ManagerEngagementRecord, "tasks" | "deliverables">>;
    const engagementIds = engagements.map((engagement) => engagement.id);

    const [tasksMap, deliverablesMap] = await Promise.all([
      this.loadEngagementTasks(engagementIds),
      this.loadEngagementDeliverables(engagementIds),
    ]);

    return engagements.map((engagement) => ({
      ...engagement,
      tasks: tasksMap[engagement.id] ?? [],
      deliverables: deliverablesMap[engagement.id] ?? [],
    }));
  }

  async createManagerEngagement(managerId: number, data: ManagerEngagementInput): Promise<ManagerEngagementRecord> {
    return this.withTransaction(async (db) => {
      const code = normalizeText(data.engagement_code);
      const name = normalizeText(data.engagement_name);

      if (!code || !name) {
        throw new Error("Engagement code and name are required");
      }

      const eligible = data.eligible_engagement_id
        ? { id: data.eligible_engagement_id }
        : await this.upsertEligibleEngagement(code, name, db);

      const response = await db.prepare(
        "INSERT INTO manager_engagements (manager_id, engagement_code, engagement_name, eligible_engagement_id) VALUES (?, ?, ?, ?)",
      )
        .bind(managerId, code, name, eligible?.id ?? null)
        .run();

      if (!response.success) {
        throw new Error("Failed to create engagement");
      }

      const engagementId = response.meta.last_row_id;

      try {
        await this.replaceTasks(db, engagementId, data.tasks ?? []);
        await this.replaceDeliverables(db, engagementId, data.deliverables ?? []);
      } catch (error) {
        await db.prepare("DELETE FROM manager_engagement_tasks WHERE manager_engagement_id = ?")
          .bind(engagementId)
          .run();
        await db.prepare("DELETE FROM manager_engagement_deliverables WHERE manager_engagement_id = ?")
          .bind(engagementId)
          .run();
        await db.prepare("DELETE FROM manager_engagements WHERE id = ?")
          .bind(engagementId)
          .run();
        throw error;
      }

      const record = await this.getManagerEngagementRecord(managerId, engagementId, db);
      if (!record) {
        throw new Error("Failed to load created engagement");
      }
      return record;
    });
  }

  async updateManagerEngagement(
    managerId: number,
    engagementId: number,
    data: ManagerEngagementInput,
  ): Promise<ManagerEngagementRecord> {
    return this.withTransaction(async (db) => {
      const existing = await db.prepare(
        "SELECT * FROM manager_engagements WHERE id = ? AND manager_id = ?",
      )
        .bind(engagementId, managerId)
        .first();

      if (!existing) {
        throw new Error("Engagement not found");
      }

      const existingRecord = existing as {
        engagement_code: string;
        engagement_name: string;
        eligible_engagement_id?: number | null;
      };

      const code = normalizeText(data.engagement_code);
      const name = normalizeText(data.engagement_name);
      if (!code || !name) {
        throw new Error("Engagement code and name are required");
      }

      const eligible = data.eligible_engagement_id
        ? { id: data.eligible_engagement_id }
        : await this.upsertEligibleEngagement(code, name, db);

      const response = await db.prepare(
        "UPDATE manager_engagements SET engagement_code = ?, engagement_name = ?, eligible_engagement_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND manager_id = ?",
      )
        .bind(code, name, eligible?.id ?? null, engagementId, managerId)
        .run();

      if (!response.success) {
        throw new Error("Failed to update engagement");
      }

      const previousTasksMap = await this.loadEngagementTasks([engagementId], db);
      const previousDeliverablesMap = await this.loadEngagementDeliverables([engagementId], db);

      const restoreTasks =
        previousTasksMap[engagementId]?.map((task) => ({
          label: task.label,
          eligible_task_id: task.eligible_task_id ?? null,
        })) ?? [];
      const restoreDeliverables =
        previousDeliverablesMap[engagementId]?.map((deliverable) => ({
          label: deliverable.label,
          eligible_deliverable_id: deliverable.eligible_deliverable_id ?? null,
        })) ?? [];

      try {
        await this.replaceTasks(db, engagementId, data.tasks ?? []);
        await this.replaceDeliverables(db, engagementId, data.deliverables ?? []);
      } catch (error) {
        await db.prepare(
          "UPDATE manager_engagements SET engagement_code = ?, engagement_name = ?, eligible_engagement_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND manager_id = ?",
        )
          .bind(
            existingRecord.engagement_code,
            existingRecord.engagement_name,
            existingRecord.eligible_engagement_id ?? null,
            engagementId,
            managerId,
          )
          .run();

        await this.replaceTasks(db, engagementId, restoreTasks);
        await this.replaceDeliverables(db, engagementId, restoreDeliverables);

        throw error;
      }

      const record = await this.getManagerEngagementRecord(managerId, engagementId, db);
      if (!record) {
        throw new Error("Failed to load updated engagement");
      }
      return record;
    });
  }

  async listManagersWithEngagements(): Promise<Array<{ manager: { id: number; name: string; email: string }; engagements: ManagerEngagementRecord[] }>> {
    const response = await this.DB.prepare(
      "SELECT me.*, u.name as manager_name, u.email as manager_email FROM manager_engagements me JOIN users u ON u.id = me.manager_id ORDER BY u.name COLLATE NOCASE, me.engagement_name COLLATE NOCASE"
    ).all();

    if (!response.success) {
      throw new Error("Failed to load manager engagements");
    }

    const rows = response.results as Array<any>;
    if (!rows.length) {
      return [];
    }

    const engagementIds = rows.map((row) => row.id as number);
    const [tasksMap, deliverablesMap] = await Promise.all([
      this.loadEngagementTasks(engagementIds),
      this.loadEngagementDeliverables(engagementIds),
    ]);

    const grouped = new Map<number, { manager: { id: number; name: string; email: string }; engagements: ManagerEngagementRecord[] }>();

    for (const row of rows) {
      const managerId = row.manager_id as number;
      if (!grouped.has(managerId)) {
        grouped.set(managerId, {
          manager: { id: managerId, name: row.manager_name as string, email: row.manager_email as string },
          engagements: [],
        });
      }

      const bucket = grouped.get(managerId)!;
      bucket.engagements.push({
        id: row.id as number,
        manager_id: managerId,
        engagement_code: row.engagement_code as string,
        engagement_name: row.engagement_name as string,
        eligible_engagement_id: row.eligible_engagement_id ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        tasks: tasksMap[row.id] ?? [],
        deliverables: deliverablesMap[row.id] ?? [],
      });
    }

    return Array.from(grouped.values());
  }

  async deleteManagerEngagement(
    managerId: number,
    engagementId: number,
    db: DatabaseExecutor = this.DB,
  ): Promise<void> {
    const response = await db.prepare(
      "DELETE FROM manager_engagements WHERE id = ? AND manager_id = ?",
    )
      .bind(engagementId, managerId)
      .run();

    if (!response.success) {
      throw new Error("Failed to delete engagement");
    }

    const changes = response.meta?.changes ?? 0;
    if (changes === 0) {
      throw new Error("Engagement not found");
    }
  }
}
