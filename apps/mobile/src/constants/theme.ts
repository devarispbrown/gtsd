import { Theme } from '@react-navigation/native';
import { colors } from './colors';

export const navigationTheme = (isDark: boolean): Theme => ({
  dark: isDark,
  colors: {
    primary: isDark ? colors.dark.primary : colors.light.primary,
    background: isDark ? colors.dark.background : colors.light.background,
    card: isDark ? colors.dark.card : colors.light.card,
    text: isDark ? colors.dark.text : colors.light.text,
    border: isDark ? colors.dark.border : colors.light.border,
    notification: isDark ? colors.dark.error : colors.light.error,
  },
});