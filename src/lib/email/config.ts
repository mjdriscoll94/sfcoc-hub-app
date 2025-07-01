import nodemailer from 'nodemailer';

// Create reusable transporter object using Resend SMTP
export const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: "resend",
    pass: "re_9MZjEWtL_7HPtgrq6XYN1LnoBHTnghvU6"
  }
}); 