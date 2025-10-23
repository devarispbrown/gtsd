import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  FadeIn,
  SlideInUp,
  interpolate,
} from 'react-native-reanimated';
import HapticFeedback from 'react-native-haptic-feedback';
import { colors } from '../constants/colors';
import { ConfettiAnimation } from './ConfettiAnimation';
import { BadgeMetadata } from '@gtsd/shared-types';

interface BadgeAwardModalProps {
  visible: boolean;
  badge: BadgeMetadata | null;
  onClose: () => void;
  onViewBadges?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const BadgeAwardModal: React.FC<BadgeAwardModalProps> = ({
  visible,
  badge,
  onClose,
  onViewBadges,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    if (visible && badge) {
      // Trigger haptic feedback when badge is awarded
      HapticFeedback.trigger('notificationSuccess');

      // Start animations
      scale.value = withSequence(
        withSpring(1.2),
        withSpring(1)
      );

      rotation.value = withSequence(
        withSpring(-10),
        withSpring(10),
        withSpring(-5),
        withSpring(5),
        withSpring(0)
      );

      shimmer.value = withDelay(
        500,
        withSequence(
          withSpring(1),
          withSpring(0)
        )
      );
    } else {
      scale.value = 0;
      rotation.value = 0;
      shimmer.value = 0;
    }
  }, [visible, badge]);

  const handleClose = () => {
    HapticFeedback.trigger('impactLight');
    onClose();
  };

  const handleViewBadges = () => {
    HapticFeedback.trigger('impactLight');
    onViewBadges?.();
    onClose();
  };

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0, 0.3]),
  }));

  if (!badge) return null;

  const getCategoryColor = () => {
    switch (badge.category) {
      case 'milestone':
        return '#4CAF50';
      case 'streak':
        return '#FF9800';
      case 'task_specific':
        return '#2196F3';
      case 'time_based':
        return '#9C27B0';
      case 'special':
        return '#FFD700';
      default:
        return theme.primary;
    }
  };

  const categoryColor = getCategoryColor();

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 32,
      width: SCREEN_WIDTH * 0.85,
      maxWidth: 400,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: categoryColor,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    badgeContainer: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: categoryColor + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      borderWidth: 4,
      borderColor: categoryColor + '40',
      position: 'relative',
    },
    badgeEmoji: {
      fontSize: 72,
    },
    shimmerOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 70,
      backgroundColor: '#FFFFFF',
    },
    badgeName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    description: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 12,
    },
    criteria: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      width: '100%',
    },
    criteriaLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    criteriaText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    buttonContainer: {
      width: '100%',
      gap: 12,
    },
    primaryButton: {
      backgroundColor: categoryColor,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.separator,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    starContainer: {
      position: 'absolute',
      top: -10,
      right: -10,
      backgroundColor: '#FFD700',
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 3,
    },
    star: {
      fontSize: 24,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <ConfettiAnimation active={visible} duration={4000} />

        <Animated.View
          entering={SlideInUp.springify().damping(15).stiffness(120)}
          style={styles.modalContent}
        >
          <Animated.View entering={FadeIn.delay(300)} style={styles.header}>
            <Text style={styles.title}>Achievement Unlocked!</Text>
            <Text style={styles.subtitle}>New Badge Earned</Text>
          </Animated.View>

          <Animated.View style={[styles.badgeContainer, badgeStyle]}>
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]} />
            <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
            <View style={styles.starContainer}>
              <Text style={styles.star}>⭐</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(600)}>
            <Text style={styles.badgeName}>{badge.name}</Text>
            <Text style={styles.description}>{badge.description}</Text>

            <View style={styles.criteria}>
              <Text style={styles.criteriaLabel}>Unlock Criteria</Text>
              <Text style={styles.criteriaText}>{badge.unlockCriteria}</Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(900)}
            style={styles.buttonContainer}
          >
            {onViewBadges && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleViewBadges}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>View All Badges</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};