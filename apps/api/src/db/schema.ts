import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  varchar,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'), // Nullable for backward compatibility
  phone: varchar('phone', { length: 20 }),
  smsOptIn: boolean('sms_opt_in').default(true),
  timezone: varchar('timezone', { length: 50 }).default('America/Los_Angeles'),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: serial('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User health and goal settings
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Account basics
  dateOfBirth: timestamp('date_of_birth'),
  gender: varchar('gender', { length: 20 }), // male, female, other

  // Goals
  primaryGoal: varchar('primary_goal', { length: 50 }), // lose_weight, gain_muscle, maintain, improve_health
  targetWeight: decimal('target_weight', { precision: 5, scale: 2 }), // kg
  targetDate: timestamp('target_date'),
  activityLevel: varchar('activity_level', { length: 30 }), // sedentary, light, moderate, active, very_active

  // Health metrics
  currentWeight: decimal('current_weight', { precision: 5, scale: 2 }), // kg
  height: decimal('height', { precision: 5, scale: 2 }), // cm

  // Calculated values (BMR/TDEE)
  bmr: integer('bmr'), // Basal Metabolic Rate (calories/day)
  tdee: integer('tdee'), // Total Daily Energy Expenditure (calories/day)
  calorieTarget: integer('calorie_target'), // Daily calorie target
  proteinTarget: integer('protein_target'), // grams/day
  waterTarget: integer('water_target'), // ml/day

  // Preferences
  dietaryPreferences: jsonb('dietary_preferences').$type<string[]>(), // vegetarian, vegan, etc.
  allergies: jsonb('allergies').$type<string[]>(),
  mealsPerDay: integer('meals_per_day').default(3),

  // Onboarding completion
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  onboardingCompletedAt: timestamp('onboarding_completed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Accountability partners
export const partners = pgTable(
  'partners',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    email: text('email'),
    phone: varchar('phone', { length: 20 }),
    relationship: varchar('relationship', { length: 50 }), // friend, family, coach, etc.
    notificationPreference: varchar('notification_preference', { length: 20 }).default('email'), // email, sms, both

    // Status
    inviteSent: boolean('invite_sent').default(false).notNull(),
    inviteSentAt: timestamp('invite_sent_at'),
    accepted: boolean('accepted').default(false).notNull(),
    acceptedAt: timestamp('accepted_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('partners_user_id_idx').on(table.userId),
  })
);

// Initial plan snapshot - captures the plan at onboarding time
export const initialPlanSnapshot = pgTable('initial_plan_snapshots', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Snapshot of goals and metrics at start
  startWeight: decimal('start_weight', { precision: 5, scale: 2 }).notNull(),
  targetWeight: decimal('target_weight', { precision: 5, scale: 2 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  targetDate: timestamp('target_date').notNull(),

  // Calculated projection
  weeklyWeightChangeRate: decimal('weekly_weight_change_rate', { precision: 4, scale: 2 }), // kg/week
  estimatedWeeks: integer('estimated_weeks'),
  projectedCompletionDate: timestamp('projected_completion_date'),

  // Targets at start
  calorieTarget: integer('calorie_target').notNull(),
  proteinTarget: integer('protein_target').notNull(),
  waterTarget: integer('water_target').notNull(),

  // Metadata
  primaryGoal: varchar('primary_goal', { length: 50 }).notNull(),
  activityLevel: varchar('activity_level', { length: 30 }).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// ENUMS FOR TODAY CHECKLIST FEATURE
// ============================================================================

export const planStatusEnum = pgEnum('plan_status', ['active', 'completed', 'archived', 'draft']);

export const taskTypeEnum = pgEnum('task_type', [
  'workout',
  'supplement',
  'meal',
  'hydration',
  'cardio',
  'weight_log',
  'progress_photo',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
  'skipped',
]);

export const evidenceTypeEnum = pgEnum('evidence_type', ['text_log', 'metrics', 'photo_reference']);

export const streakTypeEnum = pgEnum('streak_type', [
  'workout',
  'supplement',
  'meal',
  'hydration',
  'cardio',
  'weight_log',
  'progress_photo',
  'overall',
]);

export const smsMessageTypeEnum = pgEnum('sms_message_type', ['morning_nudge', 'evening_reminder']);

export const smsStatusEnum = pgEnum('sms_status', ['queued', 'sent', 'delivered', 'failed']);

export const photoEvidenceTypeEnum = pgEnum('photo_evidence_type', ['before', 'during', 'after']);

// ============================================================================
// REFRESH TOKENS TABLE - Store refresh tokens for JWT auth
// ============================================================================

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBy: text('replaced_by'), // Token that replaced this one (for refresh token rotation)
  },
  (table) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(table.token),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  })
);

