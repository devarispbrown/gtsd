import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
  Modal,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import HapticFeedback from 'react-native-haptic-feedback';
import { colors } from '../constants/colors';
import { DailyComplianceStreak } from '@gtsd/shared-types';

interface StreakBarProps {
  streak: DailyComplianceStreak | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const StreakBar: React.FC<StreakBarProps> = ({
  streak,
  isLoading,
  onRefresh,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;
  const [showDetails, setShowDetails] = React.useState(false);

  // Animation values
  const scale = useSharedValue(1);
  const flameAnimation = useSharedValue(0);

  React.useEffect(() => {
    // Animate flame when streak changes
    if (streak && streak.currentStreak > 0) {
      flameAnimation.value = withSequence(
        withTiming(1, { duration: 300 }),
        withSpring(0.9),
        withSpring(1)
      );

      // Pulse animation for milestones
      if (streak.currentStreak % 7 === 0 || streak.currentStreak === streak.longestStreak) {
        scale.value = withSequence(
          withSpring(1.1),
          withSpring(1)
        );
      }
    }
  }, [streak?.currentStreak]);

  const handlePress = useCallback(() => {
    HapticFeedback.trigger('impactLight');
    setShowDetails(true);
  }, []);

  const handleClose = useCallback(() => {
    setShowDetails(false);
  }, []);

  const getStreakEmoji = (count: number) => {
    if (count === 0) return '🌱';
    if (count < 3) return '✨';
    if (count < 7) return '🔥';
    if (count < 14) return '⚡';
    if (count < 30) return '🚀';
    if (count < 60) return '💎';
    if (count < 100) return '👑';
    return '🏆';
  };

  const getStreakMessage = (count: number) => {
    if (count === 0) return 'Start your streak today!';
    if (count === 1) return 'Great start! Keep it up!';
    if (count < 3) return 'Building momentum!';
    if (count < 7) return 'You\'re on fire!';
    if (count < 14) return 'Unstoppable force!';
    if (count < 30) return 'Legendary dedication!';
    if (count < 60) return 'Master of consistency!';
    if (count < 100) return 'Elite performer!';
    return 'GTSD Champion!';
  };

  const getStreakColor = (count: number) => {
    if (count === 0) return theme.textSecondary;
    if (count < 3) return '#FFA500';
    if (count < 7) return '#FF6B6B';
    if (count < 14) return '#FF4444';
    if (count < 30) return '#FF1744';
    if (count < 60) return '#9C27B0';
    if (count < 100) return '#673AB7';
    return '#FFD700';
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          flameAnimation.value,
          [0, 0.5, 1],
          [1, 1.2, 1]
        ),
      },
    ],
  }));

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingSkeleton, { backgroundColor: theme.separator }]} />
        </View>
      </View>
    );
  }

  const currentStreak = streak?.currentStreak || 0;
  const longestStreak = streak?.longestStreak || 0;
  const totalDays = streak?.totalCompliantDays || 0;
  const isNewRecord = currentStreak > 0 && currentStreak >= longestStreak;

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    loadingContainer: {
      height: 60,
      justifyContent: 'center',
    },
    loadingSkeleton: {
      height: 40,
      borderRadius: 20,
    },
    streakButton: {
      backgroundColor: getStreakColor(currentStreak) + '15',
      borderRadius: 20,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: getStreakColor(currentStreak) + '30',
    },
    streakContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    emojiContainer: {
      marginRight: 12,
    },
    streakEmoji: {
      fontSize: 28,
    },
    streakInfo: {
      flex: 1,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    streakNumber: {
      fontSize: 24,
      fontWeight: '700',
      color: getStreakColor(currentStreak),
    },
    streakLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    streakMessage: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    recordBadge: {
      backgroundColor: '#FFD700',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    recordText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    arrowContainer: {
      paddingLeft: 8,
    },
    arrow: {
      fontSize: 18,
      color: theme.textSecondary,
    },

    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 24,
      width: '85%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    modalHeader: {
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginTop: 12,
    },
    modalEmoji: {
      fontSize: 48,
    },
    statsContainer: {
      marginBottom: 20,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    statLabel: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    motivationalMessage: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    motivationalText: {
      fontSize: 14,
      color: theme.text,
      textAlign: 'center',
      lineHeight: 20,
    },
    closeButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  return (
    <>
      <Animated.View
        entering={FadeInUp.delay(100)}
        style={[styles.container, animatedStyle]}
      >
        <TouchableOpacity
          onPress={handlePress}
          style={styles.streakButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Current streak: ${currentStreak} days. Tap for details`}
        >
          <View style={styles.streakContent}>
            <Animated.View style={[styles.emojiContainer, flameStyle]}>
              <Text style={styles.streakEmoji}>
                {getStreakEmoji(currentStreak)}
              </Text>
            </Animated.View>

            <View style={styles.streakInfo}>
              <View style={styles.streakRow}>
                <Text style={styles.streakNumber}>{currentStreak}</Text>
                <Text style={styles.streakLabel}>
                  day {currentStreak === 1 ? 'streak' : 'streak'}
                </Text>
                {isNewRecord && currentStreak > 0 && (
                  <View style={styles.recordBadge}>
                    <Text style={styles.recordText}>RECORD</Text>
                  </View>
                )}
              </View>
              <Text style={styles.streakMessage}>
                {getStreakMessage(currentStreak)}
              </Text>
            </View>
          </View>

          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity activeOpacity={1}>
            <Animated.View
              entering={FadeInUp.springify()}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalEmoji}>
                  {getStreakEmoji(currentStreak)}
                </Text>
                <Text style={styles.modalTitle}>Streak Statistics</Text>
              </View>

              <ScrollView style={styles.statsContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Current Streak</Text>
                  <Text style={[styles.statValue, { color: getStreakColor(currentStreak) }]}>
                    {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Longest Streak</Text>
                  <Text style={styles.statValue}>
                    {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Compliant Days</Text>
                  <Text style={styles.statValue}>
                    {totalDays} {totalDays === 1 ? 'day' : 'days'}
                  </Text>
                </View>

                {streak?.streakStartDate && (
                  <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.statLabel}>Streak Started</Text>
                    <Text style={styles.statValue}>
                      {new Date(streak.streakStartDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.motivationalMessage}>
                <Text style={styles.motivationalText}>
                  {currentStreak === 0
                    ? "Every champion was once a beginner. Start your streak today!"
                    : currentStreak < 7
                    ? "You're building something great! Keep pushing forward."
                    : currentStreak < 30
                    ? "Your consistency is inspiring! You're becoming unstoppable."
                    : "You're a true GTSD warrior! Your dedication is legendary."}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};