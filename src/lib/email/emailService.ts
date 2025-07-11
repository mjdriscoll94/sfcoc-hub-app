import { transporter } from './config';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { PrayerPraise } from '@/lib/firebase/models';

export interface EmailSubscriber {
  email: string;
  name?: string;
  emailSubscriptions: {
    announcements: boolean;
    events: boolean;
    newsletter: boolean;
    prayerRequests?: boolean;
    praiseReports?: boolean;
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
  } catch (error) {
    console.error(`Failed to send ${type} email:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
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

  // Convert JSON content to HTML if needed
  let formattedContent = content;
  try {
    const jsonContent = JSON.parse(content);
    if (jsonContent.type === 'doc') {
      // Convert the JSON content to HTML
      formattedContent = '';
      const processNode = (node: any) => {
        switch (node.type) {
          case 'text':
            return node.text;
          case 'paragraph':
            const innerContent = node.content?.map(processNode).join('') || '';
            return `<p>${innerContent || '&nbsp;'}</p>`;
          case 'heading':
            const level = node.attrs?.level || 1;
            const headingContent = node.content?.map(processNode).join('') || '';
            return `<h${level}>${headingContent}</h${level}>`;
          default:
            return node.content?.map(processNode).join('') || '';
        }
      };
      formattedContent = jsonContent.content.map(processNode).join('');
    }
  } catch (e) {
    // If parsing fails, assume it's already HTML
    console.log('Content appears to be HTML already');
  }

  // Format the email content with HTML
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://res.cloudinary.com/dzjsztwqp/image/upload/v1751485185/SFCOC_Colored_lxaty4.png" 
             alt="SFCOC Logo" 
             style="width: 120px; height: auto;"
             loading="eager"
             decoding="async" />
      </div>
      <h1 style="color: #333;">${subject}</h1>
      <div style="color: #666; line-height: 1.6;">
        ${formattedContent}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        You received this email because you're subscribed to SFCOC announcements. 
        <a href="https://sfcoc.vercel.app/settings" style="color: #ff7c54;">Manage your email preferences</a>
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

export async function sendUrgentPrayerRequestEmail(subscribers: EmailSubscriber[], prayerRequest: { title: string; description: string; author: { name: string }; isAnonymous: boolean; type: 'prayer' | 'praise' }) {
  const emails = subscribers
    .filter(subscriber => {
      // For prayer requests, check prayerRequests subscription
      // For praise reports, check praiseReports subscription
      if (prayerRequest.type === 'prayer') {
        return subscriber.emailSubscriptions.prayerRequests;
      } else {
        return subscriber.emailSubscriptions.praiseReports;
      }
    })
    .map(subscriber => subscriber.email);

  if (emails.length === 0) {
    console.log('No subscribers found for', prayerRequest.type);
    return;
  }

  const subject = prayerRequest.type === 'prayer' ? 'New Prayer Request' : 'New Praise Report';
  
  // Format the email content with HTML
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://res.cloudinary.com/dzjsztwqp/image/upload/v1751485185/SFCOC_Colored_lxaty4.png" 
             alt="SFCOC Logo" 
             style="width: 120px; height: auto;"
             loading="eager"
             decoding="async" />
      </div>
      <h1 style="color: #333;">${prayerRequest.title}</h1>
      <div style="color: #666; line-height: 1.6;">
        <p>${prayerRequest.description}</p>
        <p style="font-style: italic; margin-top: 20px;">
          Requested by: ${prayerRequest.isAnonymous ? 'Anonymous' : prayerRequest.author.name}
        </p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        You received this email because you're subscribed to SFCOC ${prayerRequest.type === 'prayer' ? 'prayer requests' : 'praise reports'}. 
        <a href="https://sfcoc.vercel.app/settings" style="color: #ff7c54;">Manage your email preferences</a>
      </p>
    </div>
  `;

  return sendEmail(prayerRequest.type, subject, htmlContent, emails);
}

export async function getEmailSubscribers(): Promise<EmailSubscriber[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('approvalStatus', '==', 'approved')
    );
    
    const querySnapshot = await getDocs(q);
    const subscribers: EmailSubscriber[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Get notification preferences from localStorage
      const notificationPreferences = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('notificationPreferences') || '{}')
        : {};
      
      subscribers.push({
        email: data.email,
        name: data.displayName,
        emailSubscriptions: {
          ...data.emailSubscriptions,
          prayerRequests: notificationPreferences.prayerRequests || false,
          praiseReports: notificationPreferences.praiseReports || false
        }
      });
    });
    
    return subscribers;
  } catch (error) {
    console.error('Error fetching email subscribers:', error);
    throw error;
  }
}