// ============================================================================
// PLANS TABLE - Generated daily/weekly plans
// ============================================================================

export const plans = pgTable(
  'plans',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Plan metadata
    name: text('name').notNull(),
    description: text('description'),
    planType: varchar('plan_type', { length: 20 }).notNull(), // 'daily' or 'weekly'

    // Date range
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),

    // Status
    status: planStatusEnum('status').default('active').notNull(),

    // Completion tracking
    totalTasks: integer('total_tasks').default(0).notNull(),
    completedTasks: integer('completed_tasks').default(0).notNull(),
    completionPercentage: decimal('completion_percentage', { precision: 5, scale: 2 }).default('0'),

    // Metadata
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('plans_user_id_idx').on(table.userId),
    statusIdx: index('plans_status_idx').on(table.status),
    startDateIdx: index('plans_start_date_idx').on(table.startDate),
    userStatusIdx: index('plans_user_status_idx').on(table.userId, table.status),
  })
);

// ============================================================================
// DAILY TASKS TABLE - Individual actionable items for today checklist
// ============================================================================

export const dailyTasks = pgTable(
  'daily_tasks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: integer('plan_id').references(() => plans.id, { onDelete: 'cascade' }),

    // Task details
    title: text('title').notNull(),
    description: text('description'),
    taskType: taskTypeEnum('task_type').notNull(),

    // Scheduling
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    dueTime: varchar('due_time', { length: 8 }), // HH:MM:SS format (optional specific time)

    // Status
    status: taskStatusEnum('status').default('pending').notNull(),

    // Completion
    completedAt: timestamp('completed_at', { withTimezone: true }),
    skippedAt: timestamp('skipped_at', { withTimezone: true }),
    skipReason: text('skip_reason'),

    // Task-specific metadata (flexible JSON for different task types)
    metadata: jsonb('metadata').$type<{
      // For workout tasks
      exerciseName?: string;
      sets?: number;
      reps?: number;
      weight?: number;
      duration?: number; // minutes

      // For supplement tasks
      supplementName?: string;
      dosage?: string;

      // For meal tasks
      mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      targetCalories?: number;
      targetProtein?: number;

      // For hydration tasks
      targetAmount?: number; // ml

      // For cardio tasks
      activityType?: string;
      targetDuration?: number; // minutes
      targetDistance?: number; // km

      // For weight_log tasks
      previousWeight?: number;

      // For progress_photo tasks
      photoType?: 'front' | 'side' | 'back';
    }>(),

    // Priority and ordering
    priority: integer('priority').default(0).notNull(), // Higher = more important
    order: integer('order').default(0).notNull(), // Display order within plan

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('daily_tasks_user_id_idx').on(table.userId),
    planIdIdx: index('daily_tasks_plan_id_idx').on(table.planId),
    taskTypeIdx: index('daily_tasks_task_type_idx').on(table.taskType),
    statusIdx: index('daily_tasks_status_idx').on(table.status),
    dueDateIdx: index('daily_tasks_due_date_idx').on(table.dueDate),
    userDueDateIdx: index('daily_tasks_user_due_date_idx').on(table.userId, table.dueDate),
    userStatusIdx: index('daily_tasks_user_status_idx').on(table.userId, table.status),
    userTaskTypeIdx: index('daily_tasks_user_task_type_idx').on(table.userId, table.taskType),
  })
);

// ============================================================================
// EVIDENCE TABLE - Records of task completion
// ============================================================================

export const evidence = pgTable(
  'evidence',
  {
    id: serial('id').primaryKey(),
    taskId: integer('task_id')
      .notNull()
      .references(() => dailyTasks.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Evidence details
    evidenceType: evidenceTypeEnum('evidence_type').notNull(),

    // Text log evidence
    notes: text('notes'),

    // Metrics evidence (for workouts, weight logs, etc.)
    metrics: jsonb('metrics').$type<{
      // Workout metrics
      actualSets?: number;
      actualReps?: number;
      actualWeight?: number;
      actualDuration?: number; // minutes

      // Weight log metrics
      weight?: number; // kg
      bodyFat?: number; // percentage
      muscleMass?: number; // kg

      // Cardio metrics
      distance?: number; // km
      duration?: number; // minutes
      avgHeartRate?: number;
      caloriesBurned?: number;

      // Meal metrics
      actualCalories?: number;
      actualProtein?: number;
      actualCarbs?: number;
      actualFat?: number;

      // Hydration metrics
      amount?: number; // ml

      // Supplement metrics
      taken?: boolean;
      timeTaken?: string; // ISO timestamp
    }>(),

    // Photo evidence
    photoUrl: text('photo_url'),
    photoStorageKey: text('photo_storage_key'), // S3/storage reference

    // Timing
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    taskIdIdx: index('evidence_task_id_idx').on(table.taskId),
    userIdIdx: index('evidence_user_id_idx').on(table.userId),
    evidenceTypeIdx: index('evidence_type_idx').on(table.evidenceType),
    recordedAtIdx: index('evidence_recorded_at_idx').on(table.recordedAt),
  })
);

