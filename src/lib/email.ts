
'use server';

import type { QueueUser } from './types';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

const SENDER_EMAIL = 'chiazordaniel317@gmail.com';
const SENDER_NAME = 'QueueNow';

export async function sendQueueConfirmationEmail(user: QueueUser, statusLink: string) {

  if (!process.env.BREVO_API_KEY) {
    console.log("BREVO_API_KEY not found, logging email to console instead.");
    const emailContent = `
      ==================================================
      DUMMY EMAIL - NOT ACTUALLY SENT
      ==================================================
      To: ${user.contact}
      From: "${SENDER_NAME}" <${SENDER_EMAIL}>
      Subject: You're in the queue for ${user.department}!

      Hello, ${user.name}!
      
      You have successfully joined the queue.
      
      - Department: ${user.department}
      - Counter: ${user.counter}
      - Your Position: ${user.queueNumber}
      
      You can check your real-time status here:
      ${statusLink}
      
      Thanks for using QueueNow!
      ==================================================
    `;
    console.log(emailContent);
    return Promise.resolve({ success: true });
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = `You're in the queue for ${user.department}!`;
  sendSmtpEmail.htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h1 style="color: #333;">Hello, ${user.name}!</h1>
          <p>You have successfully joined the queue. Here are your details:</p>
          <ul style="list-style-type: none; padding: 0;">
            <li><strong>Department:</strong> ${user.department}</li>
            <li><strong>Counter:</strong> ${user.counter}</li>
            <li><strong>Your Position in Line:</strong> #${user.queueNumber}</li>
          </ul>
          <p>You can check your real-time status by clicking the button below:</p>
          <a href="${statusLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Check My Status</a>
          <p style="margin-top: 20px; font-size: 0.9em; color: #777;">If the button doesn't work, you can copy and paste this link into your browser:<br>${statusLink}</p>
          <p>Thanks for using QueueNow!</p>
        </div>
      </body>
    </html>
  `;
  sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
  sendSmtpEmail.to = [{ email: user.contact, name: user.name }];
  
  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Brevo API called successfully. Returned data: ', JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error sending email with Brevo: ', error);
    return { success: false };
  }
}
