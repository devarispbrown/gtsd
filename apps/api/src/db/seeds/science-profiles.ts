import { db } from '../connection';
import { users, userSettings, initialPlanSnapshot } from '../schema';
import { logger } from '../../config/logger';
import { scienceService } from '../../services/science';
import { eq } from 'drizzle-orm';
import { addWeeks } from 'date-fns';

/**
 * Seed script for science profiles
 * Creates diverse user profiles to validate BMR/TDEE calculations:
 * - Various genders (male, female, other)
 * - Various ages (18-65)
 * - Various weights (60-120 kg)
 * - Various heights (150-195 cm)
 * - All activity levels (5 levels)
 * - All goals (4 goals)
 *
 * Run with: pnpm db:seed:science
 */

interface SeedProfile {
  email: string;
  name: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  currentWeight: number; // kg
  height: number; // cm
  targetWeight: number; // kg
  activityLevel:
    | 'sedentary'
    | 'lightly_active'
    | 'moderately_active'
    | 'very_active'
    | 'extremely_active';
  primaryGoal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';
  mealsPerDay: number;
}

// Diverse seed profiles
const seedProfiles: SeedProfile[] = [
  // 1. Young female, sedentary, weight loss
  {
    email: 'sarah.jones@example.com',
    name: 'Sarah Jones',
    dateOfBirth: new Date('1998-03-15'), // 26 years old
    gender: 'female',
    currentWeight: 75, // kg
    height: 165, // cm
    targetWeight: 65,
    activityLevel: 'sedentary',
    primaryGoal: 'lose_weight',
    mealsPerDay: 3,
  },
  // 2. Middle-aged male, moderately active, muscle gain
  {
    email: 'john.smith@example.com',
    name: 'John Smith',
    dateOfBirth: new Date('1980-07-22'), // 44 years old
    gender: 'male',
    currentWeight: 85, // kg
    height: 180, // cm
    targetWeight: 90,
    activityLevel: 'moderately_active',
    primaryGoal: 'gain_muscle',
    mealsPerDay: 5,
  },
  // 3. Older female, lightly active, maintain
  {
    email: 'maria.garcia@example.com',
    name: 'Maria Garcia',
    dateOfBirth: new Date('1969-11-30'), // 55 years old
    gender: 'female',
    currentWeight: 68, // kg
    height: 160, // cm
    targetWeight: 68,
    activityLevel: 'lightly_active',
    primaryGoal: 'maintain',
    mealsPerDay: 3,
  },
  // 4. Young male, very active, weight loss
  {
    email: 'alex.chen@example.com',
    name: 'Alex Chen',
    dateOfBirth: new Date('1995-05-10'), // 29 years old
    gender: 'male',
    currentWeight: 95, // kg
    height: 178, // cm
    targetWeight: 80,
    activityLevel: 'very_active',
    primaryGoal: 'lose_weight',
    mealsPerDay: 4,
  },
  // 5. Non-binary, extremely active, muscle gain
  {
    email: 'jordan.taylor@example.com',
    name: 'Jordan Taylor',
    dateOfBirth: new Date('1992-09-18'), // 32 years old
    gender: 'other',
    currentWeight: 70, // kg
    height: 172, // cm
    targetWeight: 75,
    activityLevel: 'extremely_active',
    primaryGoal: 'gain_muscle',
    mealsPerDay: 6,
  },
  // 6. Petite female, sedentary, improve health
  {
    email: 'emma.wilson@example.com',
    name: 'Emma Wilson',
    dateOfBirth: new Date('2001-12-05'), // 23 years old
    gender: 'female',
    currentWeight: 52, // kg
    height: 155, // cm
    targetWeight: 52,
    activityLevel: 'sedentary',
    primaryGoal: 'improve_health',
    mealsPerDay: 3,
  },
  // 7. Tall male, moderately active, weight loss
  {
    email: 'david.brown@example.com',
    name: 'David Brown',
    dateOfBirth: new Date('1985-04-28'), // 39 years old
    gender: 'male',
    currentWeight: 105, // kg
    height: 193, // cm
    targetWeight: 90,
    activityLevel: 'moderately_active',
    primaryGoal: 'lose_weight',
    mealsPerDay: 4,
  },
  // 8. Middle-aged female, very active, maintain
  {
    email: 'lisa.anderson@example.com',
    name: 'Lisa Anderson',
    dateOfBirth: new Date('1978-08-14'), // 46 years old
    gender: 'female',
    currentWeight: 62, // kg
    height: 168, // cm
    targetWeight: 62,
    activityLevel: 'very_active',
    primaryGoal: 'maintain',
    mealsPerDay: 4,
  },
  // 9. Young male, lightly active, muscle gain
  {
    email: 'michael.lee@example.com',
    name: 'Michael Lee',
    dateOfBirth: new Date('2000-01-20'), // 24 years old
    gender: 'male',
    currentWeight: 65, // kg
    height: 175, // cm
    targetWeight: 73,
    activityLevel: 'lightly_active',
    primaryGoal: 'gain_muscle',
    mealsPerDay: 5,
  },
  // 10. Older male, sedentary, improve health
  {
    email: 'robert.johnson@example.com',
    name: 'Robert Johnson',
    dateOfBirth: new Date('1964-06-03'), // 60 years old
    gender: 'male',
    currentWeight: 88, // kg
    height: 176, // cm
    targetWeight: 88,
    activityLevel: 'sedentary',
    primaryGoal: 'improve_health',
    mealsPerDay: 3,
  },
];

