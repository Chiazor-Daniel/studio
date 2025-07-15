'use server';

import { z } from 'zod';
import { addUserToQueue, callNextUser, getQueueState, getUserStatus, removeUser } from '@/lib/queue-manager';
import type { Department, QueueState, UserStatus } from '@/lib/types';
import { estimateWaitTime } from '@/ai/flows/estimate-wait-time';
import { revalidatePath } from 'next/cache';

const joinQueueSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contact: z.string().email('Please enter a valid email'),
  department: z.enum(['Customer Service', 'New Accounts', 'Loans & Mortgages']),
  counter: z.string().min(1, 'Please select a counter'),
});

export type JoinQueueFormState = {
  message: string;
  errors?: {
    name?: string[];
    contact?: string[];
    department?: string[];
    counter?: string[];
  };
  success: boolean;
  userId?: string;
};

export async function joinQueueAction(
  prevState: JoinQueueFormState,
  formData: FormData
): Promise<JoinQueueFormState> {
  const validatedFields = joinQueueSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check your inputs.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }
  
  try {
    const { department, counter } = validatedFields.data;
    const currentQueueState = getQueueState();
    const queueLength = currentQueueState[department].queue.length;

    const aiEstimation = await estimateWaitTime({
        department,
        counter,
        queueLength: queueLength,
        historicalData: "Average service time is 5 minutes per person. Peak hours are from 12 PM to 2 PM, where wait times can increase by 50%. The 'New Accounts' department is generally faster.",
    });

    const newUser = addUserToQueue({ ...validatedFields.data });
    
    newUser.estimatedWaitTime = aiEstimation.estimatedWaitTime;
    newUser.confidence = aiEstimation.confidence;
    
    revalidatePath('/admin');
    
    return {
      message: `Successfully joined the queue! Your number is ${newUser.queueNumber}.`,
      success: true,
      userId: newUser.id,
    };
  } catch (error) {
    console.error(error);
    return {
      message: 'An unexpected error occurred. Please try again.',
      success: false,
    };
  }
}

export async function getQueueStatusAction(userId: string): Promise<UserStatus | null> {
    return getUserStatus(userId);
}

export async function getAdminQueueStateAction(): Promise<QueueState> {
    return getQueueState();
}

export async function callNextCustomerAction(department: Department): Promise<{ success: boolean }> {
    callNextUser(department);
    revalidatePath('/admin');
    // We also need to revalidate any active user queue pages, but that's complex.
    // For this scaffold, we rely on client-side polling on the user page.
    return { success: true };
}

export async function removeCustomerAction(userId: string): Promise<{ success: boolean }> {
    removeUser(userId);
    revalidatePath('/admin');
    return { success: true };
}
