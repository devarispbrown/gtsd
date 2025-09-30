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

type Props = NativeStackScreenProps<any, 'HealthMetrics'>;

export const HealthMetricsScreen: React.FC<Props> = ({ navigation }) => {
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

  const form = getFormForStep('healthMetrics');
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = form;

  const formValues = watch();

  // Set initial values from saved data
  useEffect(() => {
    if (data.currentWeight || data.height) {
      form.reset({
        currentWeight: data.currentWeight,
        height: data.height,
      });
    }
  }, []);

  const onSubmit = async (formData: any) => {
    await saveStepData(formData);
    await goToNextStep();
    navigation.navigate('ActivityLevel');
  };

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  // Calculate BMI if both values are present
  const calculateBMI = () => {
    if (formValues.currentWeight && formValues.height) {
      const heightInMeters = formValues.height / 100;
      const bmi = formValues.currentWeight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: colors.light.warning };
    if (bmi < 25) return { label: 'Normal weight', color: colors.light.success };
    if (bmi < 30) return { label: 'Overweight', color: colors.light.warning };
    return { label: 'Obese', color: colors.light.error };
  };

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;

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
              Health Metrics
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
              ]}
            >
              Your current health measurements help us personalize your plan
            </Text>

            <View style={styles.form}>
              <FormInput
                control={control}
                name="currentWeight"
                label="Current Weight (kg)"
                error={errors.currentWeight}
                required
                placeholder="Enter your current weight"
                keyboardType="numeric"
                helperText="Be honest - this is your starting point"
              />

              <FormInput
                control={control}
                name="height"
                label="Height (cm)"
                error={errors.height}
                required
                placeholder="Enter your height"
                keyboardType="numeric"
                helperText="Your height in centimeters"
              />

              {bmi && (
                <View
                  style={[
                    styles.bmiContainer,
                    {
                      backgroundColor: isDark
                        ? colors.dark.inputBackground
                        : colors.light.inputBackground,
                      borderColor: isDark ? colors.dark.border : colors.light.border,
                    },
                  ]}
                >
                  <View style={styles.bmiHeader}>
                    <Text
                      style={[
                        styles.bmiLabel,
                        { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                      ]}
                    >
                      Your BMI
                    </Text>
                    <View style={styles.bmiValue}>
                      <Text
                        style={[
                          styles.bmiBig,
                          { color: isDark ? colors.dark.text : colors.light.text },
                        ]}
                      >
                        {bmi}
                      </Text>
                      {bmiCategory && (
                        <Text
                          style={[
                            styles.bmiCategory,
                            { color: bmiCategory.color },
                          ]}
                        >
                          {bmiCategory.label}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.bmiScale}>
                    <View style={[styles.bmiScaleBar, styles.bmiUnderweight]} />
                    <View style={[styles.bmiScaleBar, styles.bmiNormal]} />
                    <View style={[styles.bmiScaleBar, styles.bmiOverweight]} />
                    <View style={[styles.bmiScaleBar, styles.bmiObese]} />
                  </View>

                  <View style={styles.bmiLegend}>
                    <Text style={[styles.bmiLegendText, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                      &lt;18.5
                    </Text>
                    <Text style={[styles.bmiLegendText, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                      18.5-24.9
                    </Text>
                    <Text style={[styles.bmiLegendText, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                      25-29.9
                    </Text>
                    <Text style={[styles.bmiLegendText, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                      30+
                    </Text>
                  </View>
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
                <Text style={styles.infoIcon}>🔒</Text>
                <Text
                  style={[
                    styles.infoText,
                    { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                  ]}
                >
                  Your health data is private and secure. We use it only to provide personalized recommendations.
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
  bmiContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 20,
  },
  bmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bmiLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  bmiValue: {
    alignItems: 'flex-end',
  },
  bmiBig: {
    fontSize: 32,
    fontWeight: '700',
  },
  bmiCategory: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  bmiScale: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  bmiScaleBar: {
    flex: 1,
  },
  bmiUnderweight: {
    backgroundColor: colors.light.warning,
  },
  bmiNormal: {
    backgroundColor: colors.light.success,
  },
  bmiOverweight: {
    backgroundColor: colors.light.warning,
  },
  bmiObese: {
    backgroundColor: colors.light.error,
  },
  bmiLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bmiLegendText: {
    fontSize: 11,
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