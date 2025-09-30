export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  searchTerm?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}