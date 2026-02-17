import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { format } from 'date-fns';
import { transporter } from '@/lib/email/config';

export async function POST(request: Request) {
  try {
    const { assignmentId, userId, role, date } = await request.json();

    console.log('Received assignment email request:', { assignmentId, userId, role, date });

    if (!assignmentId || !userId || !role || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user details using admin SDK
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.error('User not found:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const userEmail = userData?.email;
    const userName = userData?.displayName || userEmail;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User has no email address' },
        { status: 400 }
      );
    }

    // Format the date
    const serviceDate = new Date(date);
    const formattedDate = format(serviceDate, 'EEEE, MMMM d, yyyy');

    // Create accept/decline links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.siouxfallschurchofchrist.org';
    const acceptUrl = `${baseUrl}/service-roles/respond?id=${assignmentId}&action=accept`;
    const declineUrl = `${baseUrl}/service-roles/respond?id=${assignmentId}&action=decline`;

    // Create email content
    const subject = `Service Role Assignment - ${role} on ${formattedDate}`;
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #2F3E46;
              background-color: #FAF8F5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #E88B5F 0%, #70A8A0 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 8px rgba(47, 62, 70, 0.08);
            }
            .role-box {
              background: #F0EBE3;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #E88B5F;
            }
            .role-box h2 {
              margin: 0 0 10px 0;
              color: #E88B5F;
              font-size: 20px;
            }
            .role-box p {
              margin: 5px 0;
              font-size: 16px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              padding: 15px 30px;
              margin: 10px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 16px;
              transition: all 0.2s;
            }
            .button-accept {
              background: #5FAF8A;
              color: white;
            }
            .button-decline {
              background: #E87A7A;
              color: white;
            }
            .button:hover {
              opacity: 0.9;
              transform: translateY(-2px);
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #8A9AA4;
              font-size: 14px;
            }
            .info-text {
              color: #5A6A74;
              font-size: 14px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🙏 Sunday Service Role Assignment</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <p>You have been assigned to serve in the following role for our Sunday service:</p>
              
              <div class="role-box">
                <h2>${role}</h2>
                <p><strong>📅 Date:</strong> ${formattedDate}</p>
                <p><strong>⏰ Service Time:</strong> 9:45 AM - 12:00 PM</p>
              </div>
              
              <p>Please respond to this assignment by clicking one of the buttons below:</p>
              
              <div class="button-container">
                <a href="${acceptUrl}" class="button button-accept">✓ Accept Assignment</a>
                <a href="${declineUrl}" class="button button-decline">✗ Decline Assignment</a>
              </div>
              
              <p class="info-text">
                <strong>Note:</strong> If you need to decline, please do so as soon as possible so we can find a replacement.
                If you have any questions, please contact the church office.
              </p>
              
              <p>Thank you for your willingness to serve!</p>
              
              <p>In Christ,<br>Sioux Falls Church of Christ</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the SFCOC Service Management System.</p>
              <p>If you have trouble with the links above, please visit the church website and check your service roles page.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email directly using transporter
    console.log('Sending email to:', userEmail);
    const mailOptions = {
      from: `SFCoC Service Roles <announcements@siouxfallschurchofchrist.org>`,
      to: userEmail,
      subject,
      html: content,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);

    return NextResponse.json({ 
      success: true,
      messageId: result.messageId 
    });
  } catch (error) {
    console.error('Error sending service assignment email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

