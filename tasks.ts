import { db } from "./db";
import { followUpTasks } from "./shared/schema";
import { eq } from "drizzle-orm";

// Get all follow-up tasks
export async function getAllTasks() {
  return await db.select().from(followUpTasks).orderBy(followUpTasks.dateCreated);
}

// Get a specific task by ID
export async function getTaskById(id: number) {
  const [task] = await db.select().from(followUpTasks).where(eq(followUpTasks.id, id));
  return task;
}

// Get tasks by status
export async function getTasksByStatus(status: string) {
  return await db.select().from(followUpTasks).where(eq(followUpTasks.status, status));
}

// Create a new task
export async function createTask(task: {
  description: string;
  status?: string;
  priority?: string;
  assignedTo?: number;
}) {
  const [newTask] = await db.insert(followUpTasks).values(task).returning();
  return newTask;
}

// Update a task
export async function updateTask(id: number, updates: any) {
  const [updatedTask] = await db.update(followUpTasks)
    .set(updates)
    .where(eq(followUpTasks.id, id))
    .returning();
  return updatedTask;
}

// Mark a task as complete
export async function completeTask(
  id: number, 
  completionNotes: string = "", 
  userId: number = 1
) {
  const [completedTask] = await db.update(followUpTasks)
    .set({
      status: "completed",
      completedAt: new Date(),
      completedBy: userId,
      completionNotes
    })
    .where(eq(followUpTasks.id, id))
    .returning();
  return completedTask;
}

// Function to detect task completion requests from prompts
export function detectTaskCompletionRequest(prompt: string): boolean {
  const completionKeywords = [
    "mark as complete",
    "mark as completed",
    "mark task as complete",
    "mark task as completed",
    "mark the task as complete",
    "mark the task as completed",
    "complete task",
    "completed task",
    "task completed",
    "task is done",
    "task is complete",
    "task is completed",
    "finished task",
    "task is finished",
    "resolved task",
    "task is resolved",
    "done with task",
    "remove task",
    "task is done",
    "take care of",
    "taken care of",
    "addressed the issue",
    "fixed the issue"
  ];

  const lowercasePrompt = prompt.toLowerCase();
  return completionKeywords.some(keyword => lowercasePrompt.includes(keyword));
}

// Function to extract task ID or description from a prompt
export function extractTaskFromPrompt(prompt: string): { id?: number, description?: string } {
  // Try to extract a task ID
  const idMatch = prompt.match(/task\s+#?(\d+)|#(\d+)|task\s+id\s+(\d+)|task\s+number\s+(\d+)/i);
  if (idMatch) {
    const matchedId = idMatch[1] || idMatch[2] || idMatch[3] || idMatch[4];
    if (matchedId) {
      const id = parseInt(matchedId);
      if (!isNaN(id)) {
        return { id };
      }
    }
  }
  
  // Try to extract a task description
  const descriptionPatterns = [
    /mark\s+(.*?)\s+as\s+(?:complete|completed|done|finished)/i,
    /completed\s+(.*?)(?:\.|\?|$)/i,
    /finished\s+(.*?)(?:\.|\?|$)/i,
    /done\s+with\s+(.*?)(?:\.|\?|$)/i,
    /resolved\s+(.*?)(?:\.|\?|$)/i,
    /addressed\s+(.*?)(?:\.|\?|$)/i,
    /fixed\s+(.*?)(?:\.|\?|$)/i,
    /taken\s+care\s+of\s+(.*?)(?:\.|\?|$)/i
  ];
  
  for (const pattern of descriptionPatterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      return { description: match[1].trim() };
    }
  }
  
  return {};
}

// Process a task completion request
export async function processTaskCompletionRequest(prompt: string) {
  console.log("Processing potential task completion request");
  
  // Detect if this is a task completion request
  if (!detectTaskCompletionRequest(prompt)) {
    console.log("Not a task completion request");
    return { 
      success: false, 
      message: "Not a task completion request" 
    };
  }
  
  console.log("Task completion request detected");
  
  // Extract task information
  const { id, description } = extractTaskFromPrompt(prompt);
  console.log(`Extracted task info - ID: ${id}, Description: ${description}`);
  
  // If we have a task ID, try to complete that specific task
  if (id) {
    const task = await getTaskById(id);
    if (task) {
      if (task.status === "completed") {
        return { 
          success: false, 
          message: `Task #${id} is already marked as complete.` 
        };
      }
      
      const completedTask = await completeTask(id, `Completed via AI copilot request: "${prompt}"`);
      if (completedTask) {
        return { 
          success: true, 
          message: `Successfully marked task #${id} as complete.`,
          completedTask
        };
      } else {
        return { 
          success: false, 
          message: `Failed to mark task #${id} as complete.` 
        };
      }
    } else {
      return { 
        success: false, 
        message: `Task #${id} not found.` 
      };
    }
  }
  
  // If we have a task description, try to find and complete matching tasks
  if (description) {
    // Get all pending tasks
    const pendingTasks = await getTasksByStatus("pending");
    
    // Look for tasks with similar descriptions
    const matchingTasks = pendingTasks.filter(task => {
      return task.description.toLowerCase().includes(description.toLowerCase()) ||
             description.toLowerCase().includes(task.description.toLowerCase());
    });
    
    if (matchingTasks.length === 0) {
      return { 
        success: false, 
        message: `No pending tasks found matching "${description}".` 
      };
    }
    
    if (matchingTasks.length === 1) {
      const task = matchingTasks[0];
      const completedTask = await completeTask(task.id, `Completed via AI copilot request: "${prompt}"`);
      if (completedTask) {
        return { 
          success: true, 
          message: `Successfully marked task "${task.description}" as complete.`,
          completedTask 
        };
      } else {
        return { 
          success: false, 
          message: `Failed to mark task "${task.description}" as complete.` 
        };
      }
    }
    
    // Multiple matching tasks
    return { 
      success: false, 
      message: `Multiple tasks match "${description}". Please specify which task to complete by its ID.` 
    };
  }
  
  return { 
    success: false, 
    message: "Could not identify which task to complete. Please provide more information." 
  };
}