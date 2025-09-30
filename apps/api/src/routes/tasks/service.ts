import { db } from '../../db/connection';
import {
  dailyTasks,
  evidence,
  streaks,
  SelectEvidence,
  SelectStreak,
} from '../../db/schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { CreateEvidenceInput, TaskType } from './schemas';
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import * as schema from '../../db/schema';

/**
 * Evidence item with properly typed fields
 * Represents a single piece of evidence attached to a task
 */
export interface EvidenceItem {
  id: number;
  type: string;
  notes: string | null;
  metrics: Record<string, unknown> | null;
  photoUrl: string | null;
  photoStorageKey: string | null;
  recordedAt: Date;
  createdAt: Date;
}

/**
 * Task with optional evidence array
 * Represents a complete task with all associated evidence
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
  priority: number;
  estimatedDuration: number | null;
  evidence: EvidenceItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Streak summary for user
 */
export interface StreakSummary {
  current: number;
  longest: number;
  totalDays: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

/**
 * Grouped tasks response for GET /v1/tasks/today
 * Contains all tasks for a date, grouped by type with streak and pagination info
 */
export interface GroupedTasks {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  tasksByType: Record<string, TaskWithEvidence[]>;
  streak: StreakSummary;
  pagination: PaginationMeta;
}

/**
 * Evidence creation result for POST /v1/evidence
 * Contains the updated task, new evidence, and streak information
 */
export interface EvidenceResult {
  task: TaskWithEvidence;
  evidence: EvidenceItem;
  streakUpdated: boolean;
  newStreak: number;
}

/**
 * Transaction type for database operations
 */
type DbTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Schema for validating JSONB evidence metrics
 * Ensures metrics are a record of string keys to unknown values
 */
const evidenceMetricsSchema = z.record(z.string(), z.unknown()).nullable();

/**
 * Sanitize text input to prevent XSS attacks
 * Strips all HTML tags and limits length
 */
function sanitizeText(text: string, maxLength = 2000): string {
  const sanitized = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: [], // Strip all attributes
  });
  return sanitized.substring(0, maxLength).trim();
}

/**
 * Safely parse and validate JSONB metrics field
 * Returns validated metrics or null if invalid
 */
