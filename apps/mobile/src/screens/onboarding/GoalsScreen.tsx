import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { StepIndicator } from '../../components/onboarding/StepIndicator';
import { FormInput } from '../../components/onboarding/FormInput';
import { DatePicker } from '../../components/onboarding/DatePicker';

type Props = NativeStackScreenProps<any, 'Goals'>;

export const GoalsScreen: React.FC<Props> = ({ navigation }) => {
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

  const form = getFormForStep('goals');
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = form;

  const formValues = watch();

  // Set initial values from saved data
  useEffect(() => {
    if (data.primaryGoal || data.targetWeight || data.targetDate) {
      form.reset({
        primaryGoal: data.primaryGoal,
        targetWeight: data.targetWeight,
        targetDate: data.targetDate,
      });
    }
  }, []);

  const onSubmit = async (formData: any) => {
    await saveStepData(formData);
    await goToNextStep();
    navigation.navigate('HealthMetrics');
  };

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  // Calculate minimum target date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  // Calculate maximum target date (2 years from now)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 2);

  // Quick goal suggestions
  const goalSuggestions = [
    'Lose weight and improve fitness',
    'Build muscle and strength',
    'Improve cardiovascular health',
    'Maintain healthy lifestyle',
    'Reduce stress and improve wellbeing',
  ];

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.dark.background : colors.light.background },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text
              style={[
                styles.title,
                { color: isDark ? colors.dark.text : colors.light.text },
              ]}
              accessibilityRole="header"
            >
              Your Health Goals
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
              ]}
            >
              What would you like to achieve with GTSD?
            </Text>

            <View style={styles.form}>
              <FormInput
                control={control}
                name="primaryGoal"
                label="Primary Goal"
                error={errors.primaryGoal}
                required
                placeholder="e.g., Lose 20 pounds and run a 5K"
                multiline
                numberOfLines={3}
                maxLength={200}
                helperText="Be specific about what you want to achieve"
              />

              {goalSuggestions.length > 0 && !formValues.primaryGoal && (
                <View style={styles.suggestions}>
                  <Text
                    style={[
                      styles.suggestionsLabel,
                      { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                    ]}
                  >
                    Quick suggestions:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.suggestionsList}
                  >
                    {goalSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.suggestionChip,
                          {
                            backgroundColor: isDark
                              ? colors.dark.inputBackground
                              : colors.light.inputBackground,
                            borderColor: isDark ? colors.dark.border : colors.light.border,
                          },
                        ]}
                        onPress={() => setValue('primaryGoal', suggestion, { shouldValidate: true })}
                      >
                        <Text
                          style={[
                            styles.suggestionText,
                            { color: isDark ? colors.dark.text : colors.light.text },
                          ]}
                        >
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <FormInput
                control={control}
                name="targetWeight"
                label="Target Weight (kg)"
                error={errors.targetWeight}
                required
                placeholder="Enter target weight"
                keyboardType="numeric"
                helperText="Your ideal weight goal"
              />

              <DatePicker
                control={control}
                name="targetDate"
                label="Target Date"
                error={errors.targetDate}
                required
                minimumDate={minDate}
                maximumDate={maxDate}
                placeholder="When do you want to achieve this?"
              />

              {formValues.targetDate && (
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
                  <Text style={styles.infoIcon}>💡</Text>
                  <Text
                    style={[
                      styles.infoText,
                      { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                    ]}
                  >
                    Setting realistic timelines helps create sustainable habits. We'll help you break this down into achievable milestones.
                  </Text>
                </View>
              )}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  suggestions: {
    marginTop: -12,
    marginBottom: 20,
  },
  suggestionsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  suggestionsList: {
    flexDirection: 'row',
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
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