async function seedScienceProfiles() {
  try {
    logger.info('Starting science profiles seed...');

    let createdCount = 0;
    let skippedCount = 0;

    for (const profile of seedProfiles) {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);

      let userId: number;

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        logger.info({ email: profile.email }, 'User already exists, updating settings');
        skippedCount++;
      } else {
        // Create user
        const [newUser] = await db
          .insert(users)
          .values({
            email: profile.email,
            name: profile.name,
            isActive: true,
          })
          .returning();

        userId = newUser.id;
        createdCount++;
        logger.info({ userId, email: profile.email }, 'User created');
      }

      // Calculate age from date of birth
      const age = Math.floor(
        (new Date().getTime() - profile.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );

      // Compute targets directly using science service methods (without DB lookup)
      const bmr = scienceService.calculateBMR(
        profile.currentWeight,
        profile.height,
        age,
        profile.gender
      );
      const tdee = scienceService.calculateTDEE(bmr, profile.activityLevel);
      const calorieTarget = scienceService.calculateCalorieTarget(tdee, profile.primaryGoal);
      const proteinTarget = scienceService.calculateProteinTarget(
        profile.currentWeight,
        profile.primaryGoal
      );
      const waterTarget = scienceService.calculateWaterTarget(profile.currentWeight);
      const weeklyRate = scienceService.calculateWeeklyRate(profile.primaryGoal);
      const projection = scienceService.calculateProjection(
        profile.currentWeight,
        profile.targetWeight,
        weeklyRate
      );

      const targets = {
        bmr,
        tdee,
        calorieTarget,
        proteinTarget,
        waterTarget,
        weeklyRate,
        estimatedWeeks: projection.estimatedWeeks,
        projectedDate: projection.projectedDate,
      };

      logger.info(
        {
          userId,
          email: profile.email,
          age,
          gender: profile.gender,
          weight: profile.currentWeight,
          height: profile.height,
          activityLevel: profile.activityLevel,
          goal: profile.primaryGoal,
          bmr: targets.bmr,
          tdee: targets.tdee,
          calorieTarget: targets.calorieTarget,
          proteinTarget: targets.proteinTarget,
          waterTarget: targets.waterTarget,
        },
        'Computed targets for profile'
      );

      // Upsert user settings
      await db
        .insert(userSettings)
        .values({
          userId,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          currentWeight: profile.currentWeight.toString(),
          height: profile.height.toString(),
          targetWeight: profile.targetWeight.toString(),
          targetDate: addWeeks(new Date(), targets.estimatedWeeks || 12),
          activityLevel: profile.activityLevel,
          primaryGoal: profile.primaryGoal,
          bmr: targets.bmr,
          tdee: targets.tdee,
          calorieTarget: targets.calorieTarget,
          proteinTarget: targets.proteinTarget,
          waterTarget: targets.waterTarget,
          mealsPerDay: profile.mealsPerDay,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            currentWeight: profile.currentWeight.toString(),
            height: profile.height.toString(),
            targetWeight: profile.targetWeight.toString(),
            targetDate: addWeeks(new Date(), targets.estimatedWeeks || 12),
            activityLevel: profile.activityLevel,
            primaryGoal: profile.primaryGoal,
            bmr: targets.bmr,
            tdee: targets.tdee,
            calorieTarget: targets.calorieTarget,
            proteinTarget: targets.proteinTarget,
            waterTarget: targets.waterTarget,
            mealsPerDay: profile.mealsPerDay,
            onboardingCompleted: true,
            onboardingCompletedAt: new Date(),
          },
        });

      // Upsert initial plan snapshot
      if (targets.estimatedWeeks && targets.projectedDate) {
        await db
          .insert(initialPlanSnapshot)
          .values({
            userId,
            startWeight: profile.currentWeight.toString(),
            targetWeight: profile.targetWeight.toString(),
            startDate: new Date(),
            targetDate: targets.projectedDate,
            weeklyWeightChangeRate: targets.weeklyRate.toString(),
            estimatedWeeks: targets.estimatedWeeks,
            projectedCompletionDate: targets.projectedDate,
            calorieTarget: targets.calorieTarget,
            proteinTarget: targets.proteinTarget,
            waterTarget: targets.waterTarget,
            primaryGoal: profile.primaryGoal,
            activityLevel: profile.activityLevel,
          })
          .onConflictDoUpdate({
            target: initialPlanSnapshot.userId,
            set: {
              targetWeight: profile.targetWeight.toString(),
              weeklyWeightChangeRate: targets.weeklyRate.toString(),
              estimatedWeeks: targets.estimatedWeeks,
              projectedCompletionDate: targets.projectedDate,
              calorieTarget: targets.calorieTarget,
              proteinTarget: targets.proteinTarget,
              waterTarget: targets.waterTarget,
              primaryGoal: profile.primaryGoal,
              activityLevel: profile.activityLevel,
            },
          });
      }

      logger.info({ userId, email: profile.email }, 'Profile seeded successfully');
    }

    logger.info(
      {
        totalProfiles: seedProfiles.length,
        created: createdCount,
        updated: skippedCount,
      },
      'Science profiles seed completed successfully'
    );

    // Print summary
    logger.info(
      {
        summary: {
          'Young female (sedentary, weight loss)': 'sarah.jones@example.com',
          'Middle-aged male (moderate, muscle gain)': 'john.smith@example.com',
          'Older female (light, maintain)': 'maria.garcia@example.com',
          'Young male (very active, weight loss)': 'alex.chen@example.com',
          'Non-binary (extreme, muscle gain)': 'jordan.taylor@example.com',
          'Petite female (sedentary, health)': 'emma.wilson@example.com',
          'Tall male (moderate, weight loss)': 'david.brown@example.com',
          'Active female (very active, maintain)': 'lisa.anderson@example.com',
          'Young male (light, muscle gain)': 'michael.lee@example.com',
          'Older male (sedentary, health)': 'robert.johnson@example.com',
        },
      },
      'Profile diversity summary'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to seed science profiles');
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run seed
void seedScienceProfiles();
