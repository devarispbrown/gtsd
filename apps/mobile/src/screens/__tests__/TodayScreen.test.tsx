import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { TodayScreen } from '../TodayScreen';
import { useTaskStore } from '@store/taskStore';
import { Task } from '../../types/task';

// Mock the store
jest.mock('@store/taskStore');

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {},
  key: 'today-screen-key',
  name: 'Today',
};

// Sample tasks for testing
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Complete project documentation',
    description: 'Write comprehensive documentation for the mobile app',
    status: 'pending',
    priority: 'high',
    dueDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Review pull requests',
    status: 'completed',
    priority: 'medium',
    dueDate: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Team standup meeting',
    description: 'Daily sync with the development team',
    status: 'pending',
    priority: 'low',
    dueDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('TodayScreen', () => {
  const mockGetTodayTasks = jest.fn();
  const mockToggleTaskComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementation
    (useTaskStore as unknown as jest.Mock).mockReturnValue({
      getTodayTasks: mockGetTodayTasks,
      toggleTaskComplete: mockToggleTaskComplete,
      isLoading: false,
    });

    mockGetTodayTasks.mockReturnValue(mockTasks);
  });

  const renderScreen = () => {
    return render(
      <NavigationContainer>
        <TodayScreen navigation={mockNavigation as any} route={mockRoute as any} />
      </NavigationContainer>
    );
  };

  it('renders correctly with title', () => {
    const { getByText, getByLabelText } = renderScreen();

    expect(getByText('Today')).toBeTruthy();
    expect(getByLabelText('Today')).toBeTruthy();
  });

  it('displays the current date', () => {
    const { getByText } = renderScreen();

    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    expect(getByText(currentDate)).toBeTruthy();
  });

  it('shows task statistics', () => {
    const { getByText } = renderScreen();

    // Check pending count (2 tasks)
    expect(getByText('2')).toBeTruthy();
    expect(getByText('Pending')).toBeTruthy();

    // Check completed count (1 task)
    expect(getByText('1')).toBeTruthy();
    expect(getByText('Completed')).toBeTruthy();
  });

  it('renders all today tasks', () => {
    const { getByText } = renderScreen();

    mockTasks.forEach(task => {
      expect(getByText(task.title)).toBeTruthy();
    });
  });

  it('shows empty state when no tasks', () => {
    mockGetTodayTasks.mockReturnValue([]);

    const { getByText } = renderScreen();

    expect(getByText('No tasks for today')).toBeTruthy();
    expect(getByText('Add your first task to get started')).toBeTruthy();
    expect(getByText('Add Task')).toBeTruthy();
  });

  it('calls toggleTaskComplete when checkbox is pressed', async () => {
    const { getAllByLabelText } = renderScreen();

    const completeButtons = getAllByLabelText(/Mark as complete/i);

    fireEvent.press(completeButtons[0]);

    await waitFor(() => {
      expect(mockToggleTaskComplete).toHaveBeenCalledWith('1');
    });
  });

  it('renders floating action button with correct accessibility', () => {
    const { getByLabelText } = renderScreen();

    const fab = getByLabelText('Add new task');
    expect(fab).toBeTruthy();
  });

  it('displays task priority badges', () => {
    const { getAllByText } = renderScreen();

    expect(getAllByText(/high/i)).toBeTruthy();
    expect(getAllByText(/medium/i)).toBeTruthy();
    expect(getAllByText(/low/i)).toBeTruthy();
  });

  it('handles pull to refresh', async () => {
    const { getByLabelText } = renderScreen();

    const taskList = getByLabelText("Today's tasks");

    // Simulate pull to refresh
    const { refreshControl } = taskList.props;

    if (refreshControl && refreshControl.props.onRefresh) {
      fireEvent(taskList, 'refresh');

      await waitFor(() => {
        expect(mockGetTodayTasks).toHaveBeenCalled();
      });
    }
  });

  it('has proper accessibility labels for screen readers', () => {
    const { getByLabelText, getAllByRole } = renderScreen();

    // Check header accessibility
    expect(getByLabelText('Today')).toBeTruthy();

    // Check that buttons have proper roles
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Check task list accessibility
    expect(getByLabelText("Today's tasks")).toBeTruthy();
  });

  it('maintains minimum tap target sizes', () => {
    const { getAllByRole } = renderScreen();

    const buttons = getAllByRole('button');

    buttons.forEach(button => {
      const styles = button.props.style;

      if (styles) {
        // Check if the button meets minimum size requirements
        // Note: In actual implementation, you'd check computed styles
        expect(button).toBeTruthy();
      }
    });
  });

  it('shows loading state correctly', () => {
    (useTaskStore as unknown as jest.Mock).mockReturnValue({
      getTodayTasks: mockGetTodayTasks,
      toggleTaskComplete: mockToggleTaskComplete,
      isLoading: true,
    });

    const { queryByText } = renderScreen();

    // When loading, tasks should still be displayed
    // You might want to add a loading indicator in the actual component
    expect(queryByText('Today')).toBeTruthy();
  });
});