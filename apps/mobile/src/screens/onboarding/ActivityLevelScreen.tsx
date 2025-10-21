import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { StepIndicator } from '../../components/onboarding/StepIndicator';
import { Picker, PickerItem } from '../../components/onboarding/Picker';

type Props = NativeStackScreenProps<any, 'ActivityLevel'>;

const activityLevelOptions: PickerItem[] = [
  {
    label: 'Sedentary',
    value: 'sedentary',
    description: 'Little to no exercise, desk job',
  },
  {
    label: 'Lightly Active',
    value: 'lightly_active',
    description: 'Light exercise 1-3 days per week',
  },
  {
    label: 'Moderately Active',
    value: 'moderately_active',
    description: 'Moderate exercise 3-5 days per week',
  },
  {
    label: 'Very Active',
    value: 'very_active',
    description: 'Hard exercise 6-7 days per week',
  },
  {
    label: 'Extremely Active',
    value: 'extremely_active',
    description: 'Very hard exercise & physical job',
  },
];

export function ActivityLevelScreen({ navigation }: Props) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const {
    stepIndex,
    totalSteps,
    data,
    getFormForStep,
    saveStepData,
    goToNextStep,
    goToPreviousStep,
  } = useOnboarding();

  const form = getFormForStep('activityLevel');
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = form;

  const selectedActivityLevel = watch('activityLevel');

  // Set initial values from saved data
  useEffect(() => {
    if (data.activityLevel) {
      form.reset({
        activityLevel: data.activityLevel,
      });
    }
  }, []);

  const onSubmit = async (formData: any) => {
    await saveStepData(formData);
    await goToNextStep();
    navigation.navigate('Preferences');
  };

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  const getActivityLevelInfo = () => {
    switch (selectedActivityLevel) {
      case 'sedentary':
        return {
          icon: '🪑',
          tips: [
            'Start with small, achievable goals',
            'Consider walking meetings or standing desk',
            'Take regular breaks to move around',
          ],
        };
      case 'lightly_active':
        return {
          icon: '🚶',
          tips: [
            'Great foundation to build on',
            'Try adding one more active day per week',
            'Mix cardio with strength training',
          ],
        };
      case 'moderately_active':
        return {
          icon: '🏃',
          tips: [
            'You\'re on the right track',
            'Focus on consistency and progression',
            'Don\'t forget rest and recovery',
          ],
        };
      case 'very_active':
        return {
          icon: '💪',
          tips: [
            'Excellent activity level',
            'Ensure proper nutrition and hydration',
            'Listen to your body to avoid overtraining',
          ],
        };
      case 'extremely_active':
        return {
          icon: '🏋️',
          tips: [
            'Elite level activity',
            'Recovery is crucial at this level',
            'Consider working with professionals',
          ],
        };
      default:
        return null;
    }
  };

  const activityInfo = getActivityLevelInfo();

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.dark.background : colors.light.background },
      ]}
    >
      <StepIndicator
        currentStep={stepIndex}
        totalSteps={totalSteps}
        stepLabels={[
          'Welcome',
          'Account',
          'Goals',
          'Health',
          'Activity',
          'Preferences',
          'Partners',
          'Review',
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              { color: isDark ? colors.dark.text : colors.light.text },
            ]}
            accessibilityRole="header"
          >
            Activity Level
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
            ]}
          >
            How active are you currently? Be honest - we'll help you improve from wherever you're starting.
          </Text>

          <View style={styles.form}>
            <Picker
              control={control}
              name="activityLevel"
              label="Current Activity Level"
              items={activityLevelOptions}
              error={errors.activityLevel}
              required
              placeholder="Select your activity level"
            />

            {activityInfo && (
              <View
                style={[
                  styles.activityCard,
                  {
                    backgroundColor: isDark
                      ? colors.dark.inputBackground
                      : colors.light.inputBackground,
                    borderColor: isDark ? colors.dark.border : colors.light.border,
                  },
                ]}
              >
                <View style={styles.activityHeader}>
                  <Text style={styles.activityIcon}>{activityInfo.icon}</Text>
                  <Text
                    style={[
                      styles.activityTitle,
                      { color: isDark ? colors.dark.text : colors.light.text },
                    ]}
                  >
                    Tips for your level
                  </Text>
                </View>
                {activityInfo.tips.map((tip, index) => (
                  <View key={index} style={styles.tipRow}>
                    <Text
                      style={[
                        styles.tipBullet,
                        { color: colors.light.primary },
                      ]}
                    >
                      •
                    </Text>
                    <Text
                      style={[
                        styles.tipText,
                        { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                      ]}
                    >
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: isDark
                    ? colors.dark.inputBackground
                    : colors.light.inputBackground,
                  borderColor: isDark ? colors.dark.border : colors.light.border,
                },
              ]}
            >
              <Text style={styles.infoIcon}>📈</Text>
              <Text
                style={[
                  styles.infoText,
                  { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                ]}
              >
                We'll use your activity level to calculate calorie needs and create appropriate workout recommendations. You can always update this as you progress.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: isDark ? colors.dark.border : colors.light.border },
        ]}
      >
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleBack}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.secondaryButtonText,
              { color: isDark ? colors.dark.text : colors.light.text },
            ]}
          >
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: isValid
                ? colors.light.primary
                : isDark
                ? colors.dark.inputBackground
                : colors.light.inputBackground,
            },
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid}
          accessibilityLabel="Continue"
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid }}
        >
          <Text
            style={[
              styles.primaryButtonText,
              {
                color: isValid
                  ? 'white'
                  : isDark
                  ? colors.dark.textDisabled
                  : colors.light.textDisabled,
              },
            ]}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 32,
  },
  form: {
    flex: 1,
  },
  activityCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: '600',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});