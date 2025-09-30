import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { colors } from '../../constants/colors';

interface CompletionProgressProps {
  completed: number;
  total: number;
  percentage: number;
}

export const CompletionProgress: React.FC<CompletionProgressProps> = ({
  completed,
  total,
  percentage,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  const progressWidth = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withSpring(percentage, {
      damping: 20,
      stiffness: 100,
    });
    opacity.value = withTiming(1, { duration: 500 });
  }, [percentage]);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
    opacity: opacity.value,
  }));

  const getProgressColor = () => {
    if (percentage === 100) return theme.success;
    if (percentage >= 75) return '#4ECDC4';
    if (percentage >= 50) return theme.primary;
    if (percentage >= 25) return theme.warning;
    return theme.error;
  };

  const getMotivationalText = () => {
    if (percentage === 100) return 'Perfect! All done! 🎉';
    if (percentage >= 75) return 'Almost there! Keep going!';
    if (percentage >= 50) return 'Halfway done! You got this!';
    if (percentage >= 25) return 'Good start! Keep it up!';
    if (percentage > 0) return 'Let\'s get moving!';
    return 'Ready to start your day?';
  };

  const styles = StyleSheet.create({
    container: {
      marginVertical: 12,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.separator,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: getProgressColor(),
      borderRadius: 4,
    },
    progressInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    progressText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    progressPercentage: {
      fontSize: 16,
      fontWeight: '700',
      color: getProgressColor(),
    },
    motivationalText: {
      fontSize: 12,
      color: theme.textTertiary,
      fontStyle: 'italic',
      marginTop: 4,
      textAlign: 'center',
    },
  });

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: total,
        now: completed,
        text: `${completed} of ${total} tasks completed`,
      }}
    >
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
      </View>

      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {completed} of {total} tasks
        </Text>
        <Text style={styles.progressPercentage}>
          {Math.round(percentage)}%
        </Text>
      </View>

      <Text style={styles.motivationalText}>
        {getMotivationalText()}
      </Text>
    </View>
  );
};