import { getLisbonDayRange, getLisbonTimestamp } from "@/lib/utils";

interface CreateActivityInput {
  user_name: string;
  user_email: string;
  engagement_name: string;
  engagement_code: string | null;
  manager_id: number;
  manager_name: string;
  manager_email: string;
  manager_engagement_id: number;
  manager_engagement_task_id: number | null;
  manager_engagement_deliverable_id: number | null;
  task_label: string | null;
  deliverable_label: string | null;
  is_review: boolean;
  review_target: "Staff" | "GDS" | null;
}

export class ActivityService {
  constructor(DB) {
    this.DB = DB;
  }

  static formatRow(row) {
    return {
      id: row.id,
      user_name: row.user_name,
      user_email: row.user_email,
      engagement: row.engagement,
      engagement_code: row.engagement_code ?? null,
      manager_id: row.manager_id ?? null,
      manager_name: row.manager_name ?? null,
      manager_email: row.manager_email ?? null,
      manager_engagement_id: row.manager_engagement_id ?? null,
      manager_engagement_task_id: row.manager_engagement_task_id ?? null,
      manager_engagement_deliverable_id: row.manager_engagement_deliverable_id ?? null,
      process: row.process,
      deliverable: row.deliverable,
      started_at: row.started_at,
      ended_at: row.ended_at,
      duration_seconds: row.duration_seconds,
      is_review: Boolean(row.is_review),
      review_target: row.review_target ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async getAll() {
    const response = await this.DB.prepare(
      "SELECT * FROM activities ORDER BY started_at DESC",
    ).all();

    if (!response.success) {
      throw new Error("Failed to load activities");
    }

    return response.results.map(ActivityService.formatRow);
  }

  async getById(id) {
    const response = await this.DB.prepare(
      "SELECT * FROM activities WHERE id = ?",
    )
      .bind(id)
      .all();

    if (!response.success || !response.results.length) {
      return null;
    }

    return ActivityService.formatRow(response.results[0]);
  }

  async getDailySummary(date = new Date()) {
    const { startOfDay, endOfDay } = getLisbonDayRange(date);

    const response = await this.DB.prepare(
      "SELECT * FROM activities WHERE started_at BETWEEN ? AND ?",
    )
      .bind(startOfDay, endOfDay)
      .all();

    if (!response.success) {
      throw new Error("Failed to load daily activity summary");
    }

    const activities = response.results.map(ActivityService.formatRow);

    const totalActivities = activities.length;
    const distinctUsers = new Set(activities.map((activity) => activity.user_email)).size;

    const totalSeconds = activities.reduce((total, activity) => {
      if (activity.duration_seconds != null) {
        return total + activity.duration_seconds;
      }

      if (!activity.ended_at) {
        const nowTimestamp = getLisbonTimestamp();
        const now = Date.parse(nowTimestamp);
        const started = Date.parse(activity.started_at);
        return total + Math.max(0, Math.round((now - started) / 1000));
      }

      const ended = Date.parse(activity.ended_at);
      const started = Date.parse(activity.started_at);
      return total + Math.max(0, Math.round((ended - started) / 1000));
    }, 0);

    return {
      totalActivities,
      distinctUsers,
      totalSeconds,
    };
  }

  async createActivity(activityData: CreateActivityInput) {
    const now = getLisbonTimestamp();

    const response = await this.DB.prepare(
      `INSERT INTO activities (
        user_name,
        user_email,
        engagement,
        engagement_code,
        manager_id,
        manager_name,
        manager_email,
        manager_engagement_id,
        manager_engagement_task_id,
        manager_engagement_deliverable_id,
        process,
        deliverable,
        is_review,
        review_target,
        started_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        activityData.user_name,
        activityData.user_email,
        activityData.engagement_name,
        activityData.engagement_code,
        activityData.manager_id,
        activityData.manager_name,
        activityData.manager_email,
        activityData.manager_engagement_id,
        activityData.manager_engagement_task_id,
        activityData.manager_engagement_deliverable_id,
        activityData.task_label ?? null,
        activityData.deliverable_label ?? null,
        activityData.is_review ? 1 : 0,
        activityData.review_target ?? null,
        now,
        now,
        now,
      )
      .run();

    if (!response.success) {
      throw new Error("Failed to create activity");
    }

    const id = response.meta.last_row_id;
    return { id, started_at: now };
  }

  async stopActivity(id) {
    const existingResponse = await this.DB.prepare(
      "SELECT * FROM activities WHERE id = ?",
    )
      .bind(id)
      .all();

    if (!existingResponse.success || !existingResponse.results.length) {
      throw new Error("Activity not found");
    }

    const activity = ActivityService.formatRow(existingResponse.results[0]);

    if (activity.ended_at) {
      return ActivityService.formatRow(existingResponse.results[0]);
    }

    const endedAt = getLisbonTimestamp();
    const durationSeconds = Math.max(
      0,
      Math.round((Date.parse(endedAt) - Date.parse(activity.started_at)) / 1000),
    );

    const updateResponse = await this.DB.prepare(
      `UPDATE activities SET ended_at = ?, duration_seconds = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(endedAt, durationSeconds, endedAt, id)
      .run();

    if (!updateResponse.success) {
      throw new Error("Failed to stop activity");
    }

    return {
      ...activity,
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      updated_at: endedAt,
    };
  }
}
