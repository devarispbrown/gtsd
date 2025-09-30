// Enhanced task types for GTSD fitness app
export type TaskType =
  | 'workout'
  | 'supplement'
  | 'meal'
  | 'hydration'
  | 'cardio'
  | 'weight_log'
  | 'progress_photo';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type EvidenceType = 'text_log' | 'metrics' | 'photo_reference';

export interface Task {
  id: number;
  title: string;
  description?: string;
  taskType: TaskType;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  evidence?: Evidence[];
  timeEstimate?: number; // in minutes
}

export interface Evidence {
  id: number;
  taskId: number;
  type: EvidenceType;
  data: EvidenceData;
  notes?: string;
  createdAt: string;
}

export interface EvidenceData {
  text?: string;
  metrics?: WorkoutMetrics | CardioMetrics | MealMetrics | WeightMetrics;
  photoUrl?: string;
}

export interface WorkoutMetrics {
  exercises?: Array<{
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    unit?: 'lbs' | 'kg';
  }>;
  duration?: number; // minutes
}

export interface CardioMetrics {
  distance?: number;
  distanceUnit?: 'km' | 'miles';
  duration: number; // minutes
  avgHeartRate?: number;
  calories?: number;
}

export interface MealMetrics {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface WeightMetrics {
  weight: number;
  unit: 'lbs' | 'kg';
  bodyFat?: number;
  muscleMass?: number;
}

export interface StreakData {
  current: number;
  longest: number;
  totalDays: number;
  lastActiveDate: string;
}

export interface TodayTasksResponse {
  tasks: TaskGroup[];
  streaks: StreakData;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
}

export interface TaskGroup {
  type: TaskType;
  tasks: Task[];
  completedCount: number;
  totalCount: number;
}

export interface CreateEvidenceRequest {
  taskId: number;
  type: EvidenceType;
  data: EvidenceData;
  notes?: string;
}

export interface TasksQueryParams {
  date?: string; // YYYY-MM-DD
  limit?: number;
  offset?: number;
  type?: TaskType;
}

// Task type specific metadata interfaces
export interface WorkoutTaskMetadata {
  targetMuscleGroups?: string[];
  equipment?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface MealTaskMetadata {
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe?: string;
  prepTime?: number; // minutes
}

export interface SupplementTaskMetadata {
  supplementName: string;
  dosage: string;
  timing?: 'morning' | 'afternoon' | 'evening' | 'with_meal' | 'before_workout' | 'after_workout';
}

// Helper type guards
export function isWorkoutTask(task: Task): task is Task & { metadata: WorkoutTaskMetadata } {
  return task.taskType === 'workout';
}

export function isMealTask(task: Task): task is Task & { metadata: MealTaskMetadata } {
  return task.taskType === 'meal';
}

export function isSupplementTask(task: Task): task is Task & { metadata: SupplementTaskMetadata } {
  return task.taskType === 'supplement';
}

// Icon mapping for task types
export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  workout: 'fitness-center',
  supplement: 'medication',
  meal: 'restaurant',
  hydration: 'water-drop',
  cardio: 'directions-run',
  weight_log: 'monitor-weight',
  progress_photo: 'photo-camera',
};

// Color mapping for task types
export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  workout: '#FF6B6B',
  supplement: '#4ECDC4',
  meal: '#45B7D1',
  hydration: '#96E6B3',
  cardio: '#FFA07A',
  weight_log: '#DDA15E',
  progress_photo: '#BC6C25',
};