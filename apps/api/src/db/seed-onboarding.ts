import { db } from './connection';
import { users, userSettings, partners, initialPlanSnapshot } from './schema';
import { logger } from '../config/logger';
import { eq } from 'drizzle-orm';
import {
  calculateHealthTargets,
  calculateWeightProjection,
  type Goal,
  type ActivityLevel,
  type Gender,
} from '../utils/health-calculations';

/**
 * Seed 3 demo users with varied profiles to test onboarding calculations
 */

interface DemoUserProfile {
  name: string;
  email: string;
  dateOfBirth: Date;
  gender: Gender;
  currentWeight: number;
  height: number;
  targetWeight: number;
  primaryGoal: Goal;
  activityLevel: ActivityLevel;
  dietaryPreferences: string[];
  mealsPerDay: number;
  partners: Array<{
    name: string;
    email: string;
    relationship: string;
  }>;
}

const demoProfiles: DemoUserProfile[] = [
  {
    // Profile 1: Young female wanting to lose weight
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    dateOfBirth: new Date('1995-03-15'), // 29 years old
    gender: 'female',
    currentWeight: 75, // kg
    height: 165, // cm
    targetWeight: 65, // kg - wants to lose 10kg
    primaryGoal: 'lose_weight',
    activityLevel: 'moderately_active',
    dietaryPreferences: ['vegetarian'],
    mealsPerDay: 4,
    partners: [
      {
        name: 'Emma Wilson',
        email: 'emma.w@example.com',
        relationship: 'friend',
      },
      {
        name: 'David Chen',
        email: 'david.chen@example.com',
        relationship: 'family',
      },
    ],
  },
  {
    // Profile 2: Middle-aged male wanting to gain muscle
    name: 'Marcus Johnson',
    email: 'marcus.j@example.com',
    dateOfBirth: new Date('1985-08-22'), // 39 years old
    gender: 'male',
    currentWeight: 80, // kg
    height: 180, // cm
    targetWeight: 88, // kg - wants to gain 8kg muscle
    primaryGoal: 'gain_muscle',
    activityLevel: 'very_active',
    dietaryPreferences: [],
    mealsPerDay: 5,
    partners: [
      {
        name: 'Lisa Johnson',
        email: 'lisa.j@example.com',
        relationship: 'family',
      },
      {
        name: 'Coach Mike',
        email: 'coach.mike@example.com',
        relationship: 'coach',
      },
    ],
  },
  {
    // Profile 3: Older person wanting to maintain and improve health
    name: 'Patricia Rodriguez',
    email: 'patricia.r@example.com',
    dateOfBirth: new Date('1968-11-30'), // 56 years old
    gender: 'female',
    currentWeight: 68, // kg
    height: 158, // cm
    targetWeight: 68, // kg - wants to maintain
    primaryGoal: 'improve_health',
    activityLevel: 'lightly_active',
    dietaryPreferences: ['gluten-free', 'low-sodium'],
    mealsPerDay: 3,
    partners: [
      {
        name: 'Dr. Amanda Lee',
        email: 'dr.lee@example.com',
        relationship: 'doctor',
      },
    ],
  },
];

