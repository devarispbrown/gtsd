/**
 * Health and fitness calculation utilities
 * Uses Mifflin-St Jeor Equation for BMR and Harris-Benedict for activity multipliers
 */

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
export type Goal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';

interface HealthMetrics {
  weight: number; // kg
  height: number; // cm
  age: number; // years
  gender: Gender;
  activityLevel: ActivityLevel;
}

interface CalculatedTargets {
  bmr: number; // Basal Metabolic Rate
  tdee: number; // Total Daily Energy Expenditure
  calorieTarget: number;
  proteinTarget: number; // grams
  waterTarget: number; // ml
}

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 * More accurate than Harris-Benedict for modern populations
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: Gender
): number {
  // Mifflin-St Jeor: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + s
  // s = +5 for males, -161 for females
  const baseBMR = 10 * weight + 6.25 * height - 5 * age;

  let genderOffset: number;
  if (gender === 'male') {
    genderOffset = 5;
  } else if (gender === 'female') {
    genderOffset = -161;
  } else {
    // For 'other', use average of male and female
    genderOffset = (5 + -161) / 2;
  }

  return Math.round(baseBMR + genderOffset);
}

/**
 * Get activity multiplier for TDEE calculation
 */
export function getActivityMultiplier(activityLevel: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2, // Little or no exercise
    lightly_active: 1.375, // Light exercise 1-3 days/week
    moderately_active: 1.55, // Moderate exercise 3-5 days/week
    very_active: 1.725, // Hard exercise 6-7 days/week
    extremely_active: 1.9, // Very hard exercise, physical job, training twice per day
  };

  return multipliers[activityLevel];
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * getActivityMultiplier(activityLevel));
}

/**
 * Calculate calorie target based on goal
 */
export function calculateCalorieTarget(tdee: number, goal: Goal): number {
  switch (goal) {
    case 'lose_weight':
      // 500 calorie deficit per day = ~0.5kg per week weight loss
      return Math.round(tdee - 500);
    case 'gain_muscle':
      // 300-500 calorie surplus for lean muscle gain
      return Math.round(tdee + 400);
    case 'maintain':
    case 'improve_health':
      return tdee;
    default:
      return tdee;
  }
}

/**
 * Calculate protein target
 * General guidelines: 1.6-2.2g per kg for muscle building, 0.8-1.2g for weight loss/maintenance
 */
export function calculateProteinTarget(weight: number, goal: Goal): number {
  let proteinPerKg: number;

  switch (goal) {
    case 'gain_muscle':
      proteinPerKg = 2.0; // Higher protein for muscle building
      break;
    case 'lose_weight':
      proteinPerKg = 1.8; // Higher protein to preserve muscle during weight loss
      break;
    case 'maintain':
    case 'improve_health':
      proteinPerKg = 1.2;
      break;
    default:
      proteinPerKg = 1.2;
  }

  return Math.round(weight * proteinPerKg);
}

/**
 * Calculate water target
 * General guideline: 35ml per kg of body weight
 */
export function calculateWaterTarget(weight: number): number {
  return Math.round(weight * 35);
}

/**
 * Calculate all health targets at once
 */
export function calculateHealthTargets(
  metrics: HealthMetrics,
  goal: Goal
): CalculatedTargets {
  const bmr = calculateBMR(metrics.weight, metrics.height, metrics.age, metrics.gender);
  const tdee = calculateTDEE(bmr, metrics.activityLevel);
  const calorieTarget = calculateCalorieTarget(tdee, goal);
  const proteinTarget = calculateProteinTarget(metrics.weight, goal);
  const waterTarget = calculateWaterTarget(metrics.weight);

  return {
    bmr,
    tdee,
    calorieTarget,
    proteinTarget,
    waterTarget,
  };
}

/**
 * Calculate weight change projection
 */
export function calculateWeightProjection(
  currentWeight: number,
  targetWeight: number,
  goal: Goal
): {
  weeklyRate: number; // kg per week
  estimatedWeeks: number;
  projectedDate: Date;
} {
  const weightDifference = Math.abs(targetWeight - currentWeight);

  // Safe weight change rates
  let weeklyRate: number;
  switch (goal) {
    case 'lose_weight':
      // Safe weight loss: 0.5-1kg per week (based on 500-1000 cal deficit)
      weeklyRate = 0.5;
      break;
    case 'gain_muscle':
      // Safe muscle gain: 0.25-0.5kg per week
      weeklyRate = 0.4;
      break;
    case 'maintain':
    case 'improve_health':
      weeklyRate = 0;
      break;
    default:
      weeklyRate = 0;
  }

  const estimatedWeeks = weeklyRate > 0 ? Math.ceil(weightDifference / weeklyRate) : 0;
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + estimatedWeeks * 7);

  return {
    weeklyRate: goal === 'lose_weight' ? -weeklyRate : weeklyRate,
    estimatedWeeks,
    projectedDate,
  };
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
}