import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { StepIndicator } from '../../components/onboarding/StepIndicator';

type Props = NativeStackScreenProps<any, 'Review'>;

export function ReviewScreen({ navigation }: Props) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const {
    stepIndex,
    totalSteps,
    data,
    isSubmitting,
    submitOnboarding,
    goToPreviousStep,
    goToStep,
  } = useOnboarding();

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  const handleEdit = (step: string) => {
    goToStep(step as any);
    navigation.navigate(step);
  };

  const handleSubmit = async () => {
    const result = await submitOnboarding();
    if (result.success) {
      navigation.navigate('HowItWorks');
    } else {
      Alert.alert(
        'Submission Failed',
        result.error || 'Failed to submit onboarding data. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Not set';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getActivityLevelLabel = (level: string | undefined) => {
    const labels: Record<string, string> = {
      sedentary: 'Sedentary',
      lightly_active: 'Lightly Active',
      moderately_active: 'Moderately Active',
      very_active: 'Very Active',
      extremely_active: 'Extremely Active',
    };
    return labels[level || ''] || 'Not set';
  };

  const getGenderLabel = (gender: string | undefined) => {
    const labels: Record<string, string> = {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      prefer_not_to_say: 'Prefer not to say',
    };
    return labels[gender || ''] || 'Not set';
  };

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
            Review Your Information
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
            ]}
          >
            Please review your information before submitting
          </Text>

          {/* Account Basics Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? colors.dark.text : colors.light.text },
                ]}
              >
                Account Basics
              </Text>
              <TouchableOpacity
                onPress={() => handleEdit('AccountBasics')}
                accessibilityLabel="Edit account basics"
                accessibilityRole="button"
              >
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.sectionContent,
                {
                  backgroundColor: isDark
                    ? colors.dark.inputBackground
                    : colors.light.inputBackground,
                  borderColor: isDark ? colors.dark.border : colors.light.border,
                },
              ]}
            >
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Date of Birth:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {formatDate(data.dateOfBirth)}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Gender:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {getGenderLabel(data.gender)}
                </Text>
              </View>
            </View>
          </View>

          {/* Goals Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? colors.dark.text : colors.light.text },
                ]}
              >
                Goals
              </Text>
              <TouchableOpacity
                onPress={() => handleEdit('Goals')}
                accessibilityLabel="Edit goals"
                accessibilityRole="button"
              >
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.sectionContent,
                {
                  backgroundColor: isDark
                    ? colors.dark.inputBackground
                    : colors.light.inputBackground,
                  borderColor: isDark ? colors.dark.border : colors.light.border,
                },
              ]}
            >
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Primary Goal:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {data.primaryGoal || 'Not set'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Target Weight:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {data.targetWeight ? `${data.targetWeight} kg` : 'Not set'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Target Date:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {formatDate(data.targetDate)}
                </Text>
              </View>
            </View>
          </View>

          {/* Health Metrics Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? colors.dark.text : colors.light.text },
                ]}
              >
                Health Metrics
              </Text>
              <TouchableOpacity
                onPress={() => handleEdit('HealthMetrics')}
                accessibilityLabel="Edit health metrics"
                accessibilityRole="button"
              >
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.sectionContent,
                {
                  backgroundColor: isDark
                    ? colors.dark.inputBackground
                    : colors.light.inputBackground,
                  borderColor: isDark ? colors.dark.border : colors.light.border,
                },
              ]}
            >
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Current Weight:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {data.currentWeight ? `${data.currentWeight} kg` : 'Not set'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Height:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {data.height ? `${data.height} cm` : 'Not set'}
                </Text>
              </View>
            </View>
          </View>

          {/* Activity Level Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? colors.dark.text : colors.light.text },
                ]}
              >
                Activity Level
              </Text>
              <TouchableOpacity
                onPress={() => handleEdit('ActivityLevel')}
                accessibilityLabel="Edit activity level"
                accessibilityRole="button"
              >
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.sectionContent,
                {
                  backgroundColor: isDark
                    ? colors.dark.inputBackground
                    : colors.light.inputBackground,
                  borderColor: isDark ? colors.dark.border : colors.light.border,
                },
              ]}
            >
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Activity Level:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {getActivityLevelLabel(data.activityLevel)}
                </Text>
              </View>
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? colors.dark.text : colors.light.text },
                ]}
              >
                Dietary Preferences
              </Text>
              <TouchableOpacity
                onPress={() => handleEdit('Preferences')}
                accessibilityLabel="Edit preferences"
                accessibilityRole="button"
              >
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.sectionContent,
                {
                  backgroundColor: isDark
                    ? colors.dark.inputBackground
                    : colors.light.inputBackground,
                  borderColor: isDark ? colors.dark.border : colors.light.border,
                },
              ]}
            >
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Diet:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {data.dietaryPreferences?.join(', ') || 'Not set'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Allergies:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {data.allergies?.length ? data.allergies.join(', ') : 'None'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  Meals/Day:
                </Text>
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {data.mealsPerDay || 'Not set'}
                </Text>
              </View>
            </View>
          </View>

          {/* Partners Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? colors.dark.text : colors.light.text },
                ]}
              >
                Accountability Partners
              </Text>
              <TouchableOpacity
                onPress={() => handleEdit('Partners')}
                accessibilityLabel="Edit partners"
                accessibilityRole="button"
              >
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.sectionContent,
                {
                  backgroundColor: isDark
                    ? colors.dark.inputBackground
                    : colors.light.inputBackground,
                  borderColor: isDark ? colors.dark.border : colors.light.border,
                },
              ]}
            >
              {data.partners && data.partners.length > 0 ? (
                data.partners.map((partner, index) => {
                  const partnerId = 'id' in partner ? partner.id : index;
                  return (
                  <View key={partnerId} style={styles.reviewItem}>
                    <Text style={[styles.reviewLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                      Partner {index + 1}:
                    </Text>
                    <Text style={[styles.reviewValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                      {partner.name} ({partner.relationship})
                    </Text>
                  </View>
                  );
                })
              ) : (
                <Text style={[styles.reviewValue, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                  No partners added
                </Text>
              )}
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
          disabled={isSubmitting}
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
            { backgroundColor: colors.light.primary },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityLabel="Submit"
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Submit</Text>
          )}
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
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    color: colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContent: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 14,
    marginRight: 8,
    minWidth: 100,
  },
  reviewValue: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
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
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});