// ============================================================================
// STREAKS TABLE - Track consecutive completion days
// ============================================================================

export const streaks = pgTable(
  'streaks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Streak type
    streakType: streakTypeEnum('streak_type').notNull(),

    // Streak data
    currentStreak: integer('current_streak').default(0).notNull(), // consecutive days
    longestStreak: integer('longest_streak').default(0).notNull(), // all-time best
    totalCompletions: integer('total_completions').default(0).notNull(), // lifetime total

    // Dates
    lastCompletedDate: timestamp('last_completed_date', { withTimezone: true }),
    streakStartDate: timestamp('streak_start_date', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('streaks_user_id_idx').on(table.userId),
    streakTypeIdx: index('streaks_type_idx').on(table.streakType),
    userTypeIdx: index('streaks_user_type_idx').on(table.userId, table.streakType),
  })
);

// ============================================================================
// SMS LOGS TABLE - Track all SMS messages sent
// ============================================================================

export const smsLogs = pgTable(
  'sms_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Message details
    messageType: smsMessageTypeEnum('message_type').notNull(),
    messageBody: text('message_body').notNull(),

    // Twilio tracking
    twilioSid: varchar('twilio_sid', { length: 100 }),
    status: smsStatusEnum('status').default('queued').notNull(),

    // Timing
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),

    // Error tracking
    errorMessage: text('error_message'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('sms_logs_user_id_idx').on(table.userId),
    statusIdx: index('sms_logs_status_idx').on(table.status),
    messageTypeIdx: index('sms_logs_message_type_idx').on(table.messageType),
    createdAtIdx: index('sms_logs_created_at_idx').on(table.createdAt),
    userCreatedIdx: index('sms_logs_user_created_idx').on(table.userId, table.createdAt),
    userTypeCreatedIdx: index('sms_logs_user_type_created_idx').on(
      table.userId,
      table.messageType,
      table.createdAt
    ),
  })
);

// ============================================================================
// PHOTOS TABLE - Progress photos stored in S3
// ============================================================================

export const photos = pgTable(
  'photos',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // S3 storage details
    fileKey: text('file_key').notNull(),
    fileSize: integer('file_size').notNull(), // bytes
    mimeType: varchar('mime_type', { length: 50 }).notNull(),

    // Image metadata
    width: integer('width'),
    height: integer('height'),

    // Timestamps
    takenAt: timestamp('taken_at', { withTimezone: true }),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userCreatedIdx: index('photos_user_created_idx').on(table.userId, table.createdAt),
    fileKeyIdx: uniqueIndex('photos_file_key_idx').on(table.fileKey),
  })
);

// ============================================================================
// TASK_EVIDENCE TABLE - Many-to-many relationship between tasks and photos
// ============================================================================

export const taskEvidence = pgTable(
  'task_evidence',
  {
    id: serial('id').primaryKey(),
    taskId: integer('task_id')
      .notNull()
      .references(() => dailyTasks.id, { onDelete: 'cascade' }),
    photoId: integer('photo_id')
      .notNull()
      .references(() => photos.id, { onDelete: 'cascade' }),
    evidenceType: photoEvidenceTypeEnum('evidence_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    taskPhotoIdx: uniqueIndex('task_evidence_task_photo_idx').on(table.taskId, table.photoId),
    photoIdx: index('task_evidence_photo_idx').on(table.photoId),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many, one }) => ({
  tasks: many(tasks),
  userSettings: one(userSettings),
  partners: many(partners),
  initialPlanSnapshot: one(initialPlanSnapshot),
  plans: many(plans),
  dailyTasks: many(dailyTasks),
  evidence: many(evidence),
  streaks: many(streaks),
  smsLogs: many(smsLogs),
  photos: many(photos),
  refreshTokens: many(refreshTokens),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
  user: one(users, {
    fields: [plans.userId],
    references: [users.id],
  }),
  dailyTasks: many(dailyTasks),
}));

