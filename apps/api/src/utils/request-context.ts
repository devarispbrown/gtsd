import { createNamespace, Namespace } from 'cls-hooked';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

const namespace: Namespace = createNamespace('gtsd-request-context');

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  namespace.run(() => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    namespace.set('requestId', requestId);
    res.setHeader('x-request-id', requestId);
    next();
  });
};

export const getRequestId = (): string | undefined => {
  return namespace.get('requestId') as string | undefined;
};

export const getNamespace = () => namespace;