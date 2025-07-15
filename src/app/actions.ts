'use server';

import { z } from 'zod';
import type { JoinQueueFormState } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// This file is now mostly empty as queue logic has been moved to the client-side `useQueue` hook.
// We keep a shell of the joinQueueAction to avoid breaking imports, but it no longer does anything.
// This can be cleaned up in a future step.

export async function joinQueueAction(
  prevState: JoinQueueFormState,
  formData: FormData
): Promise<JoinQueueFormState> {
  // This server action is no longer used for queue logic.
  // The logic is now handled on the client in `useQueue` hook.
  return {
    message: 'This action is deprecated. Use client-side logic.',
    success: false,
  };
}

// These actions are also now handled on the client side.
// They are kept here to prevent breaking changes but can be removed.
export async function revalidateAdmin() {
  revalidatePath('/admin');
}
