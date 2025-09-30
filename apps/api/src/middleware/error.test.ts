import { AppError } from './error';

describe('AppError', () => {
  it('should create an error with status code and message', () => {
    const error = new AppError(404, 'Resource not found');

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Resource not found');
    expect(error.isOperational).toBe(true);
  });

  it('should support custom operational flag', () => {
    const error = new AppError(500, 'Internal error', false);

    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
  });

  it('should be an instance of Error', () => {
    const error = new AppError(400, 'Bad request');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should have a stack trace', () => {
    const error = new AppError(500, 'Server error');

    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
  });
});