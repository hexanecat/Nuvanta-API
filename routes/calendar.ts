import { Router } from "express";
import { db } from "../db";
import { calendarEvents, insertCalendarEventSchema } from "../shared/schema";
import { eq, desc, gte } from "drizzle-orm";

const router = Router();

// Get all calendar events
router.get("/", async (req, res) => {
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
router.get("/upcoming", async (req, res) => {
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
router.post("/", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
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

export default router;
