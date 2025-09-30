import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

const { width } = Dimensions.get('window');

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const progressWidth = ((currentStep + 1) / totalSteps) * 100;

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${progressWidth}%`, {
        damping: 15,
        stiffness: 100,
      }),
    };
  });

  React.useEffect(() => {
    // Announce progress for screen readers
    const announcement = `Step ${currentStep + 1} of ${totalSteps}`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [currentStep, totalSteps]);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: totalSteps,
        now: currentStep + 1,
      }}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.stepText,
            { color: isDark ? colors.dark.text : colors.light.text },
          ]}
        >
          Step {currentStep + 1} of {totalSteps}
        </Text>
        <Text
          style={[
            styles.percentageText,
            { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
          ]}
        >
          {Math.round(progressWidth)}%
        </Text>
      </View>

      <View
        style={[
          styles.progressBar,
          {
            backgroundColor: isDark
              ? colors.dark.inputBackground
              : colors.light.inputBackground,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            animatedProgressStyle,
            {
              backgroundColor: isDark
                ? colors.dark.primary
                : colors.light.primary,
            },
          ]}
        />
      </View>

      {stepLabels && stepLabels[currentStep] && (
        <Text
          style={[
            styles.stepLabel,
            { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
          ]}
          numberOfLines={1}
          accessibilityRole="text"
        >
          {stepLabels[currentStep]}
        </Text>
      )}

      <View style={styles.dots}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index <= currentStep
                    ? isDark
                      ? colors.dark.primary
                      : colors.light.primary
                    : isDark
                    ? colors.dark.border
                    : colors.light.border,
                transform: [{ scale: index === currentStep ? 1.2 : 1 }],
              },
            ]}
            accessible={false}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  stepLabel: {
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});