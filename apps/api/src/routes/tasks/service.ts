import { db } from '../../db/connection';
import { dailyTasks, evidence, streaks } from '../../db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { CreateEvidenceInput, TaskType } from './schemas';

/**
 * Task with optional evidence
 */
export interface TaskWithEvidence {
  id: number;
  userId: number;
  type: string;
  title: string;
  description: string | null;
  dueDate: Date;
  status: string;
  completedAt: Date | null;
  priority: number | null;
  estimatedDuration: number | null;
  evidence: Array<{
    id: number;
    type: string;
    notes: string | null;
    metrics: Record<string, unknown> | null;
    photoUrl: string | null;
    photoStorageKey: string | null;
    recordedAt: Date;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Grouped tasks response
 */
export interface GroupedTasks {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  tasksByType: Record<string, TaskWithEvidence[]>;
  streak: {
    current: number;
    longest: number;
    totalDays: number;
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Evidence creation result
 */
export interface EvidenceResult {
  task: TaskWithEvidence;
  evidence: {
    id: number;
    type: string;
    notes: string | null;
    metrics: Record<string, unknown> | null;
    photoUrl: string | null;
    photoStorageKey: string | null;
    recordedAt: Date;
    createdAt: Date;
  };
  streakUpdated: boolean;
  newStreak: number;
}

export class TasksService {
  /**
   * Get all tasks for a specific date, grouped by type
   * @param userId - Authenticated user ID
   * @param dateString - Date in YYYY-MM-DD format
   * @param limit - Pagination limit
   * @param offset - Pagination offset
   * @param typeFilter - Optional filter by task type
   * @param userTimezone - User's timezone (default: UTC)
   */
  async getTodayTasks(
    userId: number,
    dateString: string,
    limit: number,
    offset: number,
    typeFilter?: TaskType,
    userTimezone = 'UTC'
  ): Promise<GroupedTasks> {
    // Parse date in user's timezone
    const targetDate = new Date(dateString + 'T00:00:00');
    const dayStart = startOfDay(toZonedTime(targetDate, userTimezone));
    const dayEnd = endOfDay(toZonedTime(targetDate, userTimezone));

    logger.info(
      { userId, dateString, dayStart, dayEnd, userTimezone },
      'Fetching tasks for date range'
    );

    // Build query conditions
    const conditions = [
      eq(dailyTasks.userId, userId),
      gte(dailyTasks.dueDate, dayStart),
      lte(dailyTasks.dueDate, dayEnd),
    ];

    if (typeFilter) {
      conditions.push(eq(dailyTasks.taskType, typeFilter));
    }

    // Get total count for pagination (separate query for accuracy)
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dailyTasks)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // Fetch tasks with left join to evidence
    const tasksWithEvidence = await db
      .select({
        // Task fields
        id: dailyTasks.id,
        userId: dailyTasks.userId,
        type: dailyTasks.taskType,
        title: dailyTasks.title,
        description: dailyTasks.description,
        dueDate: dailyTasks.dueDate,
        status: dailyTasks.status,
        completedAt: dailyTasks.completedAt,
        priority: dailyTasks.priority,
        estimatedDuration: dailyTasks.metadata,
        createdAt: dailyTasks.createdAt,
        updatedAt: dailyTasks.updatedAt,
        // Evidence fields (may be null)
        evidenceId: evidence.id,
        evidenceType: evidence.evidenceType,
        evidenceNotes: evidence.notes,
        evidenceMetrics: evidence.metrics,
        evidencePhotoUrl: evidence.photoUrl,
        evidencePhotoStorageKey: evidence.photoStorageKey,
        evidenceRecordedAt: evidence.recordedAt,
        evidenceCreatedAt: evidence.createdAt,
      })
      .from(dailyTasks)
      .leftJoin(evidence, eq(evidence.taskId, dailyTasks.id))
      .where(and(...conditions))
      .orderBy(desc(dailyTasks.priority), dailyTasks.createdAt)
      .limit(limit)
      .offset(offset);

    // Group evidence by task
    const tasksMap = new Map<number, TaskWithEvidence>();

    for (const row of tasksWithEvidence) {
      if (!tasksMap.has(row.id)) {
        tasksMap.set(row.id, {
          id: row.id,
          userId: row.userId,
          type: row.type,
          title: row.title,
          description: row.description,
          dueDate: row.dueDate,
          status: row.status,
          completedAt: row.completedAt,
          priority: row.priority,
          estimatedDuration: null, // Extract from metadata if needed
          evidence: [],
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }

      // Add evidence if present
      if (row.evidenceId) {
        tasksMap.get(row.id)!.evidence.push({
          id: row.evidenceId,
          type: row.evidenceType!,
          notes: row.evidenceNotes,
          metrics: row.evidenceMetrics as Record<string, unknown> | null,
          photoUrl: row.evidencePhotoUrl,
          photoStorageKey: row.evidencePhotoStorageKey,
          recordedAt: row.evidenceRecordedAt!,
          createdAt: row.evidenceCreatedAt!,
        });
      }
    }

    const tasks = Array.from(tasksMap.values());

    // Group by type
    const tasksByType: Record<string, TaskWithEvidence[]> = {};
    let completedCount = 0;

    for (const task of tasks) {
      if (!tasksByType[task.type]) {
        tasksByType[task.type] = [];
      }
      tasksByType[task.type].push(task);

      if (task.status === 'completed') {
        completedCount++;
      }
    }

    // Get user streak (overall streak)
    const streak = await this.getUserStreak(userId);

    return {
      date: dateString,
      totalTasks: total,
      completedTasks: completedCount,
      completionPercentage: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      tasksByType,
      streak: {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        totalDays: streak.totalCompletions,
      },
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + tasks.length < total,
      },
    };
  }

  /**
   * Create evidence for a task and mark it complete
   */
  async createEvidence(userId: number, input: CreateEvidenceInput): Promise<EvidenceResult> {
    // Verify task exists and belongs to user
    const [task] = await db
      .select()
      .from(dailyTasks)
      .where(and(eq(dailyTasks.id, input.taskId), eq(dailyTasks.userId, userId)))
      .limit(1);

    if (!task) {
      throw new AppError(404, 'Task not found or does not belong to user');
    }

    // Check if task is already completed
    if (task.status === 'completed') {
      logger.warn(
        { userId, taskId: input.taskId },
        'Attempting to add evidence to already completed task'
      );
      // Allow adding evidence to completed tasks, but don't update streak
    }

    // Create evidence and update task in transaction
    const result = await db.transaction(async (tx) => {
      // Prepare evidence values based on type
      const evidenceValues: {
        taskId: number;
        userId: number;
        evidenceType: 'text_log' | 'metrics' | 'photo_reference';
        notes: string | null;
        metrics?: Record<string, unknown>;
        photoUrl?: string;
        photoStorageKey?: string;
      } = {
        taskId: input.taskId,
        userId,
        evidenceType: input.type,
        notes: input.notes || null,
      };

      // Add type-specific data
      if (input.type === 'text_log' && 'text' in input.data) {
        evidenceValues.notes = input.data.text;
      } else if (input.type === 'metrics' && 'metrics' in input.data) {
        evidenceValues.metrics = input.data.metrics;
      } else if (input.type === 'photo_reference' && 'photoUrl' in input.data) {
        evidenceValues.photoUrl = input.data.photoUrl;
        if ('photoStorageKey' in input.data) {
          evidenceValues.photoStorageKey = input.data.photoStorageKey as string;
        }
      }

      // Insert evidence
      const [newEvidence] = await tx.insert(evidence).values(evidenceValues).returning();

      // Update task completion status
      const [updatedTask] = await tx
        .update(dailyTasks)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dailyTasks.id, input.taskId))
        .returning();

      // Update streak if task wasn't already completed
      let streakUpdated = false;
      let newStreak = 0;

      if (task.status !== 'completed') {
        const streakResult = await this.updateUserStreak(tx, userId);
        streakUpdated = true;
        newStreak = streakResult.currentStreak;
      }

      return { newEvidence, updatedTask, streakUpdated, newStreak };
    });

    // Fetch full task with evidence
    const fullTask = await this.getTaskById(userId, input.taskId);

    return {
      task: fullTask,
      evidence: {
        id: result.newEvidence.id,
        type: result.newEvidence.evidenceType,
        notes: result.newEvidence.notes,
        metrics: result.newEvidence.metrics as Record<string, unknown> | null,
        photoUrl: result.newEvidence.photoUrl,
        photoStorageKey: result.newEvidence.photoStorageKey,
        recordedAt: result.newEvidence.recordedAt,
        createdAt: result.newEvidence.createdAt,
      },
      streakUpdated: result.streakUpdated,
      newStreak: result.newStreak,
    };
  }

  /**
   * Get a single task by ID with evidence
   */
  private async getTaskById(userId: number, taskId: number): Promise<TaskWithEvidence> {
    const taskRows = await db
      .select({
        id: dailyTasks.id,
        userId: dailyTasks.userId,
        type: dailyTasks.taskType,
        title: dailyTasks.title,
        description: dailyTasks.description,
        dueDate: dailyTasks.dueDate,
        status: dailyTasks.status,
        completedAt: dailyTasks.completedAt,
        priority: dailyTasks.priority,
        estimatedDuration: dailyTasks.metadata,
        createdAt: dailyTasks.createdAt,
        updatedAt: dailyTasks.updatedAt,
        evidenceId: evidence.id,
        evidenceType: evidence.evidenceType,
        evidenceNotes: evidence.notes,
        evidenceMetrics: evidence.metrics,
        evidencePhotoUrl: evidence.photoUrl,
        evidencePhotoStorageKey: evidence.photoStorageKey,
        evidenceRecordedAt: evidence.recordedAt,
        evidenceCreatedAt: evidence.createdAt,
      })
      .from(dailyTasks)
      .leftJoin(evidence, eq(evidence.taskId, dailyTasks.id))
      .where(and(eq(dailyTasks.id, taskId), eq(dailyTasks.userId, userId)))
      .limit(10); // Max evidence per task

    if (taskRows.length === 0) {
      throw new AppError(404, 'Task not found');
    }

    const firstRow = taskRows[0];
    const task: TaskWithEvidence = {
      id: firstRow.id,
      userId: firstRow.userId,
      type: firstRow.type,
      title: firstRow.title,
      description: firstRow.description,
      dueDate: firstRow.dueDate,
      status: firstRow.status,
      completedAt: firstRow.completedAt,
      priority: firstRow.priority,
      estimatedDuration: null,
      evidence: [],
      createdAt: firstRow.createdAt,
      updatedAt: firstRow.updatedAt,
    };

    // Add all evidence
    for (const row of taskRows) {
      if (row.evidenceId) {
        task.evidence.push({
          id: row.evidenceId,
          type: row.evidenceType!,
          notes: row.evidenceNotes,
          metrics: row.evidenceMetrics as Record<string, unknown> | null,
          photoUrl: row.evidencePhotoUrl,
          photoStorageKey: row.evidencePhotoStorageKey,
          recordedAt: row.evidenceRecordedAt!,
          createdAt: row.evidenceCreatedAt!,
        });
      }
    }

    return task;
  }

  /**
   * Get user's current streak (overall streak)
   */
  private async getUserStreak(userId: number) {
    const [streak] = await db
      .select()
      .from(streaks)
      .where(and(eq(streaks.userId, userId), eq(streaks.streakType, 'overall')))
      .limit(1);

    if (!streak) {
      // Create initial streak record
      const [newStreak] = await db
        .insert(streaks)
        .values({
          userId,
          streakType: 'overall',
          currentStreak: 0,
          longestStreak: 0,
          totalCompletions: 0,
        })
        .returning();

      return newStreak;
    }

    return streak;
  }

  /**
   * Update user streak after task completion
   * @param tx - Database transaction
   * @param userId - User ID
   */
  private async updateUserStreak(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    userId: number
  ) {
    const [existingStreak] = await tx
      .select()
      .from(streaks)
      .where(and(eq(streaks.userId, userId), eq(streaks.streakType, 'overall')))
      .limit(1);

    const now = new Date();
    const today = startOfDay(now);

    if (!existingStreak) {
      // First completion ever
      const [newStreak] = await tx
        .insert(streaks)
        .values({
          userId,
          streakType: 'overall',
          currentStreak: 1,
          longestStreak: 1,
          totalCompletions: 1,
          lastCompletedDate: today,
        })
        .returning();

      logger.info({ userId, streak: 1 }, 'Started new streak');
      return newStreak;
    }

    // Check if already completed today
    const lastCompletion = existingStreak.lastCompletedDate
      ? startOfDay(new Date(existingStreak.lastCompletedDate))
      : null;

    if (lastCompletion && lastCompletion.getTime() === today.getTime()) {
      // Already counted today, no update needed
      return existingStreak;
    }

    // Check if completing yesterday (streak continues)
    const yesterday = startOfDay(subDays(now, 1));
    const streakContinues =
      lastCompletion &&
      (lastCompletion.getTime() === yesterday.getTime() ||
        lastCompletion.getTime() === today.getTime());

    const newCurrentStreak = streakContinues ? existingStreak.currentStreak + 1 : 1;

    const newLongestStreak = Math.max(newCurrentStreak, existingStreak.longestStreak);

    const [updatedStreak] = await tx
      .update(streaks)
      .set({
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        totalCompletions: existingStreak.totalCompletions + 1,
        lastCompletedDate: today,
        updatedAt: now,
      })
      .where(and(eq(streaks.userId, userId), eq(streaks.streakType, 'overall')))
      .returning();

    logger.info(
      {
        userId,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        streakContinued: streakContinues,
      },
      'Updated user streak'
    );

    return updatedStreak;
  }
}
