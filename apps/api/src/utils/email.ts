import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * Email service for sending password reset emails
 *
 * TODO: In production, integrate with an email service provider:
 * - SendGrid (recommended)
 * - AWS SES
 * - Mailgun
 * - Postmark
 *
 * For now, this logs the reset link to console for development/testing
 */

export interface SendPasswordResetEmailParams {
  email: string;
  resetToken: string;
  userName?: string;
}

/**
 * Send password reset email with reset link
 * @param params Email parameters
 */
export async function sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void> {
  const { email, resetToken, userName: _userName } = params;

  // Construct reset link
  // TODO: Update this URL based on your frontend configuration
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  // Email content
  const subject = 'Password Reset Request - GTSD';

  // TODO: In production, replace this with actual email content templates
  // For now, these are available as examples for email service integration:
  // - Text body for plain text email clients
  // - HTML body for rich email clients
  // When integrating with SendGrid/SES/Mailgun, pass these as email content

  // TODO: Replace this with actual email sending logic in production
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to: email,
  //   from: 'noreply@gtsd.app',
  //   subject,
  //   text: textBody,
  //   html: htmlBody,
  // });

  // For now, log to console for development
  logger.info(
    {
      to: email,
      subject,
      resetTokenLength: resetToken.length,
    },
    'Password reset email would be sent (development mode)'
  );

  // Log the reset link for easy testing in development
  if (process.env.NODE_ENV !== 'production') {
    logger.info(
      {
        resetUrl,
      },
      'Password reset link (development only)'
    );
    console.log('\n==============================================');
    console.log('PASSWORD RESET LINK (Development Mode):');
    console.log(resetUrl);
    console.log('==============================================\n');
  }

  // In production, you would throw an error if email sending fails
  // For now, we always succeed
  return Promise.resolve();
}

/**
 * Send password changed confirmation email
 * @param email User's email address
 * @param userName User's name
 */
export async function sendPasswordChangedEmail(
  email: string,
  _userName?: string
): Promise<void> {
  const subject = 'Password Changed Successfully - GTSD';

  // TODO: In production, use actual email templates with text and HTML body
  // When integrating with email service, include confirmation that password was changed

  logger.info(
    {
      to: email,
      subject,
    },
    'Password changed confirmation email would be sent (development mode)'
  );

  return Promise.resolve();
}
