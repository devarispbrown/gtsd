import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { StepIndicator } from '../../components/onboarding/StepIndicator';

type Props = NativeStackScreenProps<any, 'Welcome'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { stepIndex, totalSteps, goToNextStep } = useOnboarding();

  const handleGetStarted = async () => {
    await goToNextStep();
    navigation.navigate('AccountBasics');
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
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎯</Text>
          </View>

          <Text
            style={[
              styles.title,
              { color: isDark ? colors.dark.text : colors.light.text },
            ]}
            accessibilityRole="header"
          >
            Welcome to GTSD
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
            ]}
          >
            Get Things Sustainably Done
          </Text>

          <Text
            style={[
              styles.description,
              { color: isDark ? colors.dark.text : colors.light.text },
            ]}
          >
            Your journey to sustainable health and productivity starts here. Let's set up your personalized plan together.
          </Text>

          <View style={styles.features}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>✅</Text>
              <View style={styles.featureContent}>
                <Text
                  style={[
                    styles.featureTitle,
                    { color: isDark ? colors.dark.text : colors.light.text },
                  ]}
                >
                  Personalized Goals
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                  ]}
                >
                  Set achievable health and fitness targets tailored to you
                </Text>
              </View>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>👥</Text>
              <View style={styles.featureContent}>
                <Text
                  style={[
                    styles.featureTitle,
                    { color: isDark ? colors.dark.text : colors.light.text },
                  ]}
                >
                  Accountability Partners
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                  ]}
                >
                  Stay motivated with support from friends and family
                </Text>
              </View>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📊</Text>
              <View style={styles.featureContent}>
                <Text
                  style={[
                    styles.featureTitle,
                    { color: isDark ? colors.dark.text : colors.light.text },
                  ]}
                >
                  Track Progress
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                  ]}
                >
                  Monitor your journey with detailed insights and analytics
                </Text>
              </View>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🎨</Text>
              <View style={styles.featureContent}>
                <Text
                  style={[
                    styles.featureTitle,
                    { color: isDark ? colors.dark.text : colors.light.text },
                  ]}
                >
                  Customized Experience
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                  ]}
                >
                  Adapt GTSD to your lifestyle and preferences
                </Text>
              </View>
            </View>
          </View>

          <Text
            style={[
              styles.timeEstimate,
              { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
            ]}
          >
            ⏱ Setup takes about 5-10 minutes
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: isDark ? colors.dark.border : colors.light.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.light.primary },
          ]}
          onPress={handleGetStarted}
          accessibilityLabel="Get Started"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
          accessibilityLabel="Already have an account? Sign In"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.secondaryButtonText,
              { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
            ]}
          >
            Already have an account? <Text style={{ color: colors.light.primary }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 72,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeEstimate: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    padding: 24,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
  },
});