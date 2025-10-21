import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from 'react-native-date-picker';
import { Controller, Control, FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';

interface DatePickerProps {
  control: Control<any>;
  name: string;
  label: string;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
  required?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  control,
  name,
  label,
  error,
  required,
  minimumDate,
  maximumDate,
  placeholder = 'Select date',
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date | undefined): string => {
    if (!date) return placeholder;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
        render={({ field: { onChange, value } }) => (
          <>
            <TouchableOpacity
              style={[
                styles.dateButton,
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
              onPress={() => setIsOpen(true)}
              accessibilityLabel={`${label}: ${formatDate(value)}`}
              accessibilityHint="Double tap to select date"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.dateText,
                  {
                    color: value
                      ? isDark
                        ? colors.dark.text
                        : colors.light.text
                      : isDark
                      ? colors.dark.textSecondary
                      : colors.light.textSecondary,
                  },
                ]}
              >
                {formatDate(value)}
              </Text>
              <Text
                style={[
                  styles.icon,
                  { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                ]}
              >
                📅
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
              <Modal
                visible={isOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
              >
                <View style={styles.modalOverlay}>
                  <View
                    style={[
                      styles.modalContent,
                      {
                        backgroundColor: isDark
                          ? colors.dark.background
                          : colors.light.background,
                      },
                    ]}
                  >
                    <View style={styles.modalHeader}>
                      <TouchableOpacity
                        onPress={() => setIsOpen(false)}
                        style={styles.modalButton}
                      >
                        <Text
                          style={[
                            styles.modalButtonText,
                            { color: colors.light.error },
                          ]}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.modalTitle,
                          { color: isDark ? colors.dark.text : colors.light.text },
                        ]}
                      >
                        {label}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setIsOpen(false)}
                        style={styles.modalButton}
                      >
                        <Text
                          style={[
                            styles.modalButtonText,
                            { color: colors.light.primary },
                          ]}
                        >
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      date={value || new Date()}
                      onDateChange={onChange}
                      mode="date"
                      minimumDate={minimumDate}
                      maximumDate={maximumDate}
                      theme={theme === 'system' ? 'auto' : theme}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                modal
                open={isOpen}
                date={value || new Date()}
                onConfirm={(date) => {
                  setIsOpen(false);
                  onChange(date);
                }}
                onCancel={() => setIsOpen(false)}
                mode="date"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                theme={theme === 'system' ? 'auto' : theme}
              />
            )}
          </>
        )}
      />

      {error?.message && (
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {String(error.message)}
        </Text>
      )}
    </View>
  );
};

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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  dateText: {
    fontSize: 16,
    flex: 1,
  },
  icon: {
    fontSize: 20,
  },
  errorText: {
    fontSize: 12,
    color: colors.light.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalButton: {
    padding: 5,
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: '500',
  },
});