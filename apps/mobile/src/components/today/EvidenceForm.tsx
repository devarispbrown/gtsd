import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  useColorScheme,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  MediaType,
  PhotoQuality,
} from 'react-native-image-picker';
import { useEvidenceStore } from '../../stores/evidenceStore';
import { EvidenceType, TaskType } from '../../types/tasks';
import { colors } from '../../constants/colors';

interface EvidenceFormProps {
  type: EvidenceType;
  taskType: TaskType;
}

export const EvidenceForm: React.FC<EvidenceFormProps> = ({ type, taskType }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  const {
    formData,
    setTextField,
    setMetrics,
    setPhotoUri,
    setNotes,
    selectedPhotoUri,
  } = useEvidenceStore();

  // Text Log Form Component
  const TextLogForm: React.FC = () => {
    return (
      <View style={styles.formSection}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.textArea, { color: theme.text, borderColor: theme.separator }]}
          value={formData.text}
          onChangeText={setTextField}
          placeholder="Describe how you completed this task..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Task completion notes"
        />
      </View>
    );
  };

  // Metrics Form Component
  const MetricsForm: React.FC = () => {
    const [metrics, setLocalMetrics] = useState<any>({});

    const handleMetricChange = useCallback((field: string, value: string) => {
      const numValue = value === '' ? undefined : parseFloat(value);
      const newMetrics = { ...metrics, [field]: numValue };
      setLocalMetrics(newMetrics);
      setMetrics(newMetrics);
    }, [metrics]);

    const renderWorkoutMetrics = () => (
      <>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Sets</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.sets?.toString() || ''}
            onChangeText={(value) => handleMetricChange('sets', value)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Reps</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.reps?.toString() || ''}
            onChangeText={(value) => handleMetricChange('reps', value)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Weight (lbs)</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.weight?.toString() || ''}
            onChangeText={(value) => handleMetricChange('weight', value)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      </>
    );

    const renderCardioMetrics = () => (
      <>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Duration (min)</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.duration?.toString() || ''}
            onChangeText={(value) => handleMetricChange('duration', value)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Distance (miles)</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.distance?.toString() || ''}
            onChangeText={(value) => handleMetricChange('distance', value)}
            keyboardType="decimal-pad"
            placeholder="0.0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Calories</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.calories?.toString() || ''}
            onChangeText={(value) => handleMetricChange('calories', value)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      </>
    );

    const renderMealMetrics = () => (
      <>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Calories</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.calories?.toString() || ''}
            onChangeText={(value) => handleMetricChange('calories', value)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Protein (g)</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.protein?.toString() || ''}
            onChangeText={(value) => handleMetricChange('protein', value)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Carbs (g)</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.carbs?.toString() || ''}
            onChangeText={(value) => handleMetricChange('carbs', value)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Fat (g)</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.fat?.toString() || ''}
            onChangeText={(value) => handleMetricChange('fat', value)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      </>
    );

    const renderWeightLogMetrics = () => (
      <>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Weight (lbs)</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.weight?.toString() || ''}
            onChangeText={(value) => handleMetricChange('weight', value)}
            keyboardType="decimal-pad"
            placeholder="0.0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Body Fat %</Text>
          <TextInput
            style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
            value={metrics.bodyFat?.toString() || ''}
            onChangeText={(value) => handleMetricChange('bodyFat', value)}
            keyboardType="decimal-pad"
            placeholder="0.0"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      </>
    );

    const renderDefaultMetrics = () => (
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>Value</Text>
        <TextInput
          style={[styles.metricInput, { color: theme.text, borderColor: theme.separator }]}
          value={metrics.value?.toString() || ''}
          onChangeText={(value) => handleMetricChange('value', value)}
          keyboardType="numeric"
          placeholder="Enter value"
          placeholderTextColor={theme.textSecondary}
        />
      </View>
    );

    return (
      <View style={styles.formSection}>
        <Text style={styles.label}>Metrics</Text>
        <View style={styles.metricsContainer}>
          {taskType === 'workout' && renderWorkoutMetrics()}
          {taskType === 'cardio' && renderCardioMetrics()}
          {taskType === 'meal' && renderMealMetrics()}
          {taskType === 'weight_log' && renderWeightLogMetrics()}
          {taskType === 'supplement' && renderDefaultMetrics()}
          {taskType === 'hydration' && renderDefaultMetrics()}
          {taskType === 'progress_photo' && renderDefaultMetrics()}
        </View>
      </View>
    );
  };

  // Photo Form Component
  const PhotoForm: React.FC = () => {
    const handleSelectPhoto = useCallback(() => {
      const options = {
        mediaType: 'photo' as MediaType,
        quality: 0.8 as PhotoQuality,
        maxWidth: 1920,
        maxHeight: 1920,
      };

      Alert.alert(
        'Select Photo',
        'Choose from where you want to select a photo',
        [
          { text: 'Camera', onPress: () => handleLaunchCamera(options) },
          { text: 'Gallery', onPress: () => handleLaunchGallery(options) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }, []);

    const handleLaunchCamera = useCallback((options: any) => {
      launchCamera(options, handleImageResponse);
    }, []);

    const handleLaunchGallery = useCallback((options: any) => {
      launchImageLibrary(options, handleImageResponse);
    }, []);

    const handleImageResponse = useCallback((response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setPhotoUri(asset.uri || null);
      }
    }, []);

    const handleRemovePhoto = useCallback(() => {
      setPhotoUri(null);
    }, []);

    return (
      <View style={styles.formSection}>
        <Text style={styles.label}>Photo Evidence</Text>

        {selectedPhotoUri ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: selectedPhotoUri }} style={styles.photoPreview} />
            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={handleRemovePhoto}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Text style={styles.removePhotoText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.photoButton, { backgroundColor: theme.card, borderColor: theme.separator }]}
            onPress={handleSelectPhoto}
            accessibilityRole="button"
            accessibilityLabel="Select photo"
          >
            <Text style={styles.photoButtonIcon}>📸</Text>
            <Text style={styles.photoButtonText}>Tap to add photo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    formSection: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    textArea: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      minHeight: 100,
    },
    metricsContainer: {
      gap: 12,
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    metricLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      flex: 1,
    },
    metricInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      textAlign: 'center',
    },
    photoContainer: {
      alignItems: 'center',
    },
    photoButton: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoButtonIcon: {
      fontSize: 48,
      marginBottom: 8,
    },
    photoButtonText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    photoPreview: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginBottom: 12,
    },
    removePhotoButton: {
      backgroundColor: theme.error,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
    },
    removePhotoText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    notesInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      minHeight: 60,
      marginTop: 12,
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {type === 'text_log' && <TextLogForm />}
        {type === 'metrics' && <MetricsForm />}
        {type === 'photo_reference' && <PhotoForm />}

        {/* Additional notes field for all evidence types */}
        {type !== 'text_log' && (
          <View style={styles.formSection}>
            <Text style={styles.label}>Additional Notes (Optional)</Text>
            <TextInput
              style={[styles.notesInput, { color: theme.text, borderColor: theme.separator }]}
              value={formData.notes}
              onChangeText={setNotes}
              placeholder="Any additional notes..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};