function validateMetrics(
  metrics: unknown
): Record<string, unknown> | null {
  try {
    return evidenceMetricsSchema.parse(metrics);
  } catch (error) {
    logger.warn({ metrics, error }, 'Invalid metrics data in JSONB field');
    return null;
  }
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
    const startTime = Date.now();

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

    // 1. Get total count (unchanged)
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dailyTasks)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // 2. Fetch tasks WITHOUT evidence (correct pagination)
    const tasks = await db
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
      })
      .from(dailyTasks)
      .where(and(...conditions))
      .orderBy(desc(dailyTasks.priority), dailyTasks.createdAt)
      .limit(limit)
      .offset(offset);

    // 3. Fetch evidence for these tasks (if any)
    let evidenceList: SelectEvidence[] = [];
    if (tasks.length > 0) {
      const taskIds = tasks.map((t) => t.id);
      evidenceList = await db
        .select()
        .from(evidence)
        .where(inArray(evidence.taskId, taskIds))
        .orderBy(evidence.createdAt);
    }

    // 4. Group evidence by task ID
    const evidenceByTaskId = new Map<number, EvidenceItem[]>();
    for (const ev of evidenceList) {
      if (!evidenceByTaskId.has(ev.taskId)) {
        evidenceByTaskId.set(ev.taskId, []);
      }
      evidenceByTaskId.get(ev.taskId)!.push({
        id: ev.id,
        type: ev.evidenceType,
        notes: ev.notes,
        metrics: validateMetrics(ev.metrics),
        photoUrl: ev.photoUrl,
        photoStorageKey: ev.photoStorageKey,
        recordedAt: ev.recordedAt,
        createdAt: ev.createdAt,
      });
    }

    // 5. Build TaskWithEvidence objects
    const tasksWithEvidence: TaskWithEvidence[] = tasks.map((task) => ({
      id: task.id,
      userId: task.userId,
      type: task.type,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      status: task.status,
      completedAt: task.completedAt,
      priority: task.priority || 0,
      estimatedDuration: null,
      evidence: evidenceByTaskId.get(task.id) || [],
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));

    // 6. Group by type
    const tasksByType: Record<string, TaskWithEvidence[]> = {};
    let completedCount = 0;

    for (const task of tasksWithEvidence) {
      if (!tasksByType[task.type]) {
        tasksByType[task.type] = [];
      }
      tasksByType[task.type].push(task);

      if (task.status === 'completed') {
        completedCount++;
      }
    }

    // 7. Get user streak (unchanged)
    const streak = await this.getUserStreak(userId);

    const duration = Date.now() - startTime;
    logger.info(
      {
        userId,
        duration,
        taskCount: tasks.length,
        evidenceCount: evidenceList.length,
        total,
      },
      'getTodayTasks query completed'
    );

    // Warn if exceeds p95 target
    if (duration > 300) {
      logger.warn({ userId, duration, target: 300 }, 'Query exceeded p95 target of 300ms');
    }

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
      throw new AppError(404, `Task ${input.taskId} not found for user ${userId}`);
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
        notes: input.notes ? sanitizeText(input.notes) : null,
      };

      // Add type-specific data with sanitization
      if (input.type === 'text_log' && 'text' in input.data) {
        // Sanitize text input to prevent XSS attacks
        evidenceValues.notes = sanitizeText(input.data.text);
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
        metrics: validateMetrics(result.newEvidence.metrics),
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
    // 1. Fetch task
    const [task] = await db
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
      })
      .from(dailyTasks)
      .where(and(eq(dailyTasks.id, taskId), eq(dailyTasks.userId, userId)))
      .limit(1);

    if (!task) {
      throw new AppError(404, `Task ${taskId} not found for user ${userId}`);
    }

    // 2. Fetch evidence for this task
    const evidenceList = await db
      .select()
      .from(evidence)
      .where(eq(evidence.taskId, taskId))
      .orderBy(evidence.createdAt)
      .limit(10); // Max 10 evidence items

    // 3. Map evidence with validated metrics
    const evidenceItems: EvidenceItem[] = evidenceList.map((ev) => ({
      id: ev.id,
      type: ev.evidenceType,
      notes: ev.notes,
      metrics: validateMetrics(ev.metrics),
      photoUrl: ev.photoUrl,
      photoStorageKey: ev.photoStorageKey,
      recordedAt: ev.recordedAt,
      createdAt: ev.createdAt,
    }));

    return {
      id: task.id,
      userId: task.userId,
      type: task.type,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      status: task.status,
      completedAt: task.completedAt,
      priority: task.priority || 0,
      estimatedDuration: null,
      evidence: evidenceItems,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Get user's current streak (overall streak)
   * @param userId - User ID to fetch streak for
   * @returns Streak record (creates one if doesn't exist)
   */
  private async getUserStreak(userId: number): Promise<SelectStreak> {
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
   * @param tx - Database transaction instance
   * @param userId - User ID to update streak for
   * @returns Updated streak record
   */
  private async updateUserStreak(tx: DbTransaction, userId: number): Promise<SelectStreak> {
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

    // Use SQL-level atomic operations to prevent race conditions during concurrent updates
    const [updatedStreak] = await tx
      .update(streaks)
      .set({
        currentStreak: streakContinues
          ? sql`current_streak + 1`
          : sql`1`,
        longestStreak: streakContinues
          ? sql`GREATEST(current_streak + 1, longest_streak)`
          : sql`GREATEST(1, longest_streak)`,
        totalCompletions: sql`total_completions + 1`,
        lastCompletedDate: today,
        updatedAt: now,
      })
      .where(and(eq(streaks.userId, userId), eq(streaks.streakType, 'overall')))
      .returning();

    logger.info(
      {
        userId,
        currentStreak: updatedStreak.currentStreak,
        longestStreak: updatedStreak.longestStreak,
        streakContinued: streakContinues,
      },
      'Updated user streak'
    );

    return updatedStreak;
  }
}
