import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { AccountabilityPartner } from '../../types/onboarding';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';

interface PartnerCardProps {
  partner: AccountabilityPartner;
  onEdit: () => void;
  onDelete: () => void;
}

export const PartnerCard: React.FC<PartnerCardProps> = ({
  partner,
  onEdit,
  onDelete,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const handleDelete = () => {
    AccessibilityInfo.announceForAccessibility(`${partner.name} removed`);
    onDelete();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? colors.dark.inputBackground
            : colors.light.inputBackground,
          borderColor: isDark ? colors.dark.border : colors.light.border,
        },
      ]}
      accessible={true}
      accessibilityLabel={`Accountability partner: ${partner.name}, ${partner.relationship}`}
      accessibilityHint="Double tap to edit, swipe right to delete"
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.name,
              { color: isDark ? colors.dark.text : colors.light.text },
            ]}
          >
            {partner.name}
          </Text>
          <Text
            style={[
              styles.relationship,
              {
                color: isDark
                  ? colors.dark.textSecondary
                  : colors.light.textSecondary,
              },
            ]}
          >
            {partner.relationship}
          </Text>
        </View>

        <View style={styles.contactInfo}>
          {partner.email && (
            <View style={styles.contactRow}>
              <Text style={styles.contactIcon}>📧</Text>
              <Text
                style={[
                  styles.contactText,
                  {
                    color: isDark
                      ? colors.dark.textSecondary
                      : colors.light.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {partner.email}
              </Text>
            </View>
          )}
          {partner.phone && (
            <View style={styles.contactRow}>
              <Text style={styles.contactIcon}>📱</Text>
              <Text
                style={[
                  styles.contactText,
                  {
                    color: isDark
                      ? colors.dark.textSecondary
                      : colors.light.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {partner.phone}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: isDark
                ? colors.dark.background
                : colors.light.background,
            },
          ]}
          onPress={onEdit}
          accessibilityLabel={`Edit ${partner.name}`}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.actionText,
              { color: colors.light.primary },
            ]}
          >
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: isDark
                ? colors.dark.background
                : colors.light.background,
            },
          ]}
          onPress={handleDelete}
          accessibilityLabel={`Remove ${partner.name}`}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.actionText,
              { color: colors.light.error },
            ]}
          >
            Remove
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  content: {
    marginBottom: 12,
  },
  header: {
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  relationship: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  contactInfo: {
    marginTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  contactText: {
    fontSize: 14,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});