export const dailyTasksRelations = relations(dailyTasks, ({ one, many }) => ({
  user: one(users, {
    fields: [dailyTasks.userId],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [dailyTasks.planId],
    references: [plans.id],
  }),
  evidence: many(evidence),
  taskEvidence: many(taskEvidence),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  task: one(dailyTasks, {
    fields: [evidence.taskId],
    references: [dailyTasks.id],
  }),
  user: one(users, {
    fields: [evidence.userId],
    references: [users.id],
  }),
}));

export const streaksRelations = relations(streaks, ({ one }) => ({
  user: one(users, {
    fields: [streaks.userId],
    references: [users.id],
  }),
}));

export const smsLogsRelations = relations(smsLogs, ({ one }) => ({
  user: one(users, {
    fields: [smsLogs.userId],
    references: [users.id],
  }),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  user: one(users, {
    fields: [photos.userId],
    references: [users.id],
  }),
  taskEvidence: many(taskEvidence),
}));

export const taskEvidenceRelations = relations(taskEvidence, ({ one }) => ({
  task: one(dailyTasks, {
    fields: [taskEvidence.taskId],
    references: [dailyTasks.id],
  }),
  photo: one(photos, {
    fields: [taskEvidence.photoId],
    references: [photos.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// INFERRED TYPES FOR TYPE SAFETY
// ============================================================================

/**
 * Inferred type for selecting a user from the database
 * @example
 * const user: SelectUser = await db.select().from(users).where(eq(users.id, 1));
 */
export type SelectUser = InferSelectModel<typeof users>;

/**
 * Inferred type for inserting a user into the database
 * @example
 * const newUser: InsertUser = { email: 'test@example.com', name: 'Test User' };
 */
export type InsertUser = InferInsertModel<typeof users>;

/**
 * Inferred type for selecting user settings
 */
export type SelectUserSettings = InferSelectModel<typeof userSettings>;

/**
 * Inferred type for inserting user settings
 */
export type InsertUserSettings = InferInsertModel<typeof userSettings>;

/**
 * Inferred type for selecting a partner
 */
export type SelectPartner = InferSelectModel<typeof partners>;

/**
 * Inferred type for inserting a partner
 */
export type InsertPartner = InferInsertModel<typeof partners>;

/**
 * Inferred type for selecting a plan
 */
export type SelectPlan = InferSelectModel<typeof plans>;

/**
 * Inferred type for inserting a plan
 */
export type InsertPlan = InferInsertModel<typeof plans>;

/**
 * Inferred type for selecting a daily task
 */
export type SelectDailyTask = InferSelectModel<typeof dailyTasks>;

/**
 * Inferred type for inserting a daily task
 */
export type InsertDailyTask = InferInsertModel<typeof dailyTasks>;

/**
 * Inferred type for selecting evidence
 */
export type SelectEvidence = InferSelectModel<typeof evidence>;

/**
 * Inferred type for inserting evidence
 */
export type InsertEvidence = InferInsertModel<typeof evidence>;

/**
 * Inferred type for selecting a streak
 */
export type SelectStreak = InferSelectModel<typeof streaks>;

/**
 * Inferred type for inserting a streak
 */
export type InsertStreak = InferInsertModel<typeof streaks>;

/**
 * Inferred type for selecting an initial plan snapshot
 */
export type SelectInitialPlanSnapshot = InferSelectModel<typeof initialPlanSnapshot>;

/**
 * Inferred type for inserting an initial plan snapshot
 */
export type InsertInitialPlanSnapshot = InferInsertModel<typeof initialPlanSnapshot>;

/**
 * Inferred type for selecting an SMS log
 */
export type SelectSmsLog = InferSelectModel<typeof smsLogs>;

/**
 * Inferred type for inserting an SMS log
 */
export type InsertSmsLog = InferInsertModel<typeof smsLogs>;

/**
 * Inferred type for selecting a photo
 */
export type SelectPhoto = InferSelectModel<typeof photos>;

/**
 * Inferred type for inserting a photo
 */
export type InsertPhoto = InferInsertModel<typeof photos>;

/**
 * Inferred type for selecting task evidence
 */
export type SelectTaskEvidence = InferSelectModel<typeof taskEvidence>;

/**
 * Inferred type for inserting task evidence
 */
export type InsertTaskEvidence = InferInsertModel<typeof taskEvidence>;

/**
 * Inferred type for selecting a refresh token
 */
export type SelectRefreshToken = InferSelectModel<typeof refreshTokens>;

/**
 * Inferred type for inserting a refresh token
 */
export type InsertRefreshToken = InferInsertModel<typeof refreshTokens>;
