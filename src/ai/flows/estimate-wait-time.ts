
'use server';

/**
 * @fileoverview A Genkit flow for estimating wait times in a queue.
 *
 * This file defines a Genkit flow that uses a language model to estimate
 * the waiting time for a user in a queue based on the department and the
 * current number of people waiting.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Department } from '@/lib/types';


// Define the schema for the input data.
const WaitTimeInputSchema = z.object({
  department: z.string().describe('The department the user is queuing for.'),
  currentQueueLength: z
    .number()
    .describe('The number of people currently waiting in the queue.'),
});

// Define the schema for the output data.
const WaitTimeOutputSchema = z.object({
  estimatedWaitTime: z
    .number()
    .describe('The estimated wait time in minutes.'),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe(
      'The confidence level of the estimation (high, medium, or low).'
    ),
});


export const estimateWaitTimeFlow = ai.defineFlow(
  {
    name: 'estimateWaitTimeFlow',
    inputSchema: WaitTimeInputSchema,
    outputSchema: WaitTimeOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an expert queue management AI for a bank.
      Your task is to estimate the wait time for a new user.

      Analyze the following factors:
      1.  Department: "${input.department}"
      2.  Current Queue Length: ${input.currentQueueLength} people

      Base your estimation on these general rules:
      -   'Customer Service' is the busiest and typically takes about 5 minutes per person.
      -   'New Accounts' is moderately busy and takes about 10-15 minutes per person because of paperwork.
      -   'Loans & Mortgages' is the least busy but takes the longest per person, around 20-25 minutes.
      -   If the queue is long (more than 5 people), increase the time per person slightly due to potential slowdowns.
      -   If the queue is empty, the wait time is effectively 0.

      Provide a numerical estimated wait time in minutes and a confidence level for your prediction.
      -   Confidence is 'high' if the queue is short (0-2 people).
      -   Confidence is 'medium' if the queue is moderate (3-7 people).
      -   Confidence is 'low' if the queue is long (8+ people) because of unpredictability.
    `;

    const { output } = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-1.5-flash',
      output: {
        schema: WaitTimeOutputSchema,
      },
    });
    
    return output!;
  }
);


export async function estimateWaitTime(input: {
  department: Department;
  currentQueueLength: number;
}): Promise<z.infer<typeof WaitTimeOutputSchema>> {
  return await estimateWaitTimeFlow(input);
}
