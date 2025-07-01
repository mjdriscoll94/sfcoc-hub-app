import { transporter } from './config';

export interface EmailSubscriber {
  email: string;
  name?: string;
  emailSubscriptions: {
    announcements: boolean;
    events: boolean;
    newsletter: boolean;
  };
}

async function sendEmail(type: string, subject: string, content: string, recipients: string[]) {
  try {
    console.log('Sending email via API:', {
      type,
      subject,
      recipientCount: recipients.length
    });

    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        subject,
        content,
        recipients,
      }),
    });

    const responseData = await response.json();
    console.log('API Response:', {
      status: response.status,
      ok: response.ok,
      data: responseData
    });

    if (!response.ok) {
      throw new Error(
        `Failed to send email: ${response.status} ${response.statusText}\n` +
        `Details: ${JSON.stringify(responseData)}`
      );
    }

    console.log('Email sent successfully:', responseData);
    return responseData;
  } catch (error: any) {
    console.error(`Failed to send ${type} email:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      details: error
    });
    throw error;
  }
}

export async function sendAnnouncementEmail(subscribers: EmailSubscriber[], subject: string, content: string) {
  console.log('Starting sendAnnouncementEmail with:', {
    subscriberCount: subscribers.length,
    subject,
    contentLength: content.length
  });

  const emails = subscribers
    .filter(subscriber => {
      const isSubscribed = subscriber.emailSubscriptions.announcements;
      console.log(`Checking subscriber ${subscriber.email}:`, {
        isSubscribed,
        subscriptions: subscriber.emailSubscriptions
      });
      return isSubscribed;
    })
    .map(subscriber => subscriber.email);

  console.log('Filtered subscriber emails:', emails);

  if (emails.length === 0) {
    console.log('No subscribed emails found, skipping send');
    return;
  }

  // Format the email content with HTML
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">${subject}</h1>
      <div style="color: #666; line-height: 1.6;">
        ${content}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        You received this email because you're subscribed to SFCOC announcements. 
        <a href="https://sfcoc.org/settings" style="color: #ff7c54;">Manage your email preferences</a>
      </p>
    </div>
  `;

  console.log('Sending email with formatted content');
  return sendEmail('announcements', subject, htmlContent, emails);
}

export async function sendEventEmail(subscribers: EmailSubscriber[], subject: string, content: string) {
  const emails = subscribers
    .filter(subscriber => subscriber.emailSubscriptions.events)
    .map(subscriber => subscriber.email);

  if (emails.length === 0) return;

  return sendEmail('events', subject, content, emails);
}

export async function sendNewsletterEmail(subscribers: EmailSubscriber[], subject: string, content: string) {
  const emails = subscribers
    .filter(subscriber => subscriber.emailSubscriptions.newsletter)
    .map(subscriber => subscriber.email);

  if (emails.length === 0) return;

  return sendEmail('newsletter', subject, content, emails);
}

export async function sendWelcomeEmail(email: string, name?: string) {
  const content = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Welcome to SFCOC${name ? `, ${name}` : ''}!</h1>
      <p style="color: #666; line-height: 1.6;">Thank you for joining our community. We're excited to have you with us!</p>
      <p style="color: #666; line-height: 1.6;">You can manage your email preferences at any time by visiting your settings page.</p>
      <p style="color: #666; line-height: 1.6;">If you have any questions, feel free to reach out to us.</p>
      <p style="color: #666; line-height: 1.6;">Best regards,<br>SFCOC Team</p>
    </div>
  `;

  return sendEmail('welcome', 'Welcome to SFCOC!', content, [email]);
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const content = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Password Reset Request</h1>
      <p style="color: #666; line-height: 1.6;">We received a request to reset your password. Click the link below to reset it:</p>
      <p style="margin: 20px 0;">
        <a href="${resetLink}" 
           style="background-color: #ff7c54; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 4px; 
                  display: inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color: #666; line-height: 1.6;">If you didn't request this password reset, you can safely ignore this email.</p>
      <p style="color: #666; line-height: 1.6;">The link will expire in 1 hour for security reasons.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        This is an automated message from SFCOC. Please do not reply to this email.
      </p>
    </div>
  `;

  try {
    await sendEmail('password-reset', 'Reset Your Password', content, [email]);
    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error };
  }
} 