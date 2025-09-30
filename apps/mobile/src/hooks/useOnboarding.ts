import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  OnboardingData,
  OnboardingStep,
  OnboardingProgress,
  OnboardingApiRequest,
} from '../types/onboarding';
import {
  accountBasicsSchema,
  goalsSchema,
  healthMetricsSchema,
  activityLevelSchema,
  preferencesSchema,
  partnersSchema,
  completeOnboardingSchema,
  validateStep,
} from '../utils/onboardingValidation';

const STORAGE_KEY = '@gtsd:onboarding:progress';

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'accountBasics',
  'goals',
  'healthMetrics',
  'activityLevel',
  'preferences',
  'partners',
  'review',
];

interface UseOnboardingReturn {
  currentStep: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  data: Partial<OnboardingData>;
  completedSteps: OnboardingStep[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Navigation
  goToNextStep: () => Promise<void>;
  goToPreviousStep: () => void;
  goToStep: (step: OnboardingStep) => void;

  // Data management
  saveStepData: (stepData: Partial<OnboardingData>) => Promise<void>;
  clearProgress: () => Promise<void>;
  submitOnboarding: () => Promise<{ success: boolean; error?: string }>;

  // Form helpers
  getFormForStep: (step: OnboardingStep) => UseFormReturn<any>;
  canNavigateForward: () => boolean;
}

export const useOnboarding = (): UseOnboardingReturn => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form instances for each step
  const accountBasicsForm = useForm({
    resolver: zodResolver(accountBasicsSchema),
    mode: 'onChange',
  });

  const goalsForm = useForm({
    resolver: zodResolver(goalsSchema),
    mode: 'onChange',
  });

  const healthMetricsForm = useForm({
    resolver: zodResolver(healthMetricsSchema),
    mode: 'onChange',
  });

  const activityLevelForm = useForm({
    resolver: zodResolver(activityLevelSchema),
    mode: 'onChange',
  });

  const preferencesForm = useForm({
    resolver: zodResolver(preferencesSchema),
    mode: 'onChange',
    defaultValues: {
      dietaryPreferences: ['none'],
      allergies: [],
      mealsPerDay: 3,
    },
  });

  const partnersForm = useForm({
    resolver: zodResolver(partnersSchema),
    mode: 'onChange',
    defaultValues: {
      partners: [],
    },
  });

  // Load saved progress on mount
  useEffect(() => {
    loadProgress();
  }, []);

