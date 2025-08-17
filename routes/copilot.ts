import { Router } from "express";
import { db } from "../db";
import { 
  copilotConversations, 
  copilotMessages, 
  copilotPrompts,
  calendarEvents
} from "../shared/schema";
import { eq, desc, gte } from "drizzle-orm";
import { generateAIResponse } from "../openai";
import { nurses, units, complianceReports, copilotResponses, followUpTasks as mockFollowUpTasks } from "../shared/mockData";
import { getAllTasks, processTaskCompletionRequest } from "../tasks";

const router = Router();

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

// Main copilot endpoint
router.post("/", async (req, res) => {
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
router.get("/conversations", async (req, res) => {
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
router.get("/conversations/:id", async (req, res) => {
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

export default router;
