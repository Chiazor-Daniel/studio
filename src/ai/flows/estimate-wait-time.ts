'use server';

/**
 * @fileOverview AI flow to estimate the waiting time for a user in a queue.
 *
 * - estimateWaitTime - Function to estimate waiting time.
 * - EstimateWaitTimeInput - Input type for estimateWaitTime function.
 * - EstimateWaitTimeOutput - Output type for estimateWaitTime function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateWaitTimeInputSchema = z.object({
  department: z.string().describe('The department the user is waiting for.'),
  counter: z.string().describe('The counter the user is waiting at.'),
  queueLength: z.number().describe('The current number of people in the queue.'),
  historicalData: z.string().describe('Historical data of waiting times.'),
});

export type EstimateWaitTimeInput = z.infer<typeof EstimateWaitTimeInputSchema>;

const EstimateWaitTimeOutputSchema = z.object({
  estimatedWaitTime: z.number().describe('The estimated wait time in minutes.'),
  confidence: z.string().describe('The confidence level of the estimation (low, medium, high).'),
});

export type EstimateWaitTimeOutput = z.infer<typeof EstimateWaitTimeOutputSchema>;

export async function estimateWaitTime(input: EstimateWaitTimeInput): Promise<EstimateWaitTimeOutput> {
  return estimateWaitTimeFlow(input);
}

const estimateWaitTimePrompt = ai.definePrompt({
  name: 'estimateWaitTimePrompt',
  input: {schema: EstimateWaitTimeInputSchema},
  output: {schema: EstimateWaitTimeOutputSchema},
  prompt: `You are an AI assistant that estimates the waiting time for users in a queue.

  Given the following information, estimate the waiting time in minutes:

  Department: {{{department}}}
  Counter: {{{counter}}}
  Queue Length: {{{queueLength}}}
  Historical Data: {{{historicalData}}}

  Provide a confidence level for your estimation (low, medium, high).
  Be realistic with wait time estimates.
  `, 
});

const estimateWaitTimeFlow = ai.defineFlow(
  {
    name: 'estimateWaitTimeFlow',
    inputSchema: EstimateWaitTimeInputSchema,
    outputSchema: EstimateWaitTimeOutputSchema,
  },
  async input => {
    const {output} = await estimateWaitTimePrompt(input);
    return output!;
  }
);