export async function sendBatchedPrayerPraiseEmail() {
  try {
    // Get all unsent batched items
    const prayerPraiseRef = collection(db, 'prayerPraise');
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const q = query(
      prayerPraiseRef,
      where('approvalStatus', '==', 'approved'),
      where('status', '==', 'active'),
      where('priority', '==', 'Batched'),
      where('isSent', '==', false),
      where('dateCreated', '<=', Timestamp.fromDate(twoHoursAgo))
    );

    const querySnapshot = await getDocs(q);
    const prayerRequests: PrayerPraise[] = [];
    const praiseReports: PrayerPraise[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as PrayerPraise;
      data.id = doc.id;
      if (data.type === 'prayer') {
        prayerRequests.push(data);
      } else {
        praiseReports.push(data);
      }
    });

    // If no items to send, exit early
    if (prayerRequests.length === 0 && praiseReports.length === 0) {
      console.log('No batched items to send');
      return;
    }

    // Get subscribers
    const subscribers = await getEmailSubscribers();
    let emailsSent = false;
    
    // Send prayer requests if any exist
    if (prayerRequests.length > 0) {
      const prayerEmails = subscribers
        .filter(subscriber => subscriber.emailSubscriptions.prayerRequests)
        .map(subscriber => subscriber.email);

      if (prayerEmails.length > 0) {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://res.cloudinary.com/dzjsztwqp/image/upload/v1751485185/SFCOC_Colored_lxaty4.png" 
                   alt="SFCOC Logo" 
                   style="width: 120px; height: auto;"
                   loading="eager"
                   decoding="async" />
            </div>
            <h1 style="color: #333;">New Prayer Requests</h1>
            <div style="color: #666; line-height: 1.6;">
              ${prayerRequests.map(request => `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                  <h2 style="color: #333; margin-top: 0;">${request.title}</h2>
                  <p>${request.description}</p>
                  <p style="font-style: italic; margin-top: 10px; color: #888;">
                    Requested by: ${request.isAnonymous ? 'Anonymous' : request.author.name}
                  </p>
                </div>
              `).join('')}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              You received this email because you're subscribed to SFCOC prayer requests. 
              <a href="https://sfcoc.vercel.app/settings" style="color: #ff7c54;">Manage your email preferences</a>
            </p>
          </div>
        `;

        await sendEmail('prayer', 'New Prayer Requests', htmlContent, prayerEmails);
        emailsSent = true;
        
        // Mark prayer requests as sent
        const batch = [];
        for (const item of prayerRequests) {
          batch.push(updateDoc(doc(db, 'prayerPraise', item.id), { isSent: true }));
        }
        await Promise.all(batch);
      } else {
        console.log('No subscribers found for prayer requests');
      }
    }

    // Send praise reports if any exist
    if (praiseReports.length > 0) {
      const praiseEmails = subscribers
        .filter(subscriber => subscriber.emailSubscriptions.praiseReports)
        .map(subscriber => subscriber.email);

      if (praiseEmails.length > 0) {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://res.cloudinary.com/dzjsztwqp/image/upload/v1751485185/SFCOC_Colored_lxaty4.png" 
                   alt="SFCOC Logo" 
                   style="width: 120px; height: auto;"
                   loading="eager"
                   decoding="async" />
            </div>
            <h1 style="color: #333;">New Praise Reports</h1>
            <div style="color: #666; line-height: 1.6;">
              ${praiseReports.map(report => `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                  <h2 style="color: #333; margin-top: 0;">${report.title}</h2>
                  <p>${report.description}</p>
                  <p style="font-style: italic; margin-top: 10px; color: #888;">
                    Shared by: ${report.isAnonymous ? 'Anonymous' : report.author.name}
                  </p>
                </div>
              `).join('')}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              You received this email because you're subscribed to SFCOC praise reports. 
              <a href="https://sfcoc.vercel.app/settings" style="color: #ff7c54;">Manage your email preferences</a>
            </p>
          </div>
        `;

        await sendEmail('praise', 'New Praise Reports', htmlContent, praiseEmails);
        emailsSent = true;
        
        // Mark praise reports as sent
        const batch = [];
        for (const item of praiseReports) {
          batch.push(updateDoc(doc(db, 'prayerPraise', item.id), { isSent: true }));
        }
        await Promise.all(batch);
      } else {
        console.log('No subscribers found for praise reports');
      }
    }

    if (!emailsSent) {
      console.log('No emails were sent - either no items to send or no subscribers');
      return;
    }

    console.log('Successfully sent batched emails:', {
      prayerRequests: prayerRequests.length,
      praiseReports: praiseReports.length
    });
  } catch (error) {
    console.error('Error sending batched emails:', error);
    throw error;
  }
} 