import type { Express } from "express";
import { createServer, type Server } from "http";

// Import all route modules
import authRoutes from "./auth";
import staffingRoutes from "./staffing";
import tasksRoutes from "./tasks";
import copilotRoutes from "./copilot";
import calendarRoutes from "./calendar";
import emailRoutes from "./email";
import complianceRoutes from "./compliance";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all route modules with their prefixes
  app.use("/api/auth", authRoutes);
  app.use("/api/staffing", staffingRoutes);
  app.use("/api", tasksRoutes);  // tasks routes include /followups
  app.use("/api/copilot", copilotRoutes);
  app.use("/api/calendar", calendarRoutes);
  app.use("/api/email", emailRoutes);
  app.use("/api/compliance", complianceRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
