
export interface EligibleEngagement {
  id: number;
  engagement_code: string;
  engagement_name: string;
  created_at: string;
  updated_at: string;
}

export interface EligibleItem {
  id: number;
  label: string;
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

  private static mapEligibleItem(row: any): EligibleItem {
    return {
      id: row.id,
      label: row.label,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.DB.prepare("BEGIN TRANSACTION").run();
    try {
      const result = await callback();
      await this.DB.prepare("COMMIT").run();
      return result;
    } catch (error) {
      await this.DB.prepare("ROLLBACK").run();
      throw error;
    }
  }

  async upsertEligibleEngagement(code: string, name: string): Promise<EligibleEngagement> {
    const engagementCode = normalizeText(code);
    const engagementName = normalizeText(name);
    if (!engagementCode || !engagementName) {
      throw new Error("Engagement code and name are required");
    }

    await this.DB.prepare(
      "INSERT OR IGNORE INTO eligible_engagements (engagement_code, engagement_name) VALUES (?, ?)",
    )
      .bind(engagementCode, engagementName)
      .run();

    await this.DB.prepare(
      "UPDATE eligible_engagements SET engagement_name = ?, updated_at = CURRENT_TIMESTAMP WHERE engagement_code = ?",
    )
      .bind(engagementName, engagementCode)
      .run();

    const row = await this.DB.prepare(
      "SELECT * FROM eligible_engagements WHERE engagement_code = ?",
    )
      .bind(engagementCode)
      .first();

    if (!row) {
      throw new Error("Failed to load eligible engagement");
    }

    return EngagementService.mapEligibleEngagement(row);
  }

  async upsertEligibleTask(label: string): Promise<EligibleItem> {
    const normalizedLabel = normalizeText(label);
    if (!normalizedLabel) {
      throw new Error("Task label is required");
    }

    await this.DB.prepare("INSERT OR IGNORE INTO eligible_tasks (label) VALUES (?)")
      .bind(normalizedLabel)
      .run();

    const row = await this.DB.prepare("SELECT * FROM eligible_tasks WHERE label = ?")
      .bind(normalizedLabel)
      .first();

    if (!row) {
      throw new Error("Failed to load eligible task");
    }

    return EngagementService.mapEligibleItem(row);
  }

  async upsertEligibleDeliverable(label: string): Promise<EligibleItem> {
    const normalizedLabel = normalizeText(label);
    if (!normalizedLabel) {
      throw new Error("Deliverable label is required");
    }

    await this.DB.prepare("INSERT OR IGNORE INTO eligible_deliverables (label) VALUES (?)")
      .bind(normalizedLabel)
      .run();

    const row = await this.DB.prepare("SELECT * FROM eligible_deliverables WHERE label = ?")
      .bind(normalizedLabel)
      .first();

    if (!row) {
      throw new Error("Failed to load eligible deliverable");
    }

    return EngagementService.mapEligibleItem(row);
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

  async searchEligibleTasks(query?: string, limit = 20): Promise<EligibleItem[]> {
    const normalizedQuery = normalizeText(query ?? "");
    const statement = normalizedQuery
      ? this.DB.prepare(
          "SELECT * FROM eligible_tasks WHERE label LIKE ? ORDER BY label LIMIT ?",
        ).bind(`%${normalizedQuery}%`, limit)
      : this.DB.prepare("SELECT * FROM eligible_tasks ORDER BY label LIMIT ?").bind(limit);

    const response = await statement.all();
    if (!response.success) {
      throw new Error("Failed to load eligible tasks");
    }

    return response.results.map(EngagementService.mapEligibleItem);
  }

  async searchEligibleDeliverables(query?: string, limit = 20): Promise<EligibleItem[]> {
    const normalizedQuery = normalizeText(query ?? "");
    const statement = normalizedQuery
      ? this.DB.prepare(
          "SELECT * FROM eligible_deliverables WHERE label LIKE ? ORDER BY label LIMIT ?",
        ).bind(`%${normalizedQuery}%`, limit)
      : this.DB.prepare("SELECT * FROM eligible_deliverables ORDER BY label LIMIT ?").bind(limit);

    const response = await statement.all();
    if (!response.success) {
      throw new Error("Failed to load eligible deliverables");
    }

    return response.results.map(EngagementService.mapEligibleItem);
  }

  private async loadEngagementTasks(engagementIds: number[]): Promise<Record<number, ManagerEngagementTask[]>> {
    if (!engagementIds.length) {
      return {};
    }

    const placeholders = engagementIds.map(() => "?").join(", ");
    const statement = this.DB.prepare(
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

  private async loadEngagementDeliverables(engagementIds: number[]): Promise<Record<number, ManagerEngagementDeliverable[]>> {
    if (!engagementIds.length) {
      return {};
    }

    const placeholders = engagementIds.map(() => "?").join(", ");
    const statement = this.DB.prepare(
      `SELECT * FROM manager_engagement_deliverables WHERE manager_engagement_id IN (${placeholders}) ORDER BY id`,
    ).bind(...engagementIds);

    const response = await statement.all();
    if (!response.success) {
      throw new Error("Failed to load engagement deliverables");
    }

    const map: Record<number, ManagerEngagementDeliverable[]> = {};
    for (const row of response.results) {
      const deliverable = row as ManagerEngagementDeliverable;
      if (!map[deliverable.manager_engagement_id]) {
        map[deliverable.manager_engagement_id] = [];
      }
      map[deliverable.manager_engagement_id].push(deliverable);
    }
    return map;
  }

  private async replaceTasks(engagementId: number, tasks: Array<{ label: string; eligible_task_id?: number | null }>) {
    await this.DB.prepare("DELETE FROM manager_engagement_tasks WHERE manager_engagement_id = ?")
      .bind(engagementId)
      .run();

    for (const task of tasks) {
      const label = normalizeText(task.label);
      if (!label) {
        continue;
      }
      const eligible = task.eligible_task_id
        ? { id: task.eligible_task_id }
        : await this.upsertEligibleTask(label);

      await this.DB.prepare(
        "INSERT INTO manager_engagement_tasks (manager_engagement_id, label, eligible_task_id) VALUES (?, ?, ?)",
      )
        .bind(engagementId, label, eligible.id)
        .run();
    }
  }

  private async replaceDeliverables(
    engagementId: number,
    deliverables: Array<{ label: string; eligible_deliverable_id?: number | null }>,
  ) {
    await this.DB.prepare("DELETE FROM manager_engagement_deliverables WHERE manager_engagement_id = ?")
      .bind(engagementId)
      .run();

    for (const deliverable of deliverables) {
      const label = normalizeText(deliverable.label);
      if (!label) {
        continue;
      }
      const eligible = deliverable.eligible_deliverable_id
        ? { id: deliverable.eligible_deliverable_id }
        : await this.upsertEligibleDeliverable(label);

      await this.DB.prepare(
        "INSERT INTO manager_engagement_deliverables (manager_engagement_id, label, eligible_deliverable_id) VALUES (?, ?, ?)",
      )
        .bind(engagementId, label, eligible.id)
        .run();
    }
  }

  private async getManagerEngagementRecord(managerId: number, engagementId: number): Promise<ManagerEngagementRecord | null> {
    const engagementRow = await this.DB.prepare(
      "SELECT * FROM manager_engagements WHERE id = ? AND manager_id = ?",
    )
      .bind(engagementId, managerId)
      .first();

    if (!engagementRow) {
      return null;
    }

    const tasksMap = await this.loadEngagementTasks([engagementId]);
    const deliverablesMap = await this.loadEngagementDeliverables([engagementId]);

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
    const response = await this.DB.prepare(
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
    return this.withTransaction(async () => {
      const code = normalizeText(data.engagement_code);
      const name = normalizeText(data.engagement_name);

      if (!code || !name) {
        throw new Error("Engagement code and name are required");
      }

      const eligible = data.eligible_engagement_id
        ? { id: data.eligible_engagement_id }
        : await this.upsertEligibleEngagement(code, name);

      const response = await this.DB.prepare(
        "INSERT INTO manager_engagements (manager_id, engagement_code, engagement_name, eligible_engagement_id) VALUES (?, ?, ?, ?)",
      )
        .bind(managerId, code, name, eligible?.id ?? null)
        .run();

      if (!response.success) {
        throw new Error("Failed to create engagement");
      }

      const engagementId = response.meta.last_row_id;

      await this.replaceTasks(engagementId, data.tasks ?? []);
      await this.replaceDeliverables(engagementId, data.deliverables ?? []);

      const record = await this.getManagerEngagementRecord(managerId, engagementId);
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
    return this.withTransaction(async () => {
      const existing = await this.DB.prepare(
        "SELECT * FROM manager_engagements WHERE id = ? AND manager_id = ?",
      )
        .bind(engagementId, managerId)
        .first();

      if (!existing) {
        throw new Error("Engagement not found");
      }

      const code = normalizeText(data.engagement_code);
      const name = normalizeText(data.engagement_name);
      if (!code || !name) {
        throw new Error("Engagement code and name are required");
      }

      const eligible = data.eligible_engagement_id
        ? { id: data.eligible_engagement_id }
        : await this.upsertEligibleEngagement(code, name);

      const response = await this.DB.prepare(
        "UPDATE manager_engagements SET engagement_code = ?, engagement_name = ?, eligible_engagement_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND manager_id = ?",
      )
        .bind(code, name, eligible?.id ?? null, engagementId, managerId)
        .run();

      if (!response.success) {
        throw new Error("Failed to update engagement");
      }

      await this.replaceTasks(engagementId, data.tasks ?? []);
      await this.replaceDeliverables(engagementId, data.deliverables ?? []);

      const record = await this.getManagerEngagementRecord(managerId, engagementId);
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

  async deleteManagerEngagement(managerId: number, engagementId: number): Promise<void> {
    const response = await this.DB.prepare(
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
