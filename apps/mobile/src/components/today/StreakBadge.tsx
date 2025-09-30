import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../../constants/colors';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  currentStreak,
  longestStreak,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  // Celebrate when streak is greater than 0
  React.useEffect(() => {
    if (currentStreak > 0) {
      scale.value = withSequence(
        withSpring(1.2),
        withSpring(1)
      );

      if (currentStreak >= longestStreak && currentStreak > 1) {
        // Extra celebration for new record
        rotate.value = withRepeat(
          withSequence(
            withTiming(5, { duration: 100 }),
            withTiming(-5, { duration: 100 }),
            withTiming(0, { duration: 100 })
          ),
          2
        );
      }
    }
  }, [currentStreak]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ],
  }));

  const getStreakEmoji = () => {
    if (currentStreak === 0) return '💤';
    if (currentStreak < 3) return '✨';
    if (currentStreak < 7) return '🔥';
    if (currentStreak < 14) return '⚡';
    if (currentStreak < 30) return '🚀';
    return '🏆';
  };

  const getStreakColor = () => {
    if (currentStreak === 0) return theme.textSecondary;
    if (currentStreak < 3) return theme.warning;
    if (currentStreak < 7) return '#FF6B6B';
    if (currentStreak < 14) return '#FF8E53';
    if (currentStreak < 30) return '#FE6B8B';
    return '#FFD700';
  };

  const isNewRecord = currentStreak >= longestStreak && currentStreak > 0;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: getStreakColor() + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: getStreakColor(),
    },
    emoji: {
      fontSize: 18,
      marginRight: 6,
    },
    streakText: {
      fontSize: 16,
      fontWeight: '700',
      color: getStreakColor(),
    },
    dayText: {
      fontSize: 14,
      fontWeight: '500',
      color: getStreakColor(),
      marginLeft: 2,
    },
    recordBadge: {
      backgroundColor: '#FFD700',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginLeft: 6,
    },
    recordText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
  });

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      accessibilityRole="text"
      accessibilityLabel={`Current streak: ${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`}
    >
      <Text style={styles.emoji}>{getStreakEmoji()}</Text>
      <Text style={styles.streakText}>{currentStreak}</Text>
      <Text style={styles.dayText}>
        {currentStreak === 1 ? 'day' : 'days'}
      </Text>
      {isNewRecord && currentStreak > 1 && (
        <View style={styles.recordBadge}>
          <Text style={styles.recordText}>NEW!</Text>
        </View>
      )}
    </Animated.View>
  );
};