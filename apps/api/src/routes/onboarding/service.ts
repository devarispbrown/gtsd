import { db } from '../../db/connection';
import { users, userSettings, partners, initialPlanSnapshot } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../../middleware/error';
import {
  calculateHealthTargets,
  calculateWeightProjection,
  calculateAge,
  type Goal,
  type ActivityLevel,
  type Gender,
} from '../../utils/health-calculations';
import type { OnboardingInput } from './schemas';

export interface OnboardingResult {
  userId: number;
  settings: {
    bmr: number;
    tdee: number;
    calorieTarget: number;
    proteinTarget: number;
    waterTarget: number;
  };
  projection: {
    weeklyRate: number;
    estimatedWeeks: number;
    projectedDate: Date;
  };
}

export class OnboardingService {
  /**
   * Complete onboarding process for a user
   */
  async completeOnboarding(userId: number, input: OnboardingInput): Promise<OnboardingResult> {
    // Calculate age from date of birth
    const dateOfBirth = new Date(input.dateOfBirth);
    const age = calculateAge(dateOfBirth);

    // Normalize gender for health calculations
    // If custom gender (not male/female/other), treat as "other" for BMR/TDEE calculations
    const normalizedGender: Gender =
      input.gender === 'male' || input.gender === 'female' || input.gender === 'other'
        ? input.gender
        : 'other';

    // Calculate health targets
    const targets = calculateHealthTargets(
      {
        weight: input.currentWeight,
        height: input.height,
        age,
        gender: normalizedGender,
        activityLevel: input.activityLevel as ActivityLevel,
      },
      input.primaryGoal as Goal
    );

    // Calculate weight projection
    const projection = calculateWeightProjection(
      input.currentWeight,
      input.targetWeight,
      input.primaryGoal as Goal
    );

    // Start transaction
    await db.transaction(async (tx) => {
      // 1. Upsert user settings
      await tx
        .insert(userSettings)
        .values({
          userId,
          dateOfBirth,
          gender: input.gender,
          primaryGoal: input.primaryGoal,
          targetWeight: input.targetWeight.toFixed(2),
          targetDate: new Date(input.targetDate),
          activityLevel: input.activityLevel,
          currentWeight: input.currentWeight.toFixed(2),
          height: input.height.toFixed(2),
          bmr: targets.bmr,
          tdee: targets.tdee,
          calorieTarget: targets.calorieTarget,
          proteinTarget: targets.proteinTarget,
          waterTarget: targets.waterTarget,
          dietaryPreferences: input.dietaryPreferences,
          allergies: input.allergies,
          mealsPerDay: input.mealsPerDay,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            dateOfBirth,
            gender: input.gender,
            primaryGoal: input.primaryGoal,
            targetWeight: input.targetWeight.toFixed(2),
            targetDate: new Date(input.targetDate),
            activityLevel: input.activityLevel,
            currentWeight: input.currentWeight.toFixed(2),
            height: input.height.toFixed(2),
            bmr: targets.bmr,
            tdee: targets.tdee,
            calorieTarget: targets.calorieTarget,
            proteinTarget: targets.proteinTarget,
            waterTarget: targets.waterTarget,
            dietaryPreferences: input.dietaryPreferences,
            allergies: input.allergies,
            mealsPerDay: input.mealsPerDay,
            onboardingCompleted: true,
            onboardingCompletedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      // 2. Create initial plan snapshot
      await tx
        .insert(initialPlanSnapshot)
        .values({
          userId,
          startWeight: input.currentWeight.toFixed(2),
          targetWeight: input.targetWeight.toFixed(2),
          startDate: new Date(),
          targetDate: new Date(input.targetDate),
          weeklyWeightChangeRate: projection.weeklyRate.toFixed(2),
          estimatedWeeks: projection.estimatedWeeks,
          projectedCompletionDate: projection.projectedDate,
          calorieTarget: targets.calorieTarget,
          proteinTarget: targets.proteinTarget,
          waterTarget: targets.waterTarget,
          primaryGoal: input.primaryGoal,
          activityLevel: input.activityLevel,
        })
        .onConflictDoUpdate({
          target: initialPlanSnapshot.userId,
          set: {
            startWeight: input.currentWeight.toString(),
            targetWeight: input.targetWeight.toString(),
            startDate: new Date(),
            targetDate: new Date(input.targetDate),
            weeklyWeightChangeRate: projection.weeklyRate.toString(),
            estimatedWeeks: projection.estimatedWeeks,
            projectedCompletionDate: projection.projectedDate,
            calorieTarget: targets.calorieTarget,
            proteinTarget: targets.proteinTarget,
            waterTarget: targets.waterTarget,
            primaryGoal: input.primaryGoal,
            activityLevel: input.activityLevel,
          },
        });

      // 3. Add partners (batch insert to avoid N+1 query)
      if (input.partners && input.partners.length > 0) {
        // Delete existing partners for this user
        await tx.delete(partners).where(eq(partners.userId, userId));

        // Batch insert all partners in a single query
        await tx.insert(partners).values(
          input.partners.map((partner) => ({
            userId,
            name: partner.name,
            email: partner.email || null,
            phone: partner.phone || null,
            relationship: partner.relationship || null,
          }))
        );
      }
    });

    return {
      userId,
      settings: targets,
      projection,
    };
  }

  /**
   * Get "How GTSD Works" summary for a user
   */
  async getHowItWorksSummary(userId: number) {
    // Get user settings and initial plan
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!settings) {
      throw new AppError(404, 'User settings not found. Please complete onboarding first.');
    }

    const [snapshot] = await db
      .select()
      .from(initialPlanSnapshot)
      .where(eq(initialPlanSnapshot.userId, userId))
      .limit(1);

    if (!snapshot) {
      throw new AppError(404, 'Initial plan snapshot not found. Please complete onboarding first.');
    }

    // Get user info
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Calculate age
    const age = settings.dateOfBirth ? calculateAge(new Date(settings.dateOfBirth)) : null;

    // Build explanation strings
    const bmrExplanation = this.getBMRExplanation(settings.gender || 'other', age || 0);
    const tdeeExplanation = this.getTDEEExplanation(settings.activityLevel || 'moderate');
    const goalExplanation = this.getGoalExplanation(settings.primaryGoal || 'maintain');
    const timelineExplanation = this.getTimelineExplanation(
      parseFloat(settings.currentWeight || '0'),
      parseFloat(settings.targetWeight || '0'),
      snapshot.estimatedWeeks || 0,
      settings.primaryGoal || 'maintain'
    );

    return {
      user: {
        name: user.name,
        email: user.email,
      },
      currentMetrics: {
        age,
        gender: settings.gender,
        weight: parseFloat(settings.currentWeight || '0'),
        height: parseFloat(settings.height || '0'),
        activityLevel: settings.activityLevel,
      },
      goals: {
        primaryGoal: settings.primaryGoal,
        targetWeight: parseFloat(settings.targetWeight || '0'),
        targetDate: settings.targetDate,
      },
      calculations: {
        bmr: {
          value: settings.bmr,
          explanation: bmrExplanation,
          formula: 'Mifflin-St Jeor Equation',
        },
        tdee: {
          value: settings.tdee,
          explanation: tdeeExplanation,
          activityMultiplier: this.getActivityMultiplier(settings.activityLevel || 'moderate'),
        },
        targets: {
          calories: {
            value: settings.calorieTarget,
            explanation: goalExplanation,
          },
          protein: {
            value: settings.proteinTarget,
            unit: 'grams/day',
            explanation: `Protein helps preserve muscle mass and keeps you full longer. Your target is based on your weight and goal.`,
          },
          water: {
            value: settings.waterTarget,
            unit: 'ml/day',
            explanation: `Staying hydrated supports metabolism and helps control appetite. Target is ~35ml per kg of body weight.`,
          },
        },
      },
      projection: {
        startWeight: parseFloat(snapshot.startWeight),
        targetWeight: parseFloat(snapshot.targetWeight),
        weeklyRate: parseFloat(snapshot.weeklyWeightChangeRate || '0'),
        estimatedWeeks: snapshot.estimatedWeeks,
        projectedDate: snapshot.projectedCompletionDate,
        explanation: timelineExplanation,
      },
      howItWorks: {
        step1: {
          title: 'Track Your Progress',
          description: `We start with your BMR of ${settings.bmr} calories - the energy your body needs at rest. Based on your ${settings.activityLevel} activity level, your TDEE is ${settings.tdee} calories per day.`,
        },
        step2: {
          title: 'Create a Sustainable Deficit/Surplus',
          description: `To ${this.getGoalVerb(settings.primaryGoal || 'maintain')}, we've set your daily target to ${settings.calorieTarget} calories. This creates a safe, sustainable pace for reaching your goal.`,
        },
        step3: {
          title: 'Stay Accountable',
          description: `With proper nutrition (${settings.proteinTarget}g protein, ${settings.waterTarget}ml water daily) and accountability partners, you'll reach your goal in approximately ${snapshot.estimatedWeeks} weeks.`,
        },
        step4: {
          title: 'Adjust as Needed',
          description: `As you progress, your metabolism adapts. We'll help you adjust your targets to keep making progress safely and sustainably.`,
        },
      },
    };
  }

  private getBMRExplanation(gender: string, age: number): string {
    return `Your Basal Metabolic Rate (BMR) is the number of calories your body needs to function at rest - breathing, circulating blood, and maintaining body temperature. As a ${age}-year-old ${gender}, this is calculated using the Mifflin-St Jeor equation, which is the most accurate for modern populations.`;
  }

  private getTDEEExplanation(activityLevel: string): string {
    const descriptions: Record<string, string> = {
      sedentary: 'little to no exercise',
      light: 'light exercise 1-3 days/week',
      moderate: 'moderate exercise 3-5 days/week',
      active: 'hard exercise 6-7 days/week',
      very_active: 'very hard exercise and physical job',
    };

    return `Your Total Daily Energy Expenditure (TDEE) accounts for your activity level (${descriptions[activityLevel] || activityLevel}). This is your BMR multiplied by an activity factor to estimate total daily calorie burn.`;
  }

  private getGoalExplanation(goal: string): string {
    const explanations: Record<string, string> = {
      lose_weight: `To lose weight safely, we've created a 500-calorie daily deficit. This targets approximately 0.5kg of fat loss per week - a sustainable rate that preserves muscle mass and keeps your metabolism healthy.`,
      gain_muscle: `To build muscle, we've added a 400-calorie daily surplus. This provides extra energy for muscle growth while minimizing fat gain. Combined with strength training, this supports lean muscle development.`,
      maintain: `To maintain your current weight, your calorie target matches your TDEE. This keeps your weight stable while providing optimal nutrition for health and performance.`,
      improve_health: `Your calorie target is set to maintain your weight while focusing on nutrition quality. This supports overall health improvements without the stress of weight change.`,
    };

    return explanations[goal] || explanations.maintain;
  }

  private getTimelineExplanation(
    current: number,
    target: number,
    weeks: number,
    goal: string
  ): string {
    const difference = Math.abs(target - current);
    const direction = goal === 'lose_weight' ? 'lose' : goal === 'gain_muscle' ? 'gain' : 'reach';

    return `To ${direction} ${difference.toFixed(1)}kg safely, we estimate ${weeks} weeks at your current activity level and calorie target. This timeline is based on sustainable rates: 0.5kg/week for weight loss, 0.4kg/week for muscle gain.`;
  }

  private getActivityMultiplier(activityLevel: string): number {
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    return multipliers[activityLevel] || 1.55;
  }

  private getGoalVerb(goal: string): string {
    const verbs: Record<string, string> = {
      lose_weight: 'lose weight',
      gain_muscle: 'gain muscle',
      maintain: 'maintain your weight',
      improve_health: 'improve your health',
    };

    return verbs[goal] || 'reach your goal';
  }
}
