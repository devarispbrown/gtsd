import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { Controller, Control, FieldError } from 'react-hook-form';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';

interface FormInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  control: Control<any>;
  name: string;
  label: string;
  error?: FieldError;
  required?: boolean;
  helperText?: string;
  icon?: React.ReactNode;
}

export const FormInput = forwardRef<TextInput, FormInputProps>(
  (
    {
      control,
      name,
      label,
      error,
      required,
      helperText,
      icon,
      ...textInputProps
    },
    ref
  ) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    React.useEffect(() => {
      if (error?.message) {
        // Announce error for screen readers
        AccessibilityInfo.announceForAccessibility(
          `${label} error: ${error.message}`
        );
      }
    }, [error?.message, label]);

    return (
      <View style={styles.container}>
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              { color: isDark ? colors.dark.text : colors.light.text },
            ]}
            accessibilityRole="text"
          >
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>

        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, value, onBlur } }) => (
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: error
                    ? colors.light.error
                    : isDark
                    ? colors.dark.border
                    : colors.light.border,
                  backgroundColor: isDark
                    ? colors.dark.inputBackground
                    : colors.light.inputBackground,
                },
              ]}
            >
              {icon && <View style={styles.icon}>{icon}</View>}
              <TextInput
                ref={ref}
                style={[
                  styles.input,
                  {
                    color: isDark ? colors.dark.text : colors.light.text,
                  },
                  icon && styles.inputWithIcon,
                ]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholderTextColor={
                  isDark ? colors.dark.textSecondary : colors.light.textSecondary
                }
                accessibilityLabel={label}
                accessibilityHint={helperText}
                accessibilityRole="text"
                accessibilityState={{
                  required,
                  invalid: !!error,
                }}
                accessibilityValue={{ text: value }}
                {...textInputProps}
              />
            </View>
          )}
        />

        {helperText && !error && (
          <Text
            style={[
              styles.helperText,
              {
                color: isDark
                  ? colors.dark.textSecondary
                  : colors.light.textSecondary,
              },
            ]}
            accessibilityRole="text"
          >
            {helperText}
          </Text>
        )}

        {error && (
          <Text
            style={styles.errorText}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error.message}
          </Text>
        )}
      </View>
    );
  }
);

FormInput.displayName = 'FormInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  required: {
    color: colors.light.error,
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.light.error,
    marginTop: 4,
  },
});