import { Request, Response, NextFunction } from 'express';
import { requestContextMiddleware, getRequestId, getNamespace } from './request-context';

describe('Request Context', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should generate a requestId if not provided', () => {
    requestContextMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.setHeader).toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should use provided x-request-id header', () => {
    const requestId = 'test-request-id-123';
    mockRequest.headers = { 'x-request-id': requestId };

    requestContextMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-request-id', requestId);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should store requestId in namespace', (done) => {
    mockRequest.headers = { 'x-request-id': 'test-id' };

    requestContextMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      () => {
        const namespace = getNamespace();
        const storedId = namespace.get('requestId');
        expect(storedId).toBe('test-id');
        done();
      }
    );
  });

  it('should return undefined when called outside of context', () => {
    const requestId = getRequestId();
    expect(requestId).toBeUndefined();
  });
});