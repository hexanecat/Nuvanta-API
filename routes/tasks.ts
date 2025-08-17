import { Router } from "express";
import { followUpTasks as mockFollowUpTasks } from "../shared/mockData";
import { getAllTasks, getTaskById, completeTask, processTaskCompletionRequest } from "../tasks";

const router = Router();

// Get follow-up tasks
router.get("/followups", async (req, res) => {
  try {
    // Get tasks from database
    const tasks = await getAllTasks();
    const pendingTasks = tasks.filter(task => task.status === "pending");
    
    if (pendingTasks.length > 0) {
      const followUpsData = {
        count: pendingTasks.length,
        items: pendingTasks.map(task => ({ 
          id: task.id,
          description: task.description 
        })),
        daysOverdue: 3
      };
      
      res.json(followUpsData);
    } else {
      // If no pending tasks in database, use the mock data
      res.json({ 
        count: mockFollowUpTasks.length, 
        items: mockFollowUpTasks.map((task, index) => ({ 
          id: index+1,
          description: task.description 
        })),
        daysOverdue: 3
      });
    }
  } catch (error) {
    console.error("Error fetching follow-up tasks:", error);
    // Use mock data
    res.json({ 
      count: mockFollowUpTasks.length, 
      items: mockFollowUpTasks.map((task, index) => ({ 
        id: index+1,
        description: task.description 
      })),
      daysOverdue: 3
    });
  }
});

// Mark a task as complete
router.post("/followups/:id/complete", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const completionNotes = req.body.notes || "Marked as complete via dashboard";
    const userId = req.body.userId || 1; // Default to user ID 1 if not provided
    
    console.log(`Attempting to mark task #${taskId} as complete`);
    
    const task = await getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: `Task #${taskId} not found.` 
      });
    }
    
    if (task.status === "completed") {
      return res.status(400).json({ 
        success: false, 
        message: `Task #${taskId} is already marked as complete.` 
      });
    }
    
    const completedTask = await completeTask(taskId, completionNotes, userId);
    
    if (completedTask) {
      return res.status(200).json({ 
        success: true, 
        message: `Successfully marked task #${taskId} as complete.`,
        task: completedTask
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: `Failed to mark task #${taskId} as complete.` 
      });
    }
  } catch (error) {
    console.error("Error completing task:", error);
    return res.status(500).json({ 
      success: false, 
      message: "An error occurred while completing the task."
    });
  }
});

export default router;
