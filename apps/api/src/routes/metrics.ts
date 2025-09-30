import { Router, Request, Response } from 'express';
import { register } from '../config/metrics';

const router = Router();

router.get('/metrics', async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.send(metrics);
});

export default router;