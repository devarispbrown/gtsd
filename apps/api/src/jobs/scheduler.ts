import { DailyComplianceJob } from './daily-compliance-check';
import { logger } from '../config/logger';

/**
 * Job scheduler - manages all background cron jobs
 * Provides centralized control for starting, stopping, and managing jobs
 */
export class JobScheduler {
  private jobs: Map<string, any> = new Map();
  private isRunning: boolean = false;

  /**
   * Start all scheduled jobs
   * Called during server startup
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Job scheduler is already running');
      return;
    }

    logger.info('Starting job scheduler');

    try {
      // Daily compliance check - runs at 11:59 PM every day
      const dailyComplianceJob = new DailyComplianceJob();
      dailyComplianceJob.schedule();
      this.jobs.set('daily-compliance', dailyComplianceJob);

      // Add more jobs here as needed
      // Example:
      // const weeklyReportJob = new WeeklyReportJob();
      // weeklyReportJob.schedule();
      // this.jobs.set('weekly-report', weeklyReportJob);

      this.isRunning = true;

      logger.info(
        { jobCount: this.jobs.size, jobs: Array.from(this.jobs.keys()) },
        'Job scheduler started successfully'
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to start job scheduler');
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   * Called during graceful shutdown
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Job scheduler is not running');
      return;
    }

    logger.info('Stopping job scheduler');

    try {
      // Stop all jobs
      for (const [name, job] of this.jobs.entries()) {
        try {
          if (typeof job.stop === 'function') {
            job.stop();
            logger.info({ jobName: name }, 'Job stopped');
          }
        } catch (error) {
          logger.error({ err: error, jobName: name }, 'Error stopping job');
        }
      }

      this.jobs.clear();
      this.isRunning = false;

      logger.info('Job scheduler stopped successfully');
    } catch (error) {
      logger.error({ err: error }, 'Failed to stop job scheduler');
      throw error;
    }
  }

  /**
   * Get a specific job by name
   *
   * @param jobName - Name of the job to retrieve
   * @returns The job instance or undefined
   */
  getJob(jobName: string): any {
    return this.jobs.get(jobName);
  }

  /**
   * Get the status of all jobs
   *
   * @returns Object with job statuses
   */
  getStatus(): {
    isRunning: boolean;
    jobCount: number;
    jobs: Array<{ name: string; status: any }>;
  } {
    const jobStatuses = Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      status: typeof job.getStatus === 'function' ? job.getStatus() : 'unknown',
    }));

    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      jobs: jobStatuses,
    };
  }

  /**
   * Manually trigger a job by name (for testing/debugging)
   *
   * @param jobName - Name of the job to run
   */
  async runJob(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName);

    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    if (typeof job.run !== 'function') {
      throw new Error(`Job does not have a run method: ${jobName}`);
    }

    logger.info({ jobName }, 'Manually triggering job');

    try {
      await job.run();
      logger.info({ jobName }, 'Job completed successfully');
    } catch (error) {
      logger.error({ err: error, jobName }, 'Job failed');
      throw error;
    }
  }
}

/**
 * Singleton instance of the job scheduler
 * Import and use this instance throughout the application
 */
export const jobScheduler = new JobScheduler();
