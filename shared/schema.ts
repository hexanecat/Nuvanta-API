import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("nurse"),
  unit: text("unit"),
  shift: text("shift"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Units table
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  beds: integer("beds").notNull(),
  requiredNursesDay: integer("required_nurses_day").notNull(),
  requiredNursesNight: integer("required_nurses_night").notNull(),
});

// Follow-up tasks table
export const followUpTasks = pgTable("follow_up_tasks", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  dateCreated: timestamp("date_created").defaultNow().notNull(),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  assignedTo: integer("assigned_to").references(() => users.id),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by").references(() => users.id),
  completionNotes: text("completion_notes"),
});

// Compliance reports table
export const complianceReports = pgTable("compliance_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dueDate: timestamp("due_date").notNull(),
  percentComplete: integer("percent_complete").notNull().default(0),
  lastEdited: timestamp("last_edited").defaultNow().notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
});

// Copilot prompts table to store history (keeping for backwards compatibility)
export const copilotPrompts = pgTable("copilot_prompts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Copilot conversations table to group messages into conversations
export const copilotConversations = pgTable("copilot_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1), // Default user ID for now
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Copilot messages table to store the entire conversation history
export const copilotMessages = pgTable("copilot_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => copilotConversations.id, { onDelete: 'cascade' }).notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Calendar events table to store reminders and appointments
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().default(1),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  reminder: boolean("reminder").default(true),
  reminderSent: boolean("reminder_sent").default(false),
  priority: text("priority").default("medium"), // 'low', 'medium', 'high'
  relatedTo: text("related_to"), // can be staff member name, department, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
});

export const insertFollowUpTaskSchema = createInsertSchema(followUpTasks).omit({
  id: true,
  dateCreated: true,
});

export const insertComplianceReportSchema = createInsertSchema(complianceReports).omit({
  id: true,
  lastEdited: true,
});

export const insertCopilotPromptSchema = createInsertSchema(copilotPrompts).omit({
  id: true,
  timestamp: true,
});

export const insertCopilotConversationSchema = createInsertSchema(copilotConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCopilotMessageSchema = createInsertSchema(copilotMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reminderSent: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;

export type InsertFollowUpTask = z.infer<typeof insertFollowUpTaskSchema>;
export type FollowUpTask = typeof followUpTasks.$inferSelect;

export type InsertComplianceReport = z.infer<typeof insertComplianceReportSchema>;
export type ComplianceReport = typeof complianceReports.$inferSelect;

export type InsertCopilotPrompt = z.infer<typeof insertCopilotPromptSchema>;
export type CopilotPrompt = typeof copilotPrompts.$inferSelect;

export type InsertCopilotConversation = z.infer<typeof insertCopilotConversationSchema>;
export type CopilotConversation = typeof copilotConversations.$inferSelect;

export type InsertCopilotMessage = z.infer<typeof insertCopilotMessageSchema>;
export type CopilotMessage = typeof copilotMessages.$inferSelect;

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
