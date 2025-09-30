import apiClient, { apiRequest } from './client';
import {
  Task,
  TodayTasksResponse,
  TasksQueryParams,
  CreateEvidenceRequest,
  Evidence,
  TaskStatus,
} from '../types/tasks';

class TaskService {
  // Get today's tasks with optional filters
  async getTodayTasks(params?: TasksQueryParams): Promise<TodayTasksResponse> {
    const queryParams = new URLSearchParams();

    if (params?.date) queryParams.append('date', params.date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.type) queryParams.append('type', params.type);

    const response = await apiClient.get<TodayTasksResponse>(
      `/v1/tasks/today?${queryParams.toString()}`
    );

    return response.data;
  }

  // Get a specific task by ID
  async getTask(taskId: number): Promise<Task> {
    const response = await apiClient.get<Task>(`/v1/tasks/${taskId}`);
    return response.data;
  }

  // Update task status
  async updateTaskStatus(taskId: number, status: TaskStatus): Promise<Task> {
    const response = await apiClient.patch<Task>(`/v1/tasks/${taskId}/status`, {
      status,
    });
    return response.data;
  }

  // Mark task as complete with evidence
  async completeTaskWithEvidence(
    taskId: number,
    evidence: Omit<CreateEvidenceRequest, 'taskId'>
  ): Promise<Task> {
    const response = await apiClient.post<Task>(`/v1/evidence`, {
      taskId,
      ...evidence,
    });
    return response.data;
  }

  // Skip a task
  async skipTask(taskId: number, reason?: string): Promise<Task> {
    const response = await apiClient.patch<Task>(`/v1/tasks/${taskId}/skip`, {
      reason,
    });
    return response.data;
  }

  // Upload photo evidence
  async uploadPhoto(taskId: number, photoUri: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: `task_${taskId}_${Date.now()}.jpg`,
    } as any);

    const response = await apiClient.post<{ url: string }>(
      `/v1/tasks/${taskId}/photo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  // Get task evidence
  async getTaskEvidence(taskId: number): Promise<Evidence[]> {
    const response = await apiClient.get<Evidence[]>(`/v1/tasks/${taskId}/evidence`);
    return response.data;
  }

  // Batch update tasks (for offline sync)
  async batchUpdateTasks(updates: Array<{ taskId: number; status: TaskStatus }>): Promise<Task[]> {
    const response = await apiClient.post<Task[]>('/v1/tasks/batch-update', {
      updates,
    });
    return response.data;
  }

  // Get task statistics for a date range
  async getTaskStats(startDate: string, endDate: string) {
    const response = await apiClient.get('/v1/tasks/stats', {
      params: { startDate, endDate },
    });
    return response.data;
  }
}

// Create singleton instance
const taskService = new TaskService();

// Export wrapped methods with error handling
export const taskApi = {
  getTodayTasks: async (params?: TasksQueryParams) => {
    return apiRequest(() => apiClient.get<TodayTasksResponse>(`/v1/tasks/today`, { params }));
  },

  completeTask: async (taskId: number, evidence: Omit<CreateEvidenceRequest, 'taskId'>) => {
    return apiRequest(() =>
      apiClient.post<Task>(`/v1/evidence`, { taskId, ...evidence })
    );
  },

  updateTaskStatus: async (taskId: number, status: TaskStatus) => {
    return apiRequest(() =>
      apiClient.patch<Task>(`/v1/tasks/${taskId}/status`, { status })
    );
  },

  skipTask: async (taskId: number, reason?: string) => {
    return apiRequest(() =>
      apiClient.patch<Task>(`/v1/tasks/${taskId}/skip`, { reason })
    );
  },

  uploadPhoto: async (taskId: number, photoUri: string) => {
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: `task_${taskId}_${Date.now()}.jpg`,
    } as any);

    return apiRequest(() =>
      apiClient.post<{ url: string }>(`/v1/tasks/${taskId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  },
};

export default taskService;