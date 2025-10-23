import React, { useEffect, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import HapticFeedback from 'react-native-haptic-feedback';
import { colors } from '../constants/colors';
import { BadgeCard } from '../components/BadgeCard';
import { useStreaksStore } from '../stores/streaksStore';
import { UserBadgeWithMetadata, BadgeMetadata, BADGE_CATALOG } from '@gtsd/shared-types';

type FilterCategory = 'all' | 'earned' | 'locked';

export const BadgesScreen: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  const { badges, isLoading, isRefreshing, fetchUserBadges, refreshBadges } = useStreaksStore();

  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');
  const [selectedBadge, setSelectedBadge] = useState<BadgeMetadata | null>(null);
  const [showBadgeDetail, setShowBadgeDetail] = useState(false);

  const progressScale = useSharedValue(1);

  useEffect(() => {
    fetchUserBadges();
  }, [fetchUserBadges]);

  const handleRefresh = useCallback(async () => {
    HapticFeedback.trigger('impactLight');
    await refreshBadges();
  }, [refreshBadges]);

  const handleBadgePress = useCallback((badge: UserBadgeWithMetadata | BadgeMetadata) => {
    HapticFeedback.trigger('impactLight');
    setSelectedBadge('metadata' in badge ? badge.metadata : badge);
    setShowBadgeDetail(true);
  }, []);

  const handleFilterChange = useCallback(
    (filter: FilterCategory) => {
      HapticFeedback.trigger('selection');
      setSelectedFilter(filter);
      progressScale.value = withSpring(1.05, {}, () => {
        progressScale.value = withSpring(1);
      });
    },
    [progressScale]
  );

  // Get all available badges
  const allBadges = Object.values(BADGE_CATALOG);
  const earnedBadgeTypes = new Set(badges.map(b => b.badgeType));

  // Filter badges based on selection
  const getFilteredBadges = (): (UserBadgeWithMetadata | BadgeMetadata)[] => {
    switch (selectedFilter) {
      case 'earned':
        return badges;
      case 'locked':
        return allBadges.filter(b => !earnedBadgeTypes.has(b.type));
      case 'all':
      default: {
        // Combine earned and locked badges
        const combinedBadges: (UserBadgeWithMetadata | BadgeMetadata)[] = [...badges];
        allBadges.forEach(badge => {
          if (!earnedBadgeTypes.has(badge.type)) {
            combinedBadges.push(badge);
          }
        });
        return combinedBadges;
      }
    }
  };

  const filteredBadges = getFilteredBadges();
  const totalAvailable = allBadges.length;
  const totalEarned = badges.length;
  const completionPercentage =
    totalAvailable > 0 ? Math.round((totalEarned / totalAvailable) * 100) : 0;

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progressScale.value }],
  }));

  const renderBadgeItem = ({
    item,
    index,
  }: {
    item: UserBadgeWithMetadata | BadgeMetadata;
    index: number;
  }) => {
    const isEarned = 'userId' in item;

    if (isEarned) {
      return (
        <BadgeCard badge={item as UserBadgeWithMetadata} onPress={handleBadgePress} index={index} />
      );
    }

    // Render locked badge
    const badge = item as BadgeMetadata;
    return (
      <Animated.View entering={FadeInDown.delay(index * 50)}>
        <TouchableOpacity
          style={[styles.lockedBadgeCard, { borderColor: theme.separator }]}
          onPress={() => handleBadgePress(badge)}
          activeOpacity={0.7}>
          <View style={styles.lockedBadgeHeader}>
            <View
              style={[styles.lockedEmojiContainer, { backgroundColor: theme.separator + '40' }]}>
              <Text style={styles.lockedEmoji}>🔒</Text>
            </View>
            <View style={styles.lockedInfo}>
              <Text style={[styles.lockedBadgeName, { color: theme.textSecondary }]}>
                {badge.name}
              </Text>
              <Text style={[styles.lockedCategory, { color: theme.textSecondary + '80' }]}>
                {badge.category.replace('_', ' ')} • LOCKED
              </Text>
            </View>
          </View>
          <Text style={[styles.lockedCriteria, { color: theme.textSecondary + '60' }]}>
            {badge.unlockCriteria}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    headerTitle: {
      fontSize: 34,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: 0.37,
      marginBottom: 16,
    },
    progressContainer: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    progressStats: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    progressNumber: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.primary,
    },
    progressTotal: {
      fontSize: 18,
      color: theme.textSecondary,
    },
    progressPercentage: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.separator,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    filterContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.separator,
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    filterTextActive: {
      color: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    lockedBadgeCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginVertical: 8,
      borderWidth: 1,
      opacity: 0.7,
    },
    lockedBadgeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    lockedEmojiContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    lockedEmoji: {
      fontSize: 28,
    },
    lockedInfo: {
      flex: 1,
    },
    lockedBadgeName: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 2,
    },
    lockedCategory: {
      fontSize: 12,
      textTransform: 'uppercase',
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    lockedCriteria: {
      fontSize: 14,
      lineHeight: 20,
      marginTop: 4,
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
      maxHeight: '70%',
    },
    modalHeader: {
      alignItems: 'center',
      marginBottom: 20,
    },
    modalEmojiContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    modalEmoji: {
      fontSize: 56,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    modalCategory: {
      fontSize: 14,
      color: theme.primary,
      textTransform: 'uppercase',
      fontWeight: '600',
      letterSpacing: 1,
      marginTop: 4,
    },
    modalDescription: {
      fontSize: 16,
      color: theme.text,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 20,
    },
    modalCriteria: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    modalCriteriaLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    modalCriteriaText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    modalStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 12,
      marginBottom: 20,
    },
    modalStatusEarned: {
      backgroundColor: '#4CAF50' + '20',
    },
    modalStatusLocked: {
      backgroundColor: theme.separator + '20',
    },
    modalStatusIcon: {
      fontSize: 20,
      marginRight: 8,
    },
    modalStatusText: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalCloseButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    modalCloseButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading your achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Achievements
        </Text>

        <Animated.View style={[styles.progressContainer, progressAnimatedStyle]}>
          <View style={styles.progressRow}>
            <View style={styles.progressStats}>
              <Text style={styles.progressNumber}>{totalEarned}</Text>
              <Text style={styles.progressTotal}>/ {totalAvailable}</Text>
            </View>
            <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
          </View>
          <View style={styles.progressBar}>
            <Animated.View
              entering={FadeIn.delay(300)}
              style={[styles.progressFill, { width: `${completionPercentage}%` }]}
            />
          </View>
        </Animated.View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
            onPress={() => handleFilterChange('all')}
            activeOpacity={0.7}>
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'earned' && styles.filterButtonActive]}
            onPress={() => handleFilterChange('earned')}
            activeOpacity={0.7}>
            <Text
              style={[styles.filterText, selectedFilter === 'earned' && styles.filterTextActive]}>
              Earned ({totalEarned})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'locked' && styles.filterButtonActive]}
            onPress={() => handleFilterChange('locked')}
            activeOpacity={0.7}>
            <Text
              style={[styles.filterText, selectedFilter === 'locked' && styles.filterTextActive]}>
              Locked ({totalAvailable - totalEarned})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredBadges}
        renderItem={renderBadgeItem}
        keyExtractor={item => ('userId' in item ? `${item.badgeType}-${item.id}` : item.type)}
        contentContainerStyle={filteredBadges.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>{selectedFilter === 'earned' ? '🎯' : '🔒'}</Text>
            <Text style={styles.emptyTitle}>
              {selectedFilter === 'earned' ? 'No badges earned yet' : 'All badges unlocked!'}
            </Text>
            <Text style={styles.emptyDescription}>
              {selectedFilter === 'earned'
                ? 'Complete your daily tasks to start earning achievement badges!'
                : "Congratulations! You've unlocked every achievement!"}
            </Text>
          </View>
        }
      />

      {/* Badge Detail Modal */}
      <Modal
        visible={showBadgeDetail}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBadgeDetail(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBadgeDetail(false)}>
          <TouchableOpacity activeOpacity={1}>
            {selectedBadge && (
              <Animated.View entering={FadeIn.springify()} style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHeader}>
                    <View
                      style={[
                        styles.modalEmojiContainer,
                        {
                          backgroundColor:
                            selectedBadge.category === 'milestone'
                              ? '#4CAF50' + '20'
                              : selectedBadge.category === 'streak'
                                ? '#FF9800' + '20'
                                : selectedBadge.category === 'task_specific'
                                  ? '#2196F3' + '20'
                                  : selectedBadge.category === 'time_based'
                                    ? '#9C27B0' + '20'
                                    : '#FFD700' + '20',
                        },
                      ]}>
                      <Text style={styles.modalEmoji}>
                        {earnedBadgeTypes.has(selectedBadge.type) ? selectedBadge.emoji : '🔒'}
                      </Text>
                    </View>
                    <Text style={styles.modalTitle}>{selectedBadge.name}</Text>
                    <Text style={styles.modalCategory}>
                      {selectedBadge.category.replace('_', ' ')}
                    </Text>
                  </View>

                  <Text style={styles.modalDescription}>{selectedBadge.description}</Text>

                  <View style={styles.modalCriteria}>
                    <Text style={styles.modalCriteriaLabel}>How to Unlock</Text>
                    <Text style={styles.modalCriteriaText}>{selectedBadge.unlockCriteria}</Text>
                  </View>

                  <View
                    style={[
                      styles.modalStatus,
                      earnedBadgeTypes.has(selectedBadge.type)
                        ? styles.modalStatusEarned
                        : styles.modalStatusLocked,
                    ]}>
                    <Text style={styles.modalStatusIcon}>
                      {earnedBadgeTypes.has(selectedBadge.type) ? '✅' : '🔒'}
                    </Text>
                    <Text
                      style={[
                        styles.modalStatusText,
                        {
                          color: earnedBadgeTypes.has(selectedBadge.type)
                            ? '#4CAF50'
                            : theme.textSecondary,
                        },
                      ]}>
                      {earnedBadgeTypes.has(selectedBadge.type) ? 'EARNED' : 'LOCKED'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowBadgeDetail(false)}
                    activeOpacity={0.8}>
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              </Animated.View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
