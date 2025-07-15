'use server';

import type { QueueUser } from './types';

// This is a dummy email service that logs to the console.
// It avoids network requests, making it safe for environments like Vercel
// without any special configuration.

export async function sendQueueConfirmationEmail(user: QueueUser, statusLink: string) {
  const emailContent = `
      ==================================================
      DUMMY EMAIL - NOT ACTUALLY SENT
      ==================================================
      To: ${user.contact}
      From: "QueueNow" <no-reply@queuenow.example.com>
      Subject: You're in the queue for ${user.department}!

      Hello, ${user.name}!
      
      You have successfully joined the queue.
      
      - Department: ${user.department}
      - Counter: ${user.counter}
      - Your Number: ${user.queueNumber}
      
      You can check your real-time status here:
      ${statusLink}
      
      Thanks for using QueueNow!
      ==================================================
  `;

  console.log(emailContent);

  // Return a success response immediately
  return Promise.resolve({ success: true });
}