  // Load progress from AsyncStorage
  const loadProgress = async () => {
    try {
      setIsLoading(true);
      const savedProgress = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedProgress) {
        const progress: OnboardingProgress = JSON.parse(savedProgress);

        // Convert date strings back to Date objects
        if (progress.data.dateOfBirth) {
          progress.data.dateOfBirth = new Date(progress.data.dateOfBirth as any);
        }
        if (progress.data.targetDate) {
          progress.data.targetDate = new Date(progress.data.targetDate as any);
        }

        setCurrentStep(progress.currentStep);
        setCompletedSteps(progress.completedSteps);
        setData(progress.data);

        // Update form default values
        updateFormDefaults(progress.data);
      }
    } catch (err) {
      console.error('Error loading onboarding progress:', err);
      setError('Failed to load saved progress');
    } finally {
      setIsLoading(false);
    }
  };

  // Save progress to AsyncStorage
  const saveProgress = async (
    updatedData: Partial<OnboardingData>,
    newCompletedSteps?: OnboardingStep[]
  ) => {
    try {
      const progress: OnboardingProgress = {
        currentStep,
        completedSteps: newCompletedSteps || completedSteps,
        data: updatedData,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      console.error('Error saving onboarding progress:', err);
      setError('Failed to save progress');
    }
  };

  // Update form default values when data changes
  const updateFormDefaults = (newData: Partial<OnboardingData>) => {
    if (newData.dateOfBirth || newData.gender) {
      accountBasicsForm.reset({
        dateOfBirth: newData.dateOfBirth,
        gender: newData.gender,
      });
    }
    if (newData.primaryGoal || newData.targetWeight || newData.targetDate) {
      goalsForm.reset({
        primaryGoal: newData.primaryGoal,
        targetWeight: newData.targetWeight,
        targetDate: newData.targetDate,
      });
    }
    if (newData.currentWeight || newData.height) {
      healthMetricsForm.reset({
        currentWeight: newData.currentWeight,
        height: newData.height,
      });
    }
    if (newData.activityLevel) {
      activityLevelForm.reset({
        activityLevel: newData.activityLevel,
      });
    }
    if (newData.dietaryPreferences || newData.allergies || newData.mealsPerDay) {
      preferencesForm.reset({
        dietaryPreferences: newData.dietaryPreferences || ['none'],
        allergies: newData.allergies || [],
        mealsPerDay: newData.mealsPerDay || 3,
      });
    }
    if (newData.partners) {
      partnersForm.reset({
        partners: newData.partners || [],
      });
    }
  };

  // Get form for current step
  const getFormForStep = (step: OnboardingStep): UseFormReturn<any> => {
    switch (step) {
      case 'accountBasics':
        return accountBasicsForm;
      case 'goals':
        return goalsForm;
      case 'healthMetrics':
        return healthMetricsForm;
      case 'activityLevel':
        return activityLevelForm;
      case 'preferences':
        return preferencesForm;
      case 'partners':
        return partnersForm;
      default:
        return accountBasicsForm; // Default fallback
    }
  };

  // Save step data
  const saveStepData = async (stepData: Partial<OnboardingData>) => {
    const updatedData = { ...data, ...stepData };
    setData(updatedData);

    // Mark current step as completed if not already
    const newCompletedSteps = completedSteps.includes(currentStep)
      ? completedSteps
      : [...completedSteps, currentStep];
    setCompletedSteps(newCompletedSteps);

    await saveProgress(updatedData, newCompletedSteps);
  };

  // Navigation functions
  const goToNextStep = async () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      const nextStep = STEP_ORDER[currentIndex + 1];
      setCurrentStep(nextStep);
      await saveProgress(data);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  const goToStep = (step: OnboardingStep) => {
    setCurrentStep(step);
  };

  const canNavigateForward = (): boolean => {
    if (currentStep === 'welcome' || currentStep === 'review') {
      return true;
    }

    const form = getFormForStep(currentStep);
    return form.formState.isValid;
  };

  // Clear all progress
  const clearProgress = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setData({});
      setCompletedSteps([]);
      setCurrentStep('welcome');
      // Reset all forms
      accountBasicsForm.reset();
      goalsForm.reset();
      healthMetricsForm.reset();
      activityLevelForm.reset();
      preferencesForm.reset({ dietaryPreferences: ['none'], allergies: [], mealsPerDay: 3 });
      partnersForm.reset({ partners: [] });
    } catch (err) {
      console.error('Error clearing progress:', err);
      setError('Failed to clear progress');
    }
  };

  // Submit onboarding data to API
  const submitOnboarding = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validate complete data
      const validationResult = completeOnboardingSchema.safeParse(data);
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        return { success: false, error: firstError.message };
      }

      // Prepare API request
      const apiData: OnboardingApiRequest = {
        dateOfBirth: data.dateOfBirth!.toISOString(),
        gender: data.gender!,
        primaryGoal: data.primaryGoal!,
        targetWeight: data.targetWeight!,
        targetDate: data.targetDate!.toISOString(),
        currentWeight: data.currentWeight!,
        height: data.height!,
        activityLevel: data.activityLevel!,
        dietaryPreferences: data.dietaryPreferences!,
        allergies: data.allergies!,
        mealsPerDay: data.mealsPerDay!,
        partners: data.partners!.map(p => ({
          name: p.name,
          email: p.email,
          phone: p.phone,
          relationship: p.relationship,
        })),
      };

      // TODO: Replace with actual API endpoint
      const response = await fetch('http://localhost:3000/v1/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token if needed
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit onboarding');
      }

      // Clear saved progress on successful submission
      await clearProgress();

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit onboarding';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return {
    currentStep,
    stepIndex,
    totalSteps,
    progress,
    data,
    completedSteps,
    isLoading,
    isSubmitting,
    error,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    saveStepData,
    clearProgress,
    submitOnboarding,
    getFormForStep,
    canNavigateForward,
  };
};