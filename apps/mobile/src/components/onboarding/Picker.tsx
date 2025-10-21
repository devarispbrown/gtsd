import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { Controller, Control, FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';

export interface PickerItem {
  label: string;
  value: string;
  description?: string;
}

interface PickerProps {
  control: Control<any>;
  name: string;
  label: string;
  items: PickerItem[];
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
  required?: boolean;
  placeholder?: string;
}

export const Picker: React.FC<PickerProps> = ({
  control,
  name,
  label,
  items,
  error,
  required,
  placeholder = 'Select an option',
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  const getSelectedLabel = (value: string | undefined): string => {
    if (!value) return placeholder;
    const item = items.find((i) => i.value === value);
    return item?.label || placeholder;
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
                styles.pickerButton,
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
              accessibilityLabel={`${label}: ${getSelectedLabel(value)}`}
              accessibilityHint="Double tap to select option"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.pickerText,
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
                {getSelectedLabel(value)}
              </Text>
              <Text
                style={[
                  styles.arrow,
                  { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                ]}
              >
                ▼
              </Text>
            </TouchableOpacity>

            <Modal
              visible={isOpen}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setIsOpen(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setIsOpen(false)}
              >
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
                      style={styles.closeButton}
                      accessibilityLabel="Close"
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.closeButtonText,
                          { color: colors.light.primary },
                        ]}
                      >
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={items}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.optionItem,
                          value === item.value && {
                            backgroundColor: isDark
                              ? colors.dark.primaryBackground
                              : colors.light.primaryBackground,
                          },
                        ]}
                        onPress={() => {
                          onChange(item.value);
                          setIsOpen(false);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: value === item.value }}
                      >
                        <View style={styles.optionContent}>
                          <Text
                            style={[
                              styles.optionLabel,
                              {
                                color: isDark ? colors.dark.text : colors.light.text,
                                fontWeight: value === item.value ? '600' : '400',
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                          {item.description && (
                            <Text
                              style={[
                                styles.optionDescription,
                                {
                                  color: isDark
                                    ? colors.dark.textSecondary
                                    : colors.light.textSecondary,
                                },
                              ]}
                            >
                              {item.description}
                            </Text>
                          )}
                        </View>
                        {value === item.value && (
                          <Text
                            style={[
                              styles.checkmark,
                              { color: colors.light.primary },
                            ]}
                          >
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                    style={styles.optionsList}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
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
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  arrow: {
    fontSize: 12,
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
    maxHeight: '70%',
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
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 17,
    fontWeight: '500',
  },
  optionsList: {
    paddingVertical: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  optionContent: {
    flex: 1,
    marginRight: 10,
  },
  optionLabel: {
    fontSize: 16,
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '600',
  },
});