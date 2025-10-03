import { getLisbonDayRange, getLisbonTimestamp } from "@/lib/utils";

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
      manager_email: row.manager_email,
      process: row.process,
      deliverable: row.deliverable,
      started_at: row.started_at,
      ended_at: row.ended_at,
      duration_seconds: row.duration_seconds,
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

  async createActivity(activityData) {
    const now = getLisbonTimestamp();

    const response = await this.DB.prepare(
      `INSERT INTO activities (
        user_name,
        user_email,
        engagement,
        manager_email,
        process,
        deliverable,
        started_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        activityData.user_name,
        activityData.user_email,
        activityData.engagement,
        activityData.manager_email || null,
        activityData.process || null,
        activityData.deliverable || null,
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
