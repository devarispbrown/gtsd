import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '@constants/colors';
import { useThemeStore } from '@store/themeStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { StepIndicator } from '../../components/onboarding/StepIndicator';
import { FormInput } from '../../components/onboarding/FormInput';
import { Picker, PickerItem } from '../../components/onboarding/Picker';
import { PartnerCard } from '../../components/onboarding/PartnerCard';
import { AccountabilityPartner, RelationshipType } from '../../types/onboarding';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type Props = NativeStackScreenProps<any, 'Partners'>;

const relationshipOptions: PickerItem[] = [
  { label: 'Spouse', value: 'spouse' },
  { label: 'Partner', value: 'partner' },
  { label: 'Friend', value: 'friend' },
  { label: 'Family', value: 'family' },
  { label: 'Coach', value: 'coach' },
  { label: 'Colleague', value: 'colleague' },
  { label: 'Other', value: 'other' },
];

// Schema for individual partner form
const partnerFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  relationship: z.enum(['spouse', 'partner', 'friend', 'family', 'coach', 'colleague', 'other'] as const),
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone is required',
    path: ['email'],
  }
);

type PartnerFormData = z.infer<typeof partnerFormSchema>;

export function PartnersScreen({ navigation }: Props) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const {
    stepIndex,
    totalSteps,
    data,
    saveStepData,
    goToNextStep,
    goToPreviousStep,
  } = useOnboarding();

  const [partners, setPartners] = useState<AccountabilityPartner[]>((data.partners as AccountabilityPartner[]) || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<AccountabilityPartner | null>(null);

  const partnerForm = useForm<PartnerFormData>({
    resolver: zodResolver(partnerFormSchema),
    mode: 'onChange',
  });

  const {
    control,
    handleSubmit: handlePartnerSubmit,
    formState: { errors: partnerErrors, isValid: isPartnerValid },
    reset: resetPartnerForm,
  } = partnerForm;

  const onSubmit = async () => {
    await saveStepData({ partners });
    await goToNextStep();
    navigation.navigate('Review');
  };

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  const handleAddPartner = () => {
    resetPartnerForm();
    setEditingPartner(null);
    setIsModalOpen(true);
  };

  const handleEditPartner = (partner: AccountabilityPartner) => {
    setEditingPartner(partner);
    resetPartnerForm({
      name: partner.name,
      email: partner.email || '',
      phone: partner.phone || '',
      relationship: partner.relationship as any,
    });
    setIsModalOpen(true);
  };

  const handleDeletePartner = (partnerId: string | number) => {
    setPartners(partners.filter(p => String(p.id) !== String(partnerId)));
  };

  const onPartnerSubmit = (formData: PartnerFormData) => {
    const newPartner: AccountabilityPartner = {
      id: editingPartner?.id || Date.now().toString(),
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      relationship: formData.relationship as RelationshipType,
    };

    if (editingPartner) {
      setPartners(partners.map(p => p.id === editingPartner.id ? newPartner : p));
    } else {
      setPartners([...partners, newPartner]);
    }

    setIsModalOpen(false);
    resetPartnerForm();
    setEditingPartner(null);
  };

  const canAddMore = partners.length < 5;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.dark.background : colors.light.background },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StepIndicator
          currentStep={stepIndex}
          totalSteps={totalSteps}
          stepLabels={[
            'Welcome',
            'Account',
            'Goals',
            'Health',
            'Activity',
            'Preferences',
            'Partners',
            'Review',
          ]}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text
              style={[
                styles.title,
                { color: isDark ? colors.dark.text : colors.light.text },
              ]}
              accessibilityRole="header"
            >
              Accountability Partners
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
              ]}
            >
              Add people who will support your journey (optional)
            </Text>

            {partners.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: isDark
                      ? colors.dark.inputBackground
                      : colors.light.inputBackground,
                    borderColor: isDark ? colors.dark.border : colors.light.border,
                  },
                ]}
              >
                <Text style={styles.emptyIcon}>👥</Text>
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: isDark ? colors.dark.text : colors.light.text },
                  ]}
                >
                  No partners added yet
                </Text>
                <Text
                  style={[
                    styles.emptyDescription,
                    { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                  ]}
                >
                  Research shows that having accountability partners increases success rates by up to 65%
                </Text>
              </View>
            ) : (
              <View style={styles.partnersList}>
                {partners.map((partner) => (
                  <PartnerCard
                    key={partner.id}
                    partner={partner}
                    onEdit={() => handleEditPartner(partner)}
                    onDelete={() => handleDeletePartner(partner.id)}
                  />
                ))}
              </View>
            )}

            {canAddMore && (
              <TouchableOpacity
                style={[
                  styles.addButton,
                  {
                    borderColor: colors.light.primary,
                  },
                ]}
                onPress={handleAddPartner}
                accessibilityLabel="Add accountability partner"
                accessibilityRole="button"
              >
                <Text style={styles.addButtonIcon}>+</Text>
                <Text
                  style={[
                    styles.addButtonText,
                    { color: colors.light.primary },
                  ]}
                >
                  Add Partner
                </Text>
              </TouchableOpacity>
            )}

            {partners.length >= 5 && (
              <Text
                style={[
                  styles.limitText,
                  { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                ]}
              >
                Maximum of 5 partners reached
              </Text>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { borderTopColor: isDark ? colors.dark.border : colors.light.border },
          ]}
        >
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBack}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: isDark ? colors.dark.text : colors.light.text },
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.light.primary },
            ]}
            onPress={onSubmit}
            accessibilityLabel={partners.length === 0 ? "Skip" : "Continue"}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>
              {partners.length === 0 ? 'Skip' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add/Edit Partner Modal */}
        <Modal
          visible={isModalOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsModalOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                  {editingPartner ? 'Edit Partner' : 'Add Partner'}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsModalOpen(false)}
                  style={styles.closeButton}
                >
                  <Text
                    style={[
                      styles.closeButtonText,
                      { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary },
                    ]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                <FormInput
                  control={control}
                  name="name"
                  label="Name"
                  error={partnerErrors.name}
                  required
                  placeholder="Partner's name"
                />

                <FormInput
                  control={control}
                  name="email"
                  label="Email"
                  error={partnerErrors.email}
                  placeholder="partner@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <FormInput
                  control={control}
                  name="phone"
                  label="Phone"
                  error={partnerErrors.phone}
                  placeholder="+1 234 567 8900"
                  keyboardType="phone-pad"
                />

                <Picker
                  control={control}
                  name="relationship"
                  label="Relationship"
                  items={relationshipOptions}
                  error={partnerErrors.relationship}
                  required
                  placeholder="Select relationship"
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalCancelButton,
                    { borderColor: isDark ? colors.dark.border : colors.light.border },
                  ]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text
                    style={[
                      styles.modalButtonText,
                      { color: isDark ? colors.dark.text : colors.light.text },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalSaveButton,
                    {
                      backgroundColor: isPartnerValid
                        ? colors.light.primary
                        : isDark
                        ? colors.dark.inputBackground
                        : colors.light.inputBackground,
                    },
                  ]}
                  onPress={handlePartnerSubmit(onPartnerSubmit)}
                  disabled={!isPartnerValid}
                >
                  <Text
                    style={[
                      styles.modalButtonText,
                      {
                        color: isPartnerValid
                          ? 'white'
                          : isDark
                          ? colors.dark.textDisabled
                          : colors.light.textDisabled,
                      },
                    ]}
                  >
                    {editingPartner ? 'Update' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  partnersList: {
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 12,
  },
  addButtonIcon: {
    fontSize: 24,
    marginRight: 8,
    color: colors.light.primary,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  limitText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
  },
  modalForm: {
    paddingHorizontal: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalSaveButton: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});