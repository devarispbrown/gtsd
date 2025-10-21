import React from 'react';
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

type Props = NativeStackScreenProps<any, 'HowItWorks'>;

export function HowItWorksScreen({ navigation }: Props) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const handleGetStarted = () => {
    // Navigate to main app (Today screen or Dashboard)
    navigation.reset({
      index: 0,
      routes: [{ name: 'Today' }],
    });
  };

  const features = [
    {
      icon: '📋',
      title: 'Daily Tasks',
      description: 'Complete personalized tasks each day to build healthy habits and reach your goals.',
    },
    {
      icon: '🎯',
      title: 'Goal Tracking',
      description: 'Monitor your progress with visual insights and celebrate milestones along the way.',
    },
    {
      icon: '🍽️',
      title: 'Nutrition Guidance',
      description: 'Get meal recommendations tailored to your preferences and dietary needs.',
    },
    {
      icon: '🏃',
      title: 'Activity Plans',
      description: 'Follow workout routines designed for your fitness level and goals.',
    },
    {
      icon: '👥',
      title: 'Accountability',
      description: 'Stay motivated with support from your accountability partners and the GTSD community.',
    },
    {
      icon: '📊',
      title: 'Insights & Analytics',
      description: 'Learn from your patterns and optimize your approach with data-driven insights.',
    },
  ];

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.dark.background : colors.light.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text
              style={[
                styles.title,
                { color: isDark ? colors.dark.text : colors.light.text },
              ]}
              accessibilityRole="header"
            >
              Welcome to GTSD!
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
              ]}
            >
              Your personalized plan is ready. Here's how GTSD works:
            </Text>
          </View>

          <View style={styles.features}>
            {features.map((feature, index) => (
              <View
                key={index}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: isDark
                      ? colors.dark.inputBackground
                      : colors.light.inputBackground,
                    borderColor: isDark ? colors.dark.border : colors.light.border,
                  },
                ]}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureContent}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: isDark ? colors.dark.text : colors.light.text },
                    ]}
                  >
                    {feature.title}
                  </Text>
                  <Text
                    style={[
                      styles.featureDescription,
                      { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                    ]}
                  >
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.tipBox,
              {
                backgroundColor: colors.light.primaryBackground,
                borderColor: colors.light.primary,
              },
            ]}
          >
            <Text style={styles.tipIcon}>💡</Text>
            <View style={styles.tipContent}>
              <Text
                style={[
                  styles.tipTitle,
                  { color: colors.light.primary },
                ]}
              >
                Pro Tip
              </Text>
              <Text
                style={[
                  styles.tipText,
                  { color: colors.light.primary },
                ]}
              >
                Start with just 3 tasks today. Small, consistent actions lead to big results over time.
              </Text>
            </View>
          </View>

          <View style={styles.statsPreview}>
            <Text
              style={[
                styles.statsTitle,
                { color: isDark ? colors.dark.text : colors.light.text },
              ]}
            >
              Your Journey Begins
            </Text>
            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDark
                      ? colors.dark.background
                      : colors.light.background,
                  },
                ]}
              >
                <Text style={styles.statNumber}>0</Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                  ]}
                >
                  Day Streak
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDark
                      ? colors.dark.background
                      : colors.light.background,
                  },
                ]}
              >
                <Text style={styles.statNumber}>3</Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                  ]}
                >
                  Tasks Today
                </Text>
              </View>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDark
                      ? colors.dark.background
                      : colors.light.background,
                  },
                ]}
              >
                <Text style={styles.statNumber}>∞</Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                  ]}
                >
                  Potential
                </Text>
              </View>
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

        <Text
          style={[
            styles.footerText,
            { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
          ]}
        >
          You can always access this guide from Settings
        </Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
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
  tipBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsPreview: {
    marginTop: 12,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.light.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
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
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});