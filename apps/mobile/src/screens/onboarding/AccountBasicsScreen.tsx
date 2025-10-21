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
import { DatePicker } from '../../components/onboarding/DatePicker';
import { Picker, PickerItem } from '../../components/onboarding/Picker';

type Props = NativeStackScreenProps<any, 'AccountBasics'>;

const genderOptions: PickerItem[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export function AccountBasicsScreen({ navigation }: Props) {
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

  const form = getFormForStep('accountBasics');
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = form;

  // Watch form values
  const formValues = watch();

  // Set initial values from saved data
  useEffect(() => {
    if (data.dateOfBirth || data.gender) {
      form.reset({
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
      });
    }
  }, []);

  const onSubmit = async (formData: any) => {
    await saveStepData(formData);
    await goToNextStep();
    navigation.navigate('Goals');
  };

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  // Calculate max date (13 years ago)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13);

  // Calculate min date (120 years ago)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 120);

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
              Account Basics
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
              ]}
            >
              Let's start with some basic information about you
            </Text>

            <View style={styles.form}>
              <DatePicker
                control={control}
                name="dateOfBirth"
                label="Date of Birth"
                error={errors.dateOfBirth}
                required
                minimumDate={minDate}
                maximumDate={maxDate}
                placeholder="Select your birth date"
              />

              <Picker
                control={control}
                name="gender"
                label="Gender"
                items={genderOptions}
                error={errors.gender}
                required
                placeholder="Select your gender"
              />

              {formValues.dateOfBirth && (
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
                  <Text style={styles.infoIcon}>ℹ️</Text>
                  <Text
                    style={[
                      styles.infoText,
                      { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                    ]}
                  >
                    Your age helps us personalize your health recommendations and ensure age-appropriate goals.
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
}

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