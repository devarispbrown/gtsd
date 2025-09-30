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
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
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