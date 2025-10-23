/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree,
 * logs those errors, and displays a fallback UI.
 * Particularly useful for the badges and streaks features.
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  context?: string; // Help identify which part of the app errored
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };

    if (props.resetKeys) {
      this.previousResetKeys = props.resetKeys;
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, context } = this.props;
    const { errorCount } = this.state;

    // Log the error
    logger.error(
      `Error Boundary caught error${context ? ` in ${context}` : ''}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        errorCount: errorCount + 1,
        context,
      }
    );

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error details
    this.setState({
      errorInfo,
      errorCount: errorCount + 1,
    });

    // Trigger haptic feedback for error
    ReactNativeHapticFeedback.trigger('notificationError', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

    // Auto-reset after multiple errors to prevent infinite loops
    if (errorCount >= 3) {
      this.scheduleReset(5000);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;

    // Reset on prop changes if configured
    if (resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }

    // Reset when reset keys change
    if (resetKeys && this.previousResetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== this.previousResetKeys[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
        this.previousResetKeys = resetKeys;
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  scheduleReset = (delay: number) => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  };

  resetErrorBoundary = () => {
    const { context } = this.props;

    logger.info(`Error Boundary reset${context ? ` for ${context}` : ''}`);

    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback, isolate, context } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default fallback UI
      const errorMessage = error.message || 'An unexpected error occurred';
      const showDetails = __DEV__; // Only show details in development

      return (
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <Text style={styles.emoji}>🤔</Text>

              <Text style={styles.title}>
                {isolate ? 'Something went wrong' : 'Oops! Something went wrong'}
              </Text>

              <Text style={styles.message}>
                {isolate
                  ? `This ${context || 'section'} encountered an error.`
                  : "We're having trouble loading this screen."}
              </Text>

              {showDetails && (
                <View style={styles.errorDetails}>
                  <Text style={styles.errorDetailTitle}>Error Details:</Text>
                  <Text style={styles.errorDetailText}>{errorMessage}</Text>

                  {errorCount > 1 && (
                    <Text style={styles.errorCount}>
                      This error has occurred {errorCount} times
                    </Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.resetErrorBoundary}
                activeOpacity={0.8}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              {!isolate && (
                <Text style={styles.helpText}>
                  If this problem persists, try restarting the app or check for updates.
                </Text>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  errorDetailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 8,
  },
  errorDetailText: {
    fontSize: 14,
    color: '#495057',
    fontFamily: 'monospace',
  },
  errorCount: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});

export default ErrorBoundary;

// Convenience HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
}