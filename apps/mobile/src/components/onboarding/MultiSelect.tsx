import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import { Controller, Control, FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';

export interface MultiSelectItem {
  label: string;
  value: string;
  description?: string;
}

interface MultiSelectProps {
  control: Control<any>;
  name: string;
  label: string;
  items: MultiSelectItem[];
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
  required?: boolean;
  placeholder?: string;
  maxSelection?: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  control,
  name,
  label,
  items,
  error,
  required,
  placeholder = 'Select options',
  maxSelection,
}) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  const getSelectedLabels = (values: string[] | undefined): string => {
    if (!values || values.length === 0) return placeholder;
    if (values.length === 1) {
      const item = items.find((i) => i.value === values[0]);
      return item?.label || placeholder;
    }
    return `${values.length} selected`;
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
        render={({ field: { onChange, value } }) => {
          const selectedValues = value || [];

          const toggleSelection = (itemValue: string) => {
            if (selectedValues.includes(itemValue)) {
              onChange(selectedValues.filter((v: string) => v !== itemValue));
            } else {
              if (maxSelection && selectedValues.length >= maxSelection) {
                return; // Don't add if max selection reached
              }
              onChange([...selectedValues, itemValue]);
            }
          };

          return (
            <>
              <TouchableOpacity
                style={[
                  styles.selectButton,
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
                accessibilityLabel={`${label}: ${getSelectedLabels(selectedValues)}`}
                accessibilityHint="Double tap to select options"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.selectText,
                    {
                      color:
                        selectedValues.length > 0
                          ? isDark
                            ? colors.dark.text
                            : colors.light.text
                          : isDark
                          ? colors.dark.textSecondary
                          : colors.light.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {getSelectedLabels(selectedValues)}
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

              {selectedValues.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipsContainer}
                >
                  {selectedValues.map((val: string) => {
                    const item = items.find((i) => i.value === val);
                    return (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isDark
                              ? colors.dark.primaryBackground
                              : colors.light.primaryBackground,
                          },
                        ]}
                        onPress={() => toggleSelection(val)}
                        accessibilityLabel={`Remove ${item?.label}`}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isDark
                                ? colors.dark.primary
                                : colors.light.primary,
                            },
                          ]}
                        >
                          {item?.label}
                        </Text>
                        <Text
                          style={[
                            styles.chipRemove,
                            {
                              color: isDark
                                ? colors.dark.primary
                                : colors.light.primary,
                            },
                          ]}
                        >
                          ×
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

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
                      <View>
                        <Text
                          style={[
                            styles.modalTitle,
                            { color: isDark ? colors.dark.text : colors.light.text },
                          ]}
                        >
                          {label}
                        </Text>
                        {maxSelection && (
                          <Text
                            style={[
                              styles.modalSubtitle,
                              {
                                color: isDark
                                  ? colors.dark.textSecondary
                                  : colors.light.textSecondary,
                              },
                            ]}
                          >
                            Select up to {maxSelection} options
                          </Text>
                        )}
                      </View>
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
                      renderItem={({ item }) => {
                        const isSelected = selectedValues.includes(item.value);
                        const isDisabled =
                          !isSelected &&
                          maxSelection &&
                          selectedValues.length >= maxSelection;

                        return (
                          <TouchableOpacity
                            style={[
                              styles.optionItem,
                              isSelected && {
                                backgroundColor: isDark
                                  ? colors.dark.primaryBackground
                                  : colors.light.primaryBackground,
                              },
                              isDisabled && styles.optionDisabled,
                            ]}
                            onPress={() => !isDisabled && toggleSelection(item.value)}
                            disabled={!!isDisabled}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: isSelected, disabled: !!isDisabled }}
                          >
                            <View style={styles.optionContent}>
                              <Text
                                style={[
                                  styles.optionLabel,
                                  {
                                    color: isDisabled
                                      ? isDark
                                        ? colors.dark.textDisabled
                                        : colors.light.textDisabled
                                      : isDark
                                      ? colors.dark.text
                                      : colors.light.text,
                                    fontWeight: isSelected ? '600' : '400',
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
                                      color: isDisabled
                                        ? isDark
                                          ? colors.dark.textDisabled
                                          : colors.light.textDisabled
                                        : isDark
                                        ? colors.dark.textSecondary
                                        : colors.light.textSecondary,
                                    },
                                  ]}
                                >
                                  {item.description}
                                </Text>
                              )}
                            </View>
                            <View
                              style={[
                                styles.checkbox,
                                {
                                  borderColor: isDisabled
                                    ? isDark
                                      ? colors.dark.textDisabled
                                      : colors.light.textDisabled
                                    : isSelected
                                    ? colors.light.primary
                                    : isDark
                                    ? colors.dark.border
                                    : colors.light.border,
                                  backgroundColor: isSelected
                                    ? colors.light.primary
                                    : 'transparent',
                                },
                              ]}
                            >
                              {isSelected && (
                                <Text style={styles.checkmark}>✓</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                      style={styles.optionsList}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            </>
          );
        }}
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
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  selectText: {
    fontSize: 16,
    flex: 1,
  },
  arrow: {
    fontSize: 12,
  },
  chipsContainer: {
    marginTop: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipRemove: {
    fontSize: 18,
    marginLeft: 6,
    fontWeight: '600',
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
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
  optionDisabled: {
    opacity: 0.5,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});