
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';
import clientPromise, { dbName, ticketsCollectionName } from '@/lib/mongodb';
import type { Department, QueueUser, UserStatus, JoinQueueFormState } from '@/lib/types';
import { sendQueueConfirmationEmail, sendQueueUpdateEmail } from '@/lib/email';
import { estimateWaitTime } from '@/ai/flows/estimate-wait-time';


const JoinQueueSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  contact: z.string().email({ message: 'Please enter a valid email.' }),
  department: z.string().min(1, { message: 'Please select a department.' }),
  counter: z.string().min(1, { message: 'Please select a counter.' }),
});


export async function joinQueueAction(
  prevState: JoinQueueFormState,
  formData: FormData
): Promise<JoinQueueFormState> {
  const validatedFields = JoinQueueSchema.safeParse({
    name: formData.get('name'),
    contact: formData.get('contact'),
    department: formData.get('department'),
    counter: formData.get('counter'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, contact, department, counter } = validatedFields.data;

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const ticketsCollection = db.collection<Omit<QueueUser, 'id'>>(ticketsCollectionName);

    // Get current queue length for the AI model
    const waitingCount = await ticketsCollection.countDocuments({
      department: department,
      counter: counter,
      status: 'waiting',
    });

    // --- AI Wait Time Estimation ---
    const aiEstimation = await estimateWaitTime({
      department: department as Department,
      currentQueueLength: waitingCount,
    });
    // --- End AI Wait Time Estimation ---


    const newUser: Omit<QueueUser, 'id'> = {
      name,
      contact,
      department: department as Department,
      counter,
      joinedAt: new Date(),
      estimatedWaitTime: aiEstimation.estimatedWaitTime, 
      confidence: aiEstimation.confidence,
      status: 'waiting',
      queueNumber: 0 // Will be assigned based on position later
    };

    const result = await ticketsCollection.insertOne(newUser);
    const newUserId = result.insertedId.toString();

    const userWithId: QueueUser = { ...newUser, id: newUserId };
    
    // We get the position *after* inserting to get the correct queue number
    const position = await ticketsCollection.countDocuments({ 
        department, 
        counter,
        status: 'waiting',
        joinedAt: { $lte: userWithId.joinedAt } 
    });
    userWithId.queueNumber = position;

    revalidatePath('/admin');
    revalidatePath(`/queue/${newUserId}`);
    
    const statusLink = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/queue/${newUserId}` : `/queue/${newUserId}`;
    await sendQueueConfirmationEmail(userWithId, statusLink);

    return {
      success: true,
      message: 'Successfully joined the queue.',
      userId: newUserId,
      queueNumber: userWithId.queueNumber,
      estimatedWaitTime: userWithId.estimatedWaitTime,
    };

  } catch (error) {
    console.error('Error joining queue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      success: false,
      message: `An error occurred: ${errorMessage}`,
    };
  }
}

export async function getUserStatus(userId: string): Promise<UserStatus | null> {
    if (!ObjectId.isValid(userId)) {
        return null;
    }
    
    try {
        const client = await clientPromise;
        const db = client.db(dbName);
        const ticketsCollection = db.collection<QueueUser>(ticketsCollectionName);
        
        const userTicket = await ticketsCollection.findOne({ _id: new ObjectId(userId) });
        
        if (!userTicket || userTicket.status !== 'waiting') {
            return null;
        }

        const { department, counter, name, estimatedWaitTime, confidence } = userTicket;

        const position = await ticketsCollection.countDocuments({
            department,
            counter,
            status: 'waiting',
            joinedAt: { $lte: userTicket.joinedAt }
        });

        const totalInQueue = await ticketsCollection.countDocuments({ department, counter, status: 'waiting' });
        
        const servingTicket = await ticketsCollection.findOne({ department, counter, status: 'serving' }, { sort: { calledAt: -1 } });

        return {
            userName: name,
            position,
            department,
            counter,
            totalInQueue,
            estimatedWaitTime,
            confidence,
            currentlyServing: servingTicket?.queueNumber ?? null,
        };

    } catch (error) {
        console.error('Error getting user status:', error);
        return null;
    }
}

export async function cancelUserTicket(userId: string): Promise<{ success: boolean }> {
  if (!ObjectId.isValid(userId)) {
    return { success: false };
  }

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const ticketsCollection = db.collection<QueueUser>(ticketsCollectionName);

    // Find the user who is cancelling to get their details
    const cancellingUser = await ticketsCollection.findOne({ _id: new ObjectId(userId) });
    if (!cancellingUser) {
      return { success: false };
    }

    // Find all users who are in the same queue and joined after the cancelling user
    const usersToNotify = await ticketsCollection.find({
      department: cancellingUser.department,
      counter: cancellingUser.counter,
      status: 'waiting',
      joinedAt: { $gt: cancellingUser.joinedAt }
    }).sort({ joinedAt: 1 }).toArray();

    // Now, update the user's status to 'cancelled'
    const result = await ticketsCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { status: 'cancelled' } }
    );

    if (result.modifiedCount > 0) {
      revalidatePath('/admin');
      revalidatePath(`/queue/${userId}`);
      
      // Send update emails to the affected users
      for (const user of usersToNotify) {
        // We need to calculate their new position. The simplest way is to count again.
        const newPosition = await ticketsCollection.countDocuments({
          department: user.department,
          counter: user.counter,
          status: 'waiting',
          joinedAt: { $lte: user.joinedAt }
        });

        const statusLink = process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/queue/${user._id.toString()}`
          : `/queue/${user._id.toString()}`;
        
        await sendQueueUpdateEmail(user, newPosition, statusLink);
      }
      
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error('Error cancelling ticket:', error);
    return { success: false };
  }
}

export async function getAdminDashboardData() {
    try {
        const client = await clientPromise;
        const db = client.db(dbName);
        const ticketsCollection = db.collection<QueueUser>(ticketsCollectionName);

        const allWaitingTickets = await ticketsCollection.find({ status: 'waiting' }).sort({ joinedAt: 1 }).toArray();

        // Calculate stats
        const totalWaiting = allWaitingTickets.length;
        const totalWaitTime = allWaitingTickets.reduce((sum, ticket) => sum + (ticket.estimatedWaitTime || 0), 0);
        const averageWaitTime = totalWaiting > 0 ? totalWaitTime / totalWaiting : 0;
        
        return {
            tickets: JSON.parse(JSON.stringify(allWaitingTickets)) as QueueUser[], // Serialize to pass to client component
            stats: {
                totalWaiting,
                averageWaitTime,
            }
        };
    } catch (error) {
        console.error("Error fetching admin data:", error);
        return {
            tickets: [],
            stats: { totalWaiting: 0, averageWaitTime: 0 }
        };
    }
}

export async function revalidateAdmin() {
  revalidatePath('/admin');
}
