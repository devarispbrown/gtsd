/**
 * Type definitions for Express extensions
 */

declare namespace Express {
  /**
   * Extended Request interface with authentication
   * The userId is added by authentication middleware
   */
  export interface Request {
    userId?: number;
  }
}