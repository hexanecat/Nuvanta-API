import 'dotenv/config';
import { db } from "./db";
import { followUpTasks, users, copilotConversations, copilotMessages, copilotPrompts, calendarEvents } from "./shared/schema";
import { followUpTasks as mockFollowUpTasks, nurses } from "./shared/mockData";

async function seedDatabase() {
  try {
    console.log("Seeding database with mock data...");
    
    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    
    if (existingUsers.length > 0) {
      console.log("Database already has data, skipping seed.");
      return;
    }
    
    // 1. First create users (no dependencies)
    console.log("Creating users...");
    const [adminUser] = await db.insert(users).values({
      username: "admin",
      password: "password123", // In production, this should be hashed
      fullName: "System Admin",
      role: "admin"
    }).returning();
    
    // Create nurse users from mock data
    const nurseUsers: typeof adminUser[] = [];
    for (const nurse of nurses.slice(0, 5)) { // Just create a few nurse users
      const [nurseUser] = await db.insert(users).values({
        username: nurse.name.toLowerCase().replace(/\s+/g, '.'),
        password: "password123",
        fullName: nurse.name,
        role: "nurse",
        unit: nurse.unit,
        shift: nurse.shift
      }).returning();
      nurseUsers.push(nurseUser);
    }
    
    console.log(`Created ${nurseUsers.length + 1} users`);
    
    // 2. Create copilot conversations (depends on users)
    console.log("Creating copilot conversations...");
    const [conversation] = await db.insert(copilotConversations).values({
      userId: adminUser.id,
      title: "Sample Conversation"
    }).returning();
    
    // 3. Create copilot messages (depends on conversations)
    await db.insert(copilotMessages).values([
      {
        conversationId: conversation.id,
        role: "user",
        content: "What should I follow up on today?"
      },
      {
        conversationId: conversation.id,
        role: "assistant",
        content: "Based on your current tasks, you should focus on the equipment request for Room 202."
      }
    ]);
    
    // 4. Create copilot prompts (depends on users)
    await db.insert(copilotPrompts).values({
      userId: adminUser.id,
      prompt: "What should I follow up on today?",
      response: "Based on your current tasks, you should focus on the equipment request for Room 202."
    });
    
    console.log("Created copilot data");
    
    // 5. Create follow-up tasks (depends on users)
    console.log("Creating follow-up tasks...");
    for (let i = 0; i < mockFollowUpTasks.length; i++) {
      const task = mockFollowUpTasks[i];
      const assignedUser = i < nurseUsers.length ? nurseUsers[i] : adminUser;
      
      await db.insert(followUpTasks).values({
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignedTo: assignedUser.id,
      });
    }
    
    console.log(`Created ${mockFollowUpTasks.length} follow-up tasks`);
    
    // 6. Create calendar events (no dependencies)
    console.log("Creating calendar events...");
    await db.insert(calendarEvents).values([
      {
        title: "Weekly Staff Meeting",
        description: "Review staffing levels and upcoming schedules",
        eventDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        priority: "medium",
        relatedTo: "Staff",
        reminder: true
      },
      {
        title: "Check in with Sarah Chen",
        description: "Follow up on burnout risk concerns",
        eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        priority: "high",
        relatedTo: "Sarah Chen",
        reminder: true
      }
    ]);
    
    console.log("Created calendar events");
    console.log("Database seeding completed successfully!");
    
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
