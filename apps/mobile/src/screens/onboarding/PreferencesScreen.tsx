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
import { MultiSelect, MultiSelectItem } from '../../components/onboarding/MultiSelect';
import { FormInput } from '../../components/onboarding/FormInput';
import { Picker, PickerItem } from '../../components/onboarding/Picker';

type Props = NativeStackScreenProps<any, 'Preferences'>;

const dietaryOptions: MultiSelectItem[] = [
  { label: 'No restrictions', value: 'none' },
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Pescatarian', value: 'pescatarian' },
  { label: 'Keto', value: 'keto' },
  { label: 'Paleo', value: 'paleo' },
  { label: 'Gluten-free', value: 'gluten_free' },
  { label: 'Dairy-free', value: 'dairy_free' },
  { label: 'Halal', value: 'halal' },
  { label: 'Kosher', value: 'kosher' },
  { label: 'Other', value: 'other' },
];

const mealOptions: PickerItem[] = [
  { label: '1 meal', value: '1' },
  { label: '2 meals', value: '2' },
  { label: '3 meals', value: '3' },
  { label: '4 meals', value: '4' },
  { label: '5 meals', value: '5' },
  { label: '6 meals', value: '6' },
];

export function PreferencesScreen({ navigation }: Props) {
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

  const form = getFormForStep('preferences');
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
    if (data.dietaryPreferences || data.allergies || data.mealsPerDay) {
      form.reset({
        dietaryPreferences: data.dietaryPreferences || ['none'],
        allergies: data.allergies || [],
        mealsPerDay: data.mealsPerDay || 3,
      });
    }
  }, []);

  const onSubmit = async (formData: any) => {
    // Convert allergies string to array if needed
    const processedData = {
      ...formData,
      allergies: typeof formData.allergies === 'string'
        ? formData.allergies.split(',').map((a: string) => a.trim()).filter(Boolean)
        : formData.allergies || [],
    };
    await saveStepData(processedData);
    await goToNextStep();
    navigation.navigate('Partners');
  };

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  const commonAllergies = [
    'Nuts', 'Dairy', 'Eggs', 'Soy', 'Wheat', 'Fish', 'Shellfish', 'Sesame',
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
              Dietary Preferences
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
              ]}
            >
              Help us customize your meal recommendations
            </Text>

            <View style={styles.form}>
              <MultiSelect
                control={control}
                name="dietaryPreferences"
                label="Dietary Preferences"
                items={dietaryOptions}
                error={errors.dietaryPreferences}
                required
                placeholder="Select your dietary preferences"
                maxSelection={5}
              />

              <FormInput
                control={control}
                name="allergies"
                label="Food Allergies"
                error={errors.allergies}
                placeholder="Enter any food allergies (comma-separated)"
                multiline
                numberOfLines={2}
                helperText="e.g., peanuts, shellfish, dairy"
              />

              {commonAllergies.length > 0 && (
                <View style={styles.suggestions}>
                  <Text
                    style={[
                      styles.suggestionsLabel,
                      { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                    ]}
                  >
                    Common allergies:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.suggestionsList}
                  >
                    {commonAllergies.map((allergy) => (
                      <TouchableOpacity
                        key={allergy}
                        style={[
                          styles.suggestionChip,
                          {
                            backgroundColor: isDark
                              ? colors.dark.inputBackground
                              : colors.light.inputBackground,
                            borderColor: isDark ? colors.dark.border : colors.light.border,
                          },
                        ]}
                        onPress={() => {
                          const current = formValues.allergies || [];
                          const currentArray = typeof current === 'string'
                            ? current.split(',').map((a: string) => a.trim()).filter(Boolean)
                            : current;

                          if (!currentArray.includes(allergy)) {
                            const newAllergies = [...currentArray, allergy].join(', ');
                            setValue('allergies', newAllergies, { shouldValidate: true });
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.suggestionText,
                            { color: isDark ? colors.dark.text : colors.light.text },
                          ]}
                        >
                          + {allergy}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Picker
                control={control}
                name="mealsPerDay"
                label="Meals per Day"
                items={mealOptions}
                error={errors.mealsPerDay}
                required
                placeholder="How many meals do you eat?"
              />

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
                <Text style={styles.infoIcon}>🍽️</Text>
                <Text
                  style={[
                    styles.infoText,
                    { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                  ]}
                >
                  Your preferences help us suggest meals that fit your lifestyle and dietary needs. You can update these anytime.
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