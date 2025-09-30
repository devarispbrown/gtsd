import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Animated,
} from 'react-native';
import { colors } from '@constants/colors';
import { accessibility } from '@constants/accessibility';

interface FloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  icon?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  accessibilityLabel,
  accessibilityHint,
  icon = '+',
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        },
        android: {
          elevation: 8,
        },
      }),
      // Ensure minimum tap target
      minWidth: accessibility.minTapSize.width,
      minHeight: accessibility.minTapSize.height,
    },
    icon: {
      fontSize: 28,
      fontWeight: '400',
      color: theme.primaryText,
      textAlign: 'center',
      lineHeight: 28,
    },
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{
          selected: false,
          disabled: false,
        }}
        hitSlop={accessibility.defaultHitSlop}
      >
        <Text style={styles.icon}>{icon}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default FloatingActionButton;