const runOnboardingSeed = async () => {
  try {
    logger.info('Starting onboarding demo user seed...');

    for (const profile of demoProfiles) {
      // Calculate age
      const today = new Date();
      const age = today.getFullYear() - profile.dateOfBirth.getFullYear();

      // Calculate health targets
      const targets = calculateHealthTargets(
        {
          weight: profile.currentWeight,
          height: profile.height,
          age,
          gender: profile.gender,
          activityLevel: profile.activityLevel,
        },
        profile.primaryGoal
      );

      // Calculate weight projection
      const projection = calculateWeightProjection(
        profile.currentWeight,
        profile.targetWeight,
        profile.primaryGoal
      );

      // Set target date (projected completion date)
      const targetDate = projection.projectedDate;

      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);

      let userId: number;

      if (existingUser.length === 0) {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email: profile.email,
            name: profile.name,
            isActive: true,
          })
          .returning();

        userId = newUser.id;
        logger.info(`Created user: ${profile.name} (${profile.email})`);
      } else {
        userId = existingUser[0].id;
        logger.info(`User already exists: ${profile.name} (${profile.email})`);
      }

      // Upsert user settings
      await db
        .insert(userSettings)
        .values({
          userId,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          primaryGoal: profile.primaryGoal,
          targetWeight: profile.targetWeight.toFixed(2),
          targetDate,
          activityLevel: profile.activityLevel,
          currentWeight: profile.currentWeight.toFixed(2),
          height: profile.height.toFixed(2),
          bmr: targets.bmr,
          tdee: targets.tdee,
          calorieTarget: targets.calorieTarget,
          proteinTarget: targets.proteinTarget,
          waterTarget: targets.waterTarget,
          dietaryPreferences: profile.dietaryPreferences,
          allergies: [],
          mealsPerDay: profile.mealsPerDay,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            primaryGoal: profile.primaryGoal,
            targetWeight: profile.targetWeight.toFixed(2),
            targetDate,
            activityLevel: profile.activityLevel,
            currentWeight: profile.currentWeight.toFixed(2),
            height: profile.height.toFixed(2),
            bmr: targets.bmr,
            tdee: targets.tdee,
            calorieTarget: targets.calorieTarget,
            proteinTarget: targets.proteinTarget,
            waterTarget: targets.waterTarget,
            dietaryPreferences: profile.dietaryPreferences,
            mealsPerDay: profile.mealsPerDay,
            onboardingCompleted: true,
            onboardingCompletedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      logger.info(
        `Settings for ${profile.name}: age=${age} bmr=${targets.bmr} tdee=${targets.tdee} calorieTarget=${targets.calorieTarget} proteinTarget=${targets.proteinTarget} waterTarget=${targets.waterTarget}`
      );

      // Upsert initial plan snapshot
      await db
        .insert(initialPlanSnapshot)
        .values({
          userId,
          startWeight: profile.currentWeight.toFixed(2),
          targetWeight: profile.targetWeight.toFixed(2),
          startDate: new Date(),
          targetDate,
          weeklyWeightChangeRate: projection.weeklyRate.toFixed(2),
          estimatedWeeks: projection.estimatedWeeks,
          projectedCompletionDate: projection.projectedDate,
          calorieTarget: targets.calorieTarget,
          proteinTarget: targets.proteinTarget,
          waterTarget: targets.waterTarget,
          primaryGoal: profile.primaryGoal,
          activityLevel: profile.activityLevel,
        })
        .onConflictDoUpdate({
          target: initialPlanSnapshot.userId,
          set: {
            startWeight: profile.currentWeight.toFixed(2),
            targetWeight: profile.targetWeight.toFixed(2),
            startDate: new Date(),
            targetDate,
            weeklyWeightChangeRate: projection.weeklyRate.toFixed(2),
            estimatedWeeks: projection.estimatedWeeks,
            projectedCompletionDate: projection.projectedDate,
            calorieTarget: targets.calorieTarget,
            proteinTarget: targets.proteinTarget,
            waterTarget: targets.waterTarget,
            primaryGoal: profile.primaryGoal,
            activityLevel: profile.activityLevel,
          },
        });

      logger.info(
        `Projection for ${profile.name}: weeklyRate=${projection.weeklyRate} estimatedWeeks=${projection.estimatedWeeks} projectedDate=${projection.projectedDate.toISOString().split('T')[0]}`
      );

      // Delete existing partners
      await db.delete(partners).where(eq(partners.userId, userId));

      // Add partners
      for (const partner of profile.partners) {
        await db.insert(partners).values({
          userId,
          name: partner.name,
          email: partner.email,
          relationship: partner.relationship,
        });

        logger.info(`Added partner: ${partner.name} for ${profile.name}`);
      }

      logger.info(`✅ Completed onboarding seed for ${profile.name}\n`);
    }

    logger.info('✅ Onboarding demo user seed completed successfully');
    logger.info('\n📊 Summary of seeded users:');
    logger.info(
      '1. Sarah Chen (29F) - Losing 10kg | BMR: ~1500 | TDEE: ~2100 | Target: ~1600 cal/day'
    );
    logger.info(
      '2. Marcus Johnson (39M) - Gaining 8kg muscle | BMR: ~1800 | TDEE: ~2800 | Target: ~3200 cal/day'
    );
    logger.info(
      '3. Patricia Rodriguez (56F) - Maintaining for health | BMR: ~1300 | TDEE: ~1600 | Target: ~1600 cal/day'
    );
    logger.info('\nTest these profiles with GET /v1/summary/how-it-works?userId=<id>');

    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, '❌ Onboarding seed failed');
    process.exit(1);
  }
};

void runOnboardingSeed();