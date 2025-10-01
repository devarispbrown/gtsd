import { Router } from 'express';
import webhooksRouter from './webhooks';

const router = Router();

/**
 * SMS routes
 * All routes are prefixed with /v1/sms
 */
router.use('/sms', webhooksRouter);

export default router;
