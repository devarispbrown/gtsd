import { create } from 'zustand';
import {
  Evidence,
  EvidenceType,
  EvidenceData,
  CreateEvidenceRequest,
  WorkoutMetrics,
  CardioMetrics,
  MealMetrics,
  WeightMetrics,
} from '../types/tasks';
import { taskApi } from '../api/taskService';
import { useTodayStore } from './todayStore';

interface EvidenceFormData {
  type: EvidenceType;
  text?: string;
  metrics?: WorkoutMetrics | CardioMetrics | MealMetrics | WeightMetrics;
  photoUri?: string;
  notes?: string;
}

interface EvidenceState {
  // Current evidence being created
  currentTaskId: number | null;
  formData: EvidenceFormData;

  // Photo management
  selectedPhotoUri: string | null;
  isUploadingPhoto: boolean;

  // Submission state
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;

  // Recent evidence cache
  recentEvidence: Map<number, Evidence[]>; // taskId -> Evidence[]

  // Actions
  initializeEvidence: (taskId: number, type: EvidenceType) => void;
  setFormData: (data: Partial<EvidenceFormData>) => void;
  setTextField: (text: string) => void;
  setMetrics: (metrics: any) => void;
  setPhotoUri: (uri: string | null) => void;
  setNotes: (notes: string) => void;

  // Photo actions
  selectPhoto: (uri: string) => void;
  removePhoto: () => void;
  uploadPhoto: () => Promise<string | null>;

  // Form validation
  isFormValid: () => boolean;
  getValidationErrors: () => string[];

  // Submit evidence
  submitEvidence: () => Promise<boolean>;

  // Reset/Clear
  resetForm: () => void;
  clearError: () => void;
  clearSuccess: () => void;

  // Cache management
  cacheEvidence: (taskId: number, evidence: Evidence) => void;
  getCachedEvidence: (taskId: number) => Evidence[] | undefined;
  clearCache: () => void;
}

const initialFormData: EvidenceFormData = {
  type: 'text_log',
  text: '',
  metrics: undefined,
  photoUri: undefined,
  notes: '',
};

export const useEvidenceStore = create<EvidenceState>((set, get) => ({
  // Initial state
  currentTaskId: null,
  formData: initialFormData,
  selectedPhotoUri: null,
  isUploadingPhoto: false,
  isSubmitting: false,
  submitError: null,
  submitSuccess: false,
  recentEvidence: new Map(),

  // Initialize evidence for a task
  initializeEvidence: (taskId: number, type: EvidenceType) => {
    set({
      currentTaskId: taskId,
      formData: { ...initialFormData, type },
      submitError: null,
      submitSuccess: false,
    });
  },

  // Set form data
  setFormData: (data: Partial<EvidenceFormData>) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
    }));
  },

  // Set text field
  setTextField: (text: string) => {
    set((state) => ({
      formData: { ...state.formData, text },
    }));
  },

  // Set metrics
  setMetrics: (metrics: any) => {
    set((state) => ({
      formData: { ...state.formData, metrics },
    }));
  },

  // Set photo URI
  setPhotoUri: (uri: string | null) => {
    set((state) => ({
      formData: { ...state.formData, photoUri: uri || undefined },
      selectedPhotoUri: uri,
    }));
  },

  // Set notes
  setNotes: (notes: string) => {
    set((state) => ({
      formData: { ...state.formData, notes },
    }));
  },

  // Select photo
  selectPhoto: (uri: string) => {
    set({
      selectedPhotoUri: uri,
      formData: { ...get().formData, photoUri: uri },
    });
  },

  // Remove photo
  removePhoto: () => {
    set({
      selectedPhotoUri: null,
      formData: { ...get().formData, photoUri: undefined },
    });
  },

  // Upload photo
  uploadPhoto: async () => {
    const { currentTaskId, selectedPhotoUri } = get();

    if (!currentTaskId || !selectedPhotoUri) {
      return null;
    }

    set({ isUploadingPhoto: true, submitError: null });

    try {
      const result = await taskApi.uploadPhoto(currentTaskId, selectedPhotoUri);

      if (result.data) {
        set({ isUploadingPhoto: false });
        return result.data.url;
      } else {
        set({
          isUploadingPhoto: false,
          submitError: result.error || 'Failed to upload photo',
        });
        return null;
      }
    } catch (error) {
      set({
        isUploadingPhoto: false,
        submitError: 'Failed to upload photo',
      });
      return null;
    }
  },

  // Validate form
  isFormValid: () => {
    const { formData } = get();

    switch (formData.type) {
      case 'text_log':
        return !!formData.text && formData.text.trim().length > 0;

      case 'metrics':
        if (!formData.metrics) return false;

        // Validate based on metric type
        if ('exercises' in formData.metrics) {
          // Workout metrics
          return formData.metrics.exercises?.length > 0;
        } else if ('duration' in formData.metrics) {
          // Cardio metrics
          return formData.metrics.duration > 0;
        } else if ('weight' in formData.metrics) {
          // Weight metrics
          return formData.metrics.weight > 0;
        } else if ('calories' in formData.metrics) {
          // Meal metrics
          return formData.metrics.calories !== undefined;
        }
        return false;

      case 'photo_reference':
        return !!formData.photoUri;

      default:
        return false;
    }
  },

  // Get validation errors
  getValidationErrors: () => {
    const errors: string[] = [];
    const { formData } = get();

    switch (formData.type) {
      case 'text_log':
        if (!formData.text || formData.text.trim().length === 0) {
          errors.push('Please enter some text');
        }
        break;

      case 'metrics':
        if (!formData.metrics) {
          errors.push('Please enter metrics');
        }
        break;

      case 'photo_reference':
        if (!formData.photoUri) {
          errors.push('Please select a photo');
        }
        break;
    }

    return errors;
  },

  // Submit evidence
  submitEvidence: async () => {
    const state = get();
    const { currentTaskId, formData } = state;

    if (!currentTaskId) {
      set({ submitError: 'No task selected' });
      return false;
    }

    if (!state.isFormValid()) {
      const errors = state.getValidationErrors();
      set({ submitError: errors.join(', ') });
      return false;
    }

    set({ isSubmitting: true, submitError: null });

    try {
      // Upload photo if needed
      let photoUrl: string | undefined;
      if (formData.type === 'photo_reference' && formData.photoUri) {
        photoUrl = await state.uploadPhoto() || undefined;
        if (!photoUrl) {
          set({ isSubmitting: false });
          return false;
        }
      }

      // Prepare evidence data
      const evidenceData: EvidenceData = {};

      if (formData.type === 'text_log') {
        evidenceData.text = formData.text;
      } else if (formData.type === 'metrics') {
        evidenceData.metrics = formData.metrics;
      } else if (formData.type === 'photo_reference') {
        evidenceData.photoUrl = photoUrl;
      }

      // Submit evidence
      const result = await taskApi.completeTask(currentTaskId, {
        type: formData.type,
        data: evidenceData,
        notes: formData.notes,
      });

      if (result.data) {
        // Update task status in today store
        useTodayStore.getState().optimisticUpdateTask(currentTaskId, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });

        // Cache the evidence
        const newEvidence: Evidence = {
          id: Date.now(), // Temporary ID
          taskId: currentTaskId,
          type: formData.type,
          data: evidenceData,
          notes: formData.notes,
          createdAt: new Date().toISOString(),
        };

        state.cacheEvidence(currentTaskId, newEvidence);

        set({
          isSubmitting: false,
          submitSuccess: true,
          submitError: null,
        });

        // Reset form after a short delay
        setTimeout(() => {
          state.resetForm();
        }, 1500);

        return true;
      } else {
        set({
          isSubmitting: false,
          submitError: result.error || 'Failed to submit evidence',
        });
        return false;
      }
    } catch (error) {
      set({
        isSubmitting: false,
        submitError: 'An unexpected error occurred',
      });
      return false;
    }
  },

  // Reset form
  resetForm: () => {
    set({
      currentTaskId: null,
      formData: initialFormData,
      selectedPhotoUri: null,
      isUploadingPhoto: false,
      isSubmitting: false,
      submitError: null,
      submitSuccess: false,
    });
  },

  // Clear error
  clearError: () => set({ submitError: null }),

  // Clear success
  clearSuccess: () => set({ submitSuccess: false }),

  // Cache evidence
  cacheEvidence: (taskId: number, evidence: Evidence) => {
    set((state) => {
      const newCache = new Map(state.recentEvidence);
      const existing = newCache.get(taskId) || [];
      newCache.set(taskId, [...existing, evidence]);
      return { recentEvidence: newCache };
    });
  },

  // Get cached evidence
  getCachedEvidence: (taskId: number) => {
    return get().recentEvidence.get(taskId);
  },

  // Clear cache
  clearCache: () => {
    set({ recentEvidence: new Map() });
  },
}));