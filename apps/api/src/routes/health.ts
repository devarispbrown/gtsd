import { Router, Request, Response } from 'express';
import { env } from '../config/env';

const router = Router();

const startTime = Date.now();

router.get('/healthz', (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    status: 'ok',
    version: env.APP_VERSION,
    gitSha: env.GIT_SHA,
    uptime,
    timestamp: new Date().toISOString(),
  });
});

export default router;