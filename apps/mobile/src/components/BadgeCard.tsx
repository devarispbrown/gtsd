import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  useColorScheme,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import HapticFeedback from 'react-native-haptic-feedback';
import { colors } from '../constants/colors';
import { UserBadgeWithMetadata } from '@gtsd/shared-types';

interface BadgeCardProps {
  badge: UserBadgeWithMetadata;
  onPress?: (badge: UserBadgeWithMetadata) => void;
  isNew?: boolean;
  index?: number;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  onPress,
  isNew = false,
  index = 0,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    if (isNew) {
      // Celebrate new badge with animation
      rotation.value = withSpring(360);
      scale.value = withSpring(1.1, {}, () => {
        scale.value = withSpring(1);
      });
    }
  }, [isNew]);

  const handlePress = () => {
    HapticFeedback.trigger('impactLight');
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    onPress?.(badge);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      {
        rotate: `${interpolate(
          rotation.value,
          [0, 360],
          [0, 360]
        )}deg`
      },
    ],
  }));

  const getCategoryColor = () => {
    switch (badge.metadata.category) {
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
  const earnedDate = new Date(badge.awardedAt);
  const formattedDate = earnedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginVertical: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: isNew ? 2 : 1,
      borderColor: isNew ? categoryColor : theme.separator,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    emojiContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: categoryColor + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 2,
      borderColor: categoryColor + '40',
    },
    emoji: {
      fontSize: 32,
    },
    info: {
      flex: 1,
    },
    badgeName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 2,
    },
    category: {
      fontSize: 12,
      color: categoryColor,
      textTransform: 'uppercase',
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.separator,
    },
    earnedDate: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    newBadge: {
      backgroundColor: categoryColor,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    newBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    shimmer: {
      position: 'absolute',
      top: -2,
      left: -2,
      right: -2,
      bottom: -2,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: categoryColor,
      opacity: 0.3,
    },
  });

  return (
    <Animated.View
      entering={FadeIn.delay(index * 100).springify()}
      style={animatedStyle}
    >
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${badge.metadata.name} badge, earned on ${formattedDate}`}
      >
        {isNew && <View style={styles.shimmer} />}

        <View style={styles.header}>
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{badge.metadata.emoji}</Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.badgeName}>{badge.metadata.name}</Text>
            <Text style={styles.category}>{badge.metadata.category.replace('_', ' ')}</Text>
          </View>
        </View>

        <Text style={styles.description}>
          {badge.metadata.description}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.earnedDate}>
            Earned {formattedDate}
          </Text>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW!</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};