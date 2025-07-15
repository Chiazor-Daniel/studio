'use server';

import nodemailer from 'nodemailer';
import type { QueueUser } from './types';

// This is a placeholder email service.
// In a real application, you would use a transactional email service
// like SendGrid, Mailgun, or AWS SES, and store credentials securely.
// For this example, we'll use nodemailer with a "ethereal" account,
// which creates a temporary inbox and logs credentials to the console.

let transporter: nodemailer.Transporter;

async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  let testAccount = await nodemailer.createTestAccount();
  
  console.log('*********************************');
  console.log('** Ethereal Email Account Info **');
  console.log(`** User: ${testAccount.user}`);
  console.log(`** Pass: ${testAccount.pass}`);
  console.log('*********************************');


  // create reusable transporter object using the default SMTP transport
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return transporter;
}

export async function sendQueueConfirmationEmail(user: QueueUser, statusLink: string) {
  const mailer = await getTransporter();

  const mailOptions = {
    from: '"QueueNow" <no-reply@queuenow.example.com>',
    to: user.contact,
    subject: `You're in the queue for ${user.department}!`,
    html: `
      <h1>Hello, ${user.name}!</h1>
      <p>You have successfully joined the queue.</p>
      <ul>
        <li><strong>Department:</strong> ${user.department}</li>
        <li><strong>Counter:</strong> ${user.counter}</li>
        <li><strong>Your Number:</strong> ${user.queueNumber}</li>
      </ul>
      <p>You can check your real-time status here:</p>
      <p><a href="${statusLink}">${statusLink}</a></p>
      <p>Thanks for using QueueNow!</p>
    `,
    text: `Hello, ${user.name}!\nYou have successfully joined the queue.\nDepartment: ${user.department}\nCounter: ${user.counter}\nYour Number: ${user.queueNumber}\nCheck your status here: ${statusLink}\nThanks for using QueueNow!`,
  };

  try {
    let info = await mailer.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    // Preview only available when sending through an Ethereal account
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: 'Failed to send email.' };
  }
}
