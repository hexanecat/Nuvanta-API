import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { nurses, units, complianceReports, copilotResponses, followUpTasks as mockFollowUpTasks } from "./shared/mockData";
import { generateAIResponse } from "./openai";
import { sendEmail, sendScheduleNotification, sendAlertNotification } from "./email";
import { getAllTasks, getTaskById, getTasksByStatus, createTask, updateTask, completeTask, processTaskCompletionRequest } from "./tasks";

import { db } from "./db";
import { 
  copilotConversations, 
  copilotMessages, 
  copilotPrompts,
  calendarEvents,
  insertCalendarEventSchema
} from "./shared/schema";
import { eq, desc, gte, and } from "drizzle-orm";

// Function to process calendar requests from AI responses
async function processCalendarRequests(prompt: string, response: string): Promise<void> {
  console.log("Processing potential calendar request...");
  
  // First check if the prompt contains calendar-related keywords
  const promptCalendarKeywords = [
    "remind me",
    "schedule",
    "put in",
    "add to calendar",
    "add to my calendar",
    "create a reminder",
    "set a reminder",
    "calendar",
    "check in with",
    "follow up with",
    "check back",
    "remember to"
  ];
  
  // Check if the response contains calendar-related phrases
  const calendarPhrases = [
    "I've added this to your calendar",
    "I've scheduled this for you",
    "added to your calendar",
    "added this reminder",
    "created a calendar event",
    "scheduled a reminder",
    "put this on your calendar",
    "added to the calendar",
    "I'll remind you",
    "reminder has been set",
    "reminder is set"
  ];
  
  // Check if the prompt is likely a calendar request
  const promptHasCalendarIntent = promptCalendarKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Check if any calendar phrases are in the response
  const responseHasCalendarConfirmation = calendarPhrases.some(phrase => 
    response.toLowerCase().includes(phrase.toLowerCase())
  );
  
  // Log for debugging
  console.log(`Prompt has calendar intent: ${promptHasCalendarIntent}`);
  console.log(`Response has calendar confirmation: ${responseHasCalendarConfirmation}`);
  
  // Proceed if either condition is true
  const isCalendarRequest = promptHasCalendarIntent || responseHasCalendarConfirmation;
  
  if (!isCalendarRequest) {
    console.log("Not a calendar request, skipping");
    return; // Not a calendar request
  }
  
  console.log("Calendar request detected, processing...");
  
  // Common time patterns in requests
  const timePatterns = {
    months: /\b(in|after|next|following)\s+(\d+)\s+months?\b/i,
    weeks: /\b(in|after|next|following)\s+(\d+)\s+weeks?\b/i,
    days: /\b(in|after|next|following)\s+(\d+)\s+days?\b/i,
    specificDate: /\bon\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?)/i,
    monthDay: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s+\d{4})?\b/i
  };
  
  // Try to extract date information
  let eventDate = new Date();
  let dateFound = false;
  
  // Check for "in X months" pattern
  const monthsMatch = prompt.match(timePatterns.months) || response.match(timePatterns.months);
  if (monthsMatch && monthsMatch[2]) {
    const months = parseInt(monthsMatch[2]);
    eventDate.setMonth(eventDate.getMonth() + months);
    dateFound = true;
  }
  
  // Check for "in X weeks" pattern
  const weeksMatch = prompt.match(timePatterns.weeks) || response.match(timePatterns.weeks);
  if (weeksMatch && weeksMatch[2] && !dateFound) {
    const weeks = parseInt(weeksMatch[2]);
    eventDate.setDate(eventDate.getDate() + (weeks * 7));
    dateFound = true;
  }
  
  // Check for "in X days" pattern
  const daysMatch = prompt.match(timePatterns.days) || response.match(timePatterns.days);
  if (daysMatch && daysMatch[2] && !dateFound) {
    const days = parseInt(daysMatch[2]);
    eventDate.setDate(eventDate.getDate() + days);
    dateFound = true;
  }
  
  // Extract names mentioned
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  const names = new Set<string>();
  let match;
  
  // Find names in the prompt
  while ((match = namePattern.exec(prompt)) !== null) {
    const name = match[1];
    // Skip common words that might be capitalized
    if (!["I", "You", "The", "A", "An", "In", "On", "At", "For", "With", "And", "Or", "But"].includes(name)) {
      names.add(name);
    }
  }
  
  // Look for names in the response too
  namePattern.lastIndex = 0; // Reset the regex index
  while ((match = namePattern.exec(response)) !== null) {
    const name = match[1];
    // Skip common words that might be capitalized
    if (!["I", "You", "The", "A", "An", "In", "On", "At", "For", "With", "And", "Or", "But"].includes(name)) {
      names.add(name);
    }
  }
  
  // Try to create a title based on the prompt
  const checkInMatch = prompt.match(/\bcheck(\s+in)?\s+with\b/i) || response.match(/\bcheck(\s+in)?\s+with\b/i);
  const followUpMatch = prompt.match(/\bfollow(\s*|-*)up\b/i) || response.match(/\bfollow(\s*|-*)up\b/i);
  const reminderMatch = prompt.match(/\bremind(\s+me)?\b/i) || response.match(/\bremind(\s+me)?\b/i);
  
  // Default title and description
  let title = "AI-created reminder";
  let description = prompt;
  let relatedTo = Array.from(names).join(", ");
  
  // Create more specific title based on patterns
  if (checkInMatch && names.size > 0) {
    title = `Check in with ${Array.from(names).join(", ")}`;
  } else if (followUpMatch && names.size > 0) {
    title = `Follow up with ${Array.from(names).join(", ")}`;
  } else if (reminderMatch) {
    const reminderForMatch = prompt.match(/\bremind\s+me\s+(?:about|to|of)\s+(.+?)(?:\.|\?|$)/i) || 
                           response.match(/\bremind\s+you\s+(?:about|to|of)\s+(.+?)(?:\.|\?|$)/i);
    if (reminderForMatch && reminderForMatch[1]) {
      title = `Reminder: ${reminderForMatch[1].trim()}`;
    } else {
      title = "Reminder from Nuvanta";
    }
  }
  
  // Determine priority based on language
  let priority = "medium";
  if (prompt.match(/\bimportant|urgent|critical|high\s+priority\b/i) || 
      response.match(/\bimportant|urgent|critical|high\s+priority\b/i)) {
    priority = "high";
  } else if (prompt.match(/\blow\s+priority|whenever|not\s+urgent\b/i) || 
             response.match(/\blow\s+priority|whenever|not\s+urgent\b/i)) {
    priority = "low";
  }
  
  // Create the calendar event
  const calendarEvent = {
    title,
    description,
    eventDate,
    priority,
    relatedTo,
    reminder: true
  };
  
  await db.insert(calendarEvents).values(calendarEvent);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  app.get("/api/staffing", (req, res) => {
    const dayShiftNurses = nurses.filter(nurse => nurse.shift === "day").length;
    const nightShiftNurses = nurses.filter(nurse => nurse.shift === "night").length;
    const totalNurses = nurses.length;
    
    const staffingData = {
      status: "Fully staffed today",
      onDuty: totalNurses,
      total: totalNurses,
      dayShift: dayShiftNurses,
      nightShift: nightShiftNurses
    };
    
    res.json(staffingData);
  });

  app.get("/api/burnout", (req, res) => {
    const atRiskStaff = nurses.filter(nurse => nurse.burnoutRisk === "high");
    
    const burnoutData = {
      count: atRiskStaff.length,
      staff: atRiskStaff.map(nurse => ({ name: nurse.name })),
      lastUpdated: "Today, 6:30 AM"
    };
    
    res.json(burnoutData);
  });

  app.get("/api/followups", async (req, res) => {
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
  
  // Add an endpoint to mark a task as complete
  app.post("/api/followups/:id/complete", async (req, res) => {
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

  app.get("/api/compliance", (req, res) => {
    const quarterlyReport = complianceReports.find(report => 
      report.name === "Quarterly staff performance report"
    );
    
    const complianceData = {
      description: "Quarterly report due Friday",
      percentComplete: quarterlyReport?.percentComplete || 65,
      daysLeft: 3,
      lastEdited: "Yesterday"
    };
    
    res.json(complianceData);
  });

  app.post("/api/copilot", async (req, res) => {
    try {
      const { prompt, conversationId = null } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      // Default user ID for now (we'll add authentication later)
      const userId = 1;
      
      // Get conversation history if conversationId is provided
      let conversationHistory: Array<{ role: string; content: string }> = [];
      let currentConversationId = conversationId;
      
      if (conversationId) {
        // Fetch messages from the existing conversation
        const messages = await db.select()
          .from(copilotMessages)
          .where(eq(copilotMessages.conversationId, conversationId))
          .orderBy(copilotMessages.createdAt);
        
        conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      } else {
        // Create a new conversation
        const [newConversation] = await db.insert(copilotConversations)
          .values({
            userId,
            title: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '')
          })
          .returning();
        
        currentConversationId = newConversation.id;
      }
      
      // First check if this is a task completion request
      console.log("Checking if this is a task completion request...");
      const taskResult = await processTaskCompletionRequest(prompt);
      
      // Define response HTML
      let responseHtml = "";
      
      // If it's a successful task completion request
      if (taskResult.success) {
        console.log("Task completion successful:", taskResult.message);
        responseHtml = `<p><strong>Action Taken:</strong> ${taskResult.message}</p>
        <p>The task has been marked as complete and logged in the system.</p>`;
      } else {
        // Try to match with predefined responses
        const normalizedPrompt = prompt.toLowerCase().trim();
        
        if (normalizedPrompt.includes("follow up")) {
          responseHtml = copilotResponses["what should i follow up on today"];
        } else if (normalizedPrompt.includes("burnout") || normalizedPrompt.includes("risk")) {
          responseHtml = copilotResponses["who is at risk of burnout"];
        } else if (normalizedPrompt.includes("priorities") || normalizedPrompt.includes("top")) {
          responseHtml = copilotResponses["what are my top 3 priorities"];
        } else {
          // If no predefined response, use OpenAI with conversation history
          try {
            // Get real-time task data from the database
            const dbTasks = await getAllTasks();
            
            responseHtml = await generateAIResponse(prompt, {
              nurses,
              units,
              followUpTasks: dbTasks.length > 0 ? dbTasks : mockFollowUpTasks,
              complianceReports,
              conversationHistory
            });
          } catch (error) {
            console.error("Error generating AI response:", error);
            responseHtml = copilotResponses["default"];
          }
        }
      }
      
      // Store the user message
      await db.insert(copilotMessages)
        .values({
          conversationId: currentConversationId,
          role: 'user',
          content: prompt
        });
      
      // Store the assistant response
      await db.insert(copilotMessages)
        .values({
          conversationId: currentConversationId,
          role: 'assistant',
          content: responseHtml
        });
      
      // Also store in the legacy copilotPrompts table for backward compatibility
      await db.insert(copilotPrompts)
        .values({
          userId,
          prompt,
          response: responseHtml
        });
        
      // Check if the response contains a calendar request
      try {
        await processCalendarRequests(prompt, responseHtml);
      } catch (error) {
        console.error("Error processing calendar requests:", error);
        // Continue anyway, this is not critical
      }
      
      res.json({ 
        response: responseHtml,
        conversationId: currentConversationId 
      });
    } catch (error) {
      console.error("Error in copilot endpoint:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });
  
  // Get conversation history
  app.get("/api/copilot/conversations", async (req, res) => {
    try {
      // Default user ID for now (we'll add authentication later)
      const userId = 1;
      
      const conversations = await db.select()
        .from(copilotConversations)
        .where(eq(copilotConversations.userId, userId))
        .orderBy(desc(copilotConversations.updatedAt))
        .limit(20);
      
      return res.json({ conversations });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  
  // Get messages for a specific conversation
  app.get("/api/copilot/conversations/:id", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      
      const messages = await db.select()
        .from(copilotMessages)
        .where(eq(copilotMessages.conversationId, conversationId))
        .orderBy(copilotMessages.createdAt);
      
      return res.json({ messages });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  // Calendar API routes
  
  // Get all calendar events
  app.get("/api/calendar", async (req, res) => {
    try {
      const events = await db.select()
        .from(calendarEvents)
        .orderBy(desc(calendarEvents.eventDate));
      
      return res.json({ events });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });
  
  // Get upcoming calendar events
  app.get("/api/calendar/upcoming", async (req, res) => {
    try {
      const today = new Date();
      
      const events = await db.select()
        .from(calendarEvents)
        .where(gte(calendarEvents.eventDate, today))
        .orderBy(calendarEvents.eventDate);
      
      return res.json({ events });
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ error: "Failed to fetch upcoming events" });
    }
  });
  
  // Create a new calendar event
  app.post("/api/calendar", async (req, res) => {
    try {
      // Parse and validate the request body
      const parsedBody = insertCalendarEventSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ 
          error: "Invalid event data", 
          details: parsedBody.error.format() 
        });
      }
      
      // Insert the event
      const [event] = await db.insert(calendarEvents)
        .values(parsedBody.data)
        .returning();
      
      return res.status(201).json({ event });
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });
  
  // Delete a calendar event
  app.delete("/api/calendar/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }
      
      await db.delete(calendarEvents)
        .where(eq(calendarEvents.id, eventId));
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });
  
  // Email routes
  app.post("/api/email/send", async (req, res) => {
    try {
      const { to, subject, text, html } = req.body;
      
      // Basic validation
      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: to, subject, and either text or html" 
        });
      }
      
      const result = await sendEmail({ to, subject, text, html });
      return res.json(result);
    } catch (error: any) {
      console.error("Error sending email:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to send email",
        error: error?.message || String(error) 
      });
    }
  });
  
  // Schedule notification endpoint
  app.post("/api/email/schedule-notification", async (req, res) => {
    try {
      const { to, nurseName, scheduleDetails, startDate, endDate, additionalMessage } = req.body;
      
      // Basic validation
      if (!to || !nurseName || !scheduleDetails || !startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: to, nurseName, scheduleDetails, startDate, endDate" 
        });
      }
      
      const result = await sendScheduleNotification({ 
        to, 
        nurseName, 
        scheduleDetails, 
        startDate, 
        endDate, 
        additionalMessage 
      });
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error sending schedule notification:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to send schedule notification",
        error: error?.message || String(error) 
      });
    }
  });
  
  // Alert notification endpoint
  app.post("/api/email/alert-notification", async (req, res) => {
    try {
      const { to, alertType, alertDetails, actionRequired, actionText, dueDate } = req.body;
      
      // Basic validation
      if (!to || !alertType || !alertDetails) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: to, alertType, alertDetails" 
        });
      }
      
      // Validate alert type
      if (!['Critical', 'Important', 'Informational'].includes(alertType)) {
        return res.status(400).json({ 
          success: false, 
          message: "alertType must be one of: Critical, Important, Informational" 
        });
      }
      
      const result = await sendAlertNotification({ 
        to, 
        alertType, 
        alertDetails, 
        actionRequired, 
        actionText, 
        dueDate 
      });
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error sending alert notification:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to send alert notification",
        error: error?.message || String(error) 
      });
    }
  });
  
  // Batch email endpoint (for sending to multiple staff)
  app.post("/api/email/batch", async (req, res) => {
    try {
      const { recipients, subject, messageContent } = req.body;
      
      // Basic validation
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !subject || !messageContent) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: recipients (array), subject, messageContent" 
        });
      }
      
      // Map email addresses from recipients
      const emailAddresses = recipients.map(recipient => recipient.email);
      
      const result = await sendEmail({
        to: emailAddresses,
        subject,
        html: messageContent
      });
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error sending batch email:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to send batch email",
        error: error?.message || String(error) 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
