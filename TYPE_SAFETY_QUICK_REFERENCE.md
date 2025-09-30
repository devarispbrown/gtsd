# TypeScript Type Safety Quick Reference

Quick reference guide for using the enhanced type system in GTSD.

## Table of Contents

1. [Using Shared Types](#using-shared-types)
2. [API Client Usage](#api-client-usage)
3. [Store Usage](#store-usage)
4. [Navigation](#navigation)
5. [Type Guards](#type-guards)
6. [Common Patterns](#common-patterns)

---

## Using Shared Types

### Import Types

```typescript
import {
  // Enums
  TaskType,
  TaskStatus,
  EvidenceType,

  // Entities
  DailyTask,
  Evidence,
  TaskWithEvidence,

  // API Types
  GetTodayTasksResponse,
  CreateEvidenceRequest,
  LoadingState,

  // Type Guards
  isWorkoutTask,
  isCompletedTask,
  isApiSuccess,
} from '@gtsd/shared-types';
```

### Check Available Types

All types are exported from `@gtsd/shared-types/src/index.ts`. Categories:

- **Enums**: `enums.ts`
- **Entities**: `entities.ts`
- **Task Metadata**: `task-metadata.ts`
- **Evidence Metrics**: `evidence-metrics.ts`
- **API Types**: `api-types.ts`
- **Type Guards**: `type-guards.ts`

---

## API Client Usage

### Fetch Today's Tasks

```typescript
import { api } from '@/api/client';

// Basic usage
const response = await api.tasks.getTodayTasks();

if (response.data) {
  const { tasksByType, streak, pagination } = response.data;
  console.log('Tasks:', tasksByType);
  console.log('Streak:', streak.current);
}

if (response.error) {
  console.error('Error:', response.error);
}

// With query parameters
const filtered = await api.tasks.getTodayTasks({
  date: '2025-09-29',
  limit: 20,
  offset: 0,
  type: TaskType.Workout,
});
```

### Create Evidence

```typescript
import { api } from '@/api/client';
import { EvidenceType } from '@gtsd/shared-types';

// Text log evidence
const textResponse = await api.evidence.createEvidence({
  taskId: 123,
  type: EvidenceType.TextLog,
  data: { text: 'Completed 3 sets of 10 reps' },
  notes: 'Felt great!',
});

// Metrics evidence
const metricsResponse = await api.evidence.createEvidence({
  taskId: 124,
  type: EvidenceType.Metrics,
  data: {
    metrics: {
      actualSets: 3,
      actualReps: 10,
      actualWeight: 50,
    },
  },
});

// Photo evidence
const photoResponse = await api.evidence.createEvidence({
  taskId: 125,
  type: EvidenceType.PhotoReference,
  data: {
    photoUrl: 'https://example.com/photo.jpg',
  },
});
```

---

## Store Usage

### Basic Store Access

```typescript
import { useTaskStore, useTaskSelector, taskSelectors } from '@/store/taskStoreEnhanced';

function MyComponent() {
  // Option 1: Direct store access
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTasks = useTaskStore((state) => state.fetchTodayTasks);

  // Option 2: Using selectors (recommended)
  const todayTasks = useTaskSelector(taskSelectors.selectTodayTasks);
  const isLoading = useTaskSelector(taskSelectors.selectIsLoading);
  const stats = useTaskSelector(taskSelectors.selectCompletionStats);

  // Fetch tasks
  useEffect(() => {
    fetchTasks('2025-09-29');
  }, [fetchTasks]);

  return (
    <View>
      {isLoading && <Spinner />}
      {todayTasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </View>
  );
}
```

### Available Selectors

```typescript
import { taskSelectors } from '@/store/taskStoreEnhanced';

// Select today's tasks
const todayTasks = useTaskSelector(taskSelectors.selectTodayTasks);

// Select task by ID
const task = useTaskSelector(taskSelectors.selectTaskById(123));

// Select tasks by type
const workouts = useTaskSelector(taskSelectors.selectTasksByType(TaskType.Workout));

// Select tasks by status
const pending = useTaskSelector(taskSelectors.selectTasksByStatus(TaskStatus.Pending));

// Select loading state
const loadingState = useTaskSelector(taskSelectors.selectTodayTasksState);

// Select if loading
const isLoading = useTaskSelector(taskSelectors.selectIsLoading);

// Select error
const error = useTaskSelector(taskSelectors.selectError);

// Select completion stats
const stats = useTaskSelector(taskSelectors.selectCompletionStats);
// Returns: { completed: number, pending: number, total: number, percentage: number }
```

### Working with Loading States

```typescript
import { LoadingState, isIdle, isLoading, isSuccess, isError } from '@gtsd/shared-types';

const loadingState = useTaskSelector(taskSelectors.selectTodayTasksState);

// Type narrowing with status
if (loadingState.status === 'loading') {
  return <Spinner />;
}

if (loadingState.status === 'success') {
  // TypeScript knows loadingState.data is available here
  return <TaskList data={loadingState.data} />;
}

if (loadingState.status === 'error') {
  // TypeScript knows loadingState.error is available here
  return <ErrorMessage error={loadingState.error} />;
}

// Or use type guards
if (isLoading(loadingState)) {
  return <Spinner />;
}

if (isSuccess(loadingState)) {
  return <TaskList data={loadingState.data} />;
}

if (isError(loadingState)) {
  return <ErrorMessage error={loadingState.error} />;
}
```

---

## Navigation

### Navigate Between Screens

```typescript
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '@/types/navigation';
import { TaskType } from '@gtsd/shared-types';

function MyComponent() {
  const navigation = useNavigation<RootNavigationProp>();

  // Navigate to screen without params
  navigation.navigate('Today');

  // Navigate with params (type-safe!)
  navigation.navigate('TaskDetail', { taskId: 123 });

  // TypeScript error - wrong param type
  // navigation.navigate('TaskDetail', { taskId: '123' }); // Error!

  // Navigate to add evidence
  navigation.navigate('AddEvidence', {
    taskId: 123,
    taskType: TaskType.Workout,
  });

  // Navigate to evidence detail
  navigation.navigate('EvidenceDetail', {
    evidenceId: 456,
    taskId: 123,
  });
}
```

### Access Route Params

```typescript
import { TaskDetailScreenProps, hasParams } from '@/types/navigation';

function TaskDetailScreen({ route, navigation }: TaskDetailScreenProps) {
  // Option 1: Direct access (params are guaranteed to exist for this route)
  const { taskId } = route.params;

  // Option 2: With type guard (for optional params)
  if (hasParams(route)) {
    const { taskId } = route.params;
  }

  // Fetch task
  const task = useTaskSelector(taskSelectors.selectTaskById(taskId));

  return <View>{/* ... */}</View>;
}
```

---

## Type Guards

### Task Type Guards

```typescript
import {
  isWorkoutTask,
  isMealTask,
  isHydrationTask,
  isCardioTask,
  isWeightLogTask,
} from '@gtsd/shared-types';

function handleTask(task: DailyTask) {
  if (isWorkoutTask(task)) {
    // TypeScript knows task.taskType is TaskType.Workout
    console.log('Workout:', task.title);
  }

  if (isMealTask(task)) {
    // TypeScript knows task.taskType is TaskType.Meal
    console.log('Meal:', task.title);
  }
}
```

### Status Type Guards

```typescript
import {
  isCompletedTask,
  isPendingTask,
  isInProgressTask,
  isSkippedTask,
} from '@gtsd/shared-types';

function TaskBadge({ task }: { task: DailyTask }) {
  if (isCompletedTask(task)) {
    return <Badge color="green">Completed</Badge>;
  }

  if (isPendingTask(task)) {
    return <Badge color="yellow">Pending</Badge>;
  }

  if (isInProgressTask(task)) {
    return <Badge color="blue">In Progress</Badge>;
  }

  return null;
}
```

### Metadata Type Guards

```typescript
import {
  isWorkoutMetadata,
  isMealMetadata,
  isCardioMetadata,
} from '@gtsd/shared-types';

function TaskMetadataDisplay({ task }: { task: DailyTask }) {
  const metadata = task.metadata;

  if (isWorkoutMetadata(metadata)) {
    // TypeScript knows metadata is WorkoutMetadata
    return (
      <View>
        <Text>Exercise: {metadata.exerciseName}</Text>
        <Text>Sets: {metadata.sets}</Text>
        <Text>Reps: {metadata.reps}</Text>
      </View>
    );
  }

  if (isMealMetadata(metadata)) {
    // TypeScript knows metadata is MealMetadata
    return (
      <View>
        <Text>Meal: {metadata.mealType}</Text>
        <Text>Calories: {metadata.targetCalories}</Text>
      </View>
    );
  }

  return null;
}
```

### Evidence Type Guards

```typescript
import {
  isMetricsEvidence,
  isTextLogEvidence,
  isPhotoReferenceEvidence,
} from '@gtsd/shared-types';

function EvidenceDisplay({ evidence }: { evidence: Evidence }) {
  if (isMetricsEvidence(evidence)) {
    return <MetricsView metrics={evidence.metrics} />;
  }

  if (isTextLogEvidence(evidence)) {
    return <TextView text={evidence.notes} />;
  }

  if (isPhotoReferenceEvidence(evidence)) {
    return <Image source={{ uri: evidence.photoUrl }} />;
  }

  return null;
}
```

---

## Common Patterns

### Pattern 1: Loading State with Data Fetching

```typescript
function TaskListScreen() {
  const fetchTasks = useTaskStore((state) => state.fetchTodayTasks);
  const loadingState = useTaskSelector(taskSelectors.selectTodayTasksState);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  switch (loadingState.status) {
    case 'idle':
      return <Text>Ready to load</Text>;
    case 'loading':
      return <Spinner />;
    case 'success':
      return <TaskList tasks={loadingState.data.tasksByType} />;
    case 'error':
      return <ErrorMessage error={loadingState.error.message} />;
  }
}
```

### Pattern 2: Type-Safe API Call with Error Handling

```typescript
async function handleCompleteTask(taskId: number) {
  try {
    const response = await api.evidence.createEvidence({
      taskId,
      type: EvidenceType.TextLog,
      data: { text: 'Task completed' },
    });

    if (response.error) {
      Alert.alert('Error', response.error);
      return;
    }

    if (response.data) {
      const { task, evidence, streakUpdated, newStreak } = response.data;

      if (streakUpdated) {
        Alert.alert('Streak!', `You're on a ${newStreak} day streak!`);
      }

      // Update local state
      // ...
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}
```

### Pattern 3: Filtering Tasks by Type

```typescript
function WorkoutList() {
  const workouts = useTaskSelector(
    taskSelectors.selectTasksByType(TaskType.Workout)
  );

  const pendingWorkouts = workouts.filter(isPendingTask);
  const completedWorkouts = workouts.filter(isCompletedTask);

  return (
    <View>
      <SectionList
        sections={[
          { title: 'Pending', data: pendingWorkouts },
          { title: 'Completed', data: completedWorkouts },
        ]}
        renderItem={({ item }) => <TaskCard task={item} />}
      />
    </View>
  );
}
```

### Pattern 4: Conditional Rendering Based on Task Type

```typescript
function TaskCard({ task }: { task: TaskWithEvidence }) {
  // Use type guard to narrow type
  if (isWorkoutTask(task)) {
    return <WorkoutTaskCard task={task} />;
  }

  if (isMealTask(task)) {
    return <MealTaskCard task={task} />;
  }

  if (isHydrationTask(task)) {
    return <HydrationTaskCard task={task} />;
  }

  // Fallback for other types
  return <GenericTaskCard task={task} />;
}
```

### Pattern 5: Creating Evidence with Different Types

```typescript
function AddEvidenceForm({ task }: { task: DailyTask }) {
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    let request: CreateEvidenceRequest;

    if (isWorkoutTask(task)) {
      request = {
        taskId: task.id,
        type: EvidenceType.Metrics,
        data: {
          metrics: {
            actualSets: 3,
            actualReps: 10,
            actualWeight: 50,
          },
        },
        notes,
      };
    } else if (isMealTask(task)) {
      request = {
        taskId: task.id,
        type: EvidenceType.Metrics,
        data: {
          metrics: {
            actualCalories: 500,
            actualProtein: 30,
          },
        },
        notes,
      };
    } else {
      request = {
        taskId: task.id,
        type: EvidenceType.TextLog,
        data: { text: notes },
      };
    }

    const response = await api.evidence.createEvidence(request);
    // Handle response...
  }

  return <Form onSubmit={handleSubmit} />;
}
```

---

## Tips and Tricks

### Tip 1: Use Type Inference

Let TypeScript infer types where possible:

```typescript
// Good - TypeScript infers the type
const todayTasks = useTaskSelector(taskSelectors.selectTodayTasks);

// Unnecessary - explicit type annotation not needed
const todayTasks: TaskWithEvidence[] = useTaskSelector(taskSelectors.selectTodayTasks);
```

### Tip 2: Leverage Discriminated Unions

Use the `status` field for type narrowing:

```typescript
function handleLoadingState(state: LoadingState<GetTodayTasksResponse>) {
  if (state.status === 'success') {
    // TypeScript knows state.data exists and state.error is null
    console.log(state.data);
  }
}
```

### Tip 3: Create Custom Hooks

Encapsulate common patterns:

```typescript
function useTaskById(taskId: number) {
  return useTaskSelector(taskSelectors.selectTaskById(taskId));
}

function useTodayWorkouts() {
  return useTaskSelector(
    taskSelectors.selectTasksByType(TaskType.Workout)
  );
}

function useCompletionStats() {
  return useTaskSelector(taskSelectors.selectCompletionStats);
}
```

### Tip 4: Type Your Props

Always type component props explicitly:

```typescript
interface TaskCardProps {
  task: TaskWithEvidence;
  onPress?: (task: TaskWithEvidence) => void;
  onComplete?: (taskId: number) => void;
}

function TaskCard({ task, onPress, onComplete }: TaskCardProps) {
  // ...
}
```

### Tip 5: Use Const Assertions

For literal types:

```typescript
const TASK_COLORS = {
  [TaskType.Workout]: '#FF6B6B',
  [TaskType.Meal]: '#4ECDC4',
  [TaskType.Hydration]: '#45B7D1',
} as const;

type TaskColor = typeof TASK_COLORS[TaskType];
```

---

## Troubleshooting

### Issue: "Cannot find module '@gtsd/shared-types'"

**Solution**: Ensure the package is built:

```bash
cd packages/shared-types
pnpm build
```

Or from root:

```bash
pnpm --filter @gtsd/shared-types build
```

### Issue: Type errors after updating shared types

**Solution**: Rebuild all packages:

```bash
pnpm build
```

### Issue: IDE not recognizing types

**Solution**: Restart TypeScript server in your IDE:

- VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
- Or restart your IDE

---

## Additional Resources

- **Full Report**: See `TYPE_SAFETY_ENHANCEMENT_REPORT.md` for detailed documentation
- **Shared Types Source**: `/packages/shared-types/src/`
- **API Schema**: `/apps/api/src/db/schema.ts`
- **API Service**: `/apps/api/src/routes/tasks/service.ts`

---

**Last Updated**: September 29, 2025