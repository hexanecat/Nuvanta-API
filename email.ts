import sgMail from '@sendgrid/mail';
import { log } from './vite';

// Initialize SendGrid with the API key
if (!process.env.SENDGRID_API_KEY) {
  console.error('Warning: SENDGRID_API_KEY environment variable is not set.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  log('SendGrid API initialized', 'email');
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: 'attachment';
  }>;
}

export interface EmailResult {
  success: boolean;
  message: string;
  error?: any;
}

/**
 * Send email using SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is not set');
    }

    const defaultFrom = 'nuvanta@healthcare.org';
    
    // Using 'any' type to bypass SendGrid's strict type checking
    const msg: any = {
      to: options.to,
      from: options.from || defaultFrom,
      subject: options.subject,
    };
    
    if (options.text) {
      msg.text = options.text;
    }
    
    if (options.html) {
      msg.html = options.html;
    }
    
    if (options.replyTo) {
      msg.reply_to = options.replyTo;
    }
    
    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments;
    }

    await sgMail.send(msg);
    
    log(`Email sent to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`, 'email');
    
    return {
      success: true,
      message: 'Email sent successfully'
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      success: false,
      message: 'Failed to send email',
      error: error?.message || String(error)
    };
  }
}

/**
 * Send a template-based staff notification
 */
export async function sendStaffNotification({
  to,
  subject,
  messageContent,
  footerText = 'This is an automated message from Nuvanta Nurse Manager System.'
}: {
  to: string | string[];
  subject: string;
  messageContent: string;
  footerText?: string;
}): Promise<EmailResult> {
  // Create HTML version with basic styling
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .container { 
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 5px;
        }
        .header {
          border-bottom: 2px solid #4299e1;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .header h1 {
          color: #2b6cb0;
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 0 10px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
        }
        .button {
          display: inline-block;
          background-color: #4299e1;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nuvanta Nurse Management</h1>
        </div>
        <div class="content">
          ${messageContent}
        </div>
        <div class="footer">
          ${footerText}
        </div>
      </div>
    </body>
    </html>
  `;

  // Create plain text version
  const text = messageContent.replace(/<[^>]*>/g, '') + '\n\n' + footerText;

  return await sendEmail({
    to,
    subject,
    html,
    text
  });
}

/**
 * Send a schedule notification to staff
 */
export async function sendScheduleNotification({
  to,
  nurseName,
  scheduleDetails,
  startDate,
  endDate,
  additionalMessage = ''
}: {
  to: string | string[];
  nurseName: string;
  scheduleDetails: string;
  startDate: string;
  endDate: string;
  additionalMessage?: string;
}): Promise<EmailResult> {
  const subject = `Schedule Update: ${startDate} - ${endDate}`;
  
  const messageContent = `
    <p>Hello ${nurseName},</p>
    
    <p>Your schedule for the period <strong>${startDate}</strong> to <strong>${endDate}</strong> has been updated.</p>
    
    <h3>Your Schedule:</h3>
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
      ${scheduleDetails}
    </div>
    
    ${additionalMessage ? `<p>${additionalMessage}</p>` : ''}
    
    <p>Please log in to the Nuvanta system to view your complete schedule.</p>
    
    <a href="#" class="button">View Full Schedule</a>
    
    <p>If you have any questions or concerns about your schedule, please contact your nurse manager.</p>
    
    <p>Thank you,<br>Nuvanta Management Team</p>
  `;
  
  return await sendStaffNotification({
    to,
    subject,
    messageContent
  });
}

/**
 * Send a staff alert notification
 */
export async function sendAlertNotification({
  to,
  alertType,
  alertDetails,
  actionRequired = false,
  actionText = '',
  dueDate = ''
}: {
  to: string | string[];
  alertType: 'Critical' | 'Important' | 'Informational';
  alertDetails: string;
  actionRequired?: boolean;
  actionText?: string;
  dueDate?: string;
}): Promise<EmailResult> {
  // Set color based on alert type
  let alertColor = '#4299e1'; // blue for Informational
  if (alertType === 'Critical') alertColor = '#f56565'; // red
  if (alertType === 'Important') alertColor = '#ed8936'; // orange
  
  const subject = `${alertType} Alert: ${alertDetails.substring(0, 40)}${alertDetails.length > 40 ? '...' : ''}`;
  
  const messageContent = `
    <div style="border-left: 4px solid ${alertColor}; padding-left: 15px; margin: 15px 0;">
      <h3 style="color: ${alertColor};">${alertType} Alert</h3>
      <p>${alertDetails}</p>
      
      ${actionRequired ? `
        <p><strong>Action Required:</strong> ${actionText}</p>
        ${dueDate ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : ''}
      ` : ''}
    </div>
    
    <p>Please log in to the Nuvanta system for more details.</p>
    
    <a href="#" class="button">View Details</a>
  `;
  
  return await sendStaffNotification({
    to,
    subject,
    messageContent
  });
}