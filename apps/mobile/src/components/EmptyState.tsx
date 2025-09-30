import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
  Image,
} from 'react-native';
import { colors } from '@constants/colors';
import { accessibility, getAccessibleTouchableProps } from '@constants/accessibility';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  image?: any;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  image,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingVertical: 60,
    },
    imageContainer: {
      marginBottom: 24,
      opacity: 0.5,
    },
    image: {
      width: 120,
      height: 120,
      tintColor: theme.textTertiary,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: 0.38,
    },
    description: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    button: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      minWidth: 120,
      minHeight: accessibility.minTapSize.height,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: theme.primaryText,
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.32,
    },
    placeholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.surface,
      marginBottom: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      fontSize: 48,
      color: theme.textTertiary,
    },
  });

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${description || ''}`}
    >
      {image ? (
        <View style={styles.imageContainer}>
          <Image source={image} style={styles.image} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>📝</Text>
        </View>
      )}

      <Text style={styles.title}>{title}</Text>

      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.button}
          onPress={onAction}
          {...getAccessibleTouchableProps(
            actionLabel,
            'button',
            'Double tap to perform action'
          )}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default EmptyState;