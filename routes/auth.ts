import { Router } from "express";
import bcrypt from 'bcrypt';
import { db } from "../db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Username and password are required" 
      });
    }
    
    // Find user by username
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid username or password" 
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid username or password" 
      });
    }
    
    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: "Login successful",
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});

// Register new user (admin only in production)
router.post("/register", async (req, res) => {
  try {
    const { username, password, fullName, role, unit, shift } = req.body;
    
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ 
        success: false, 
        message: "Username, password, fullName, and role are required" 
      });
    }
    
    // Check if user already exists
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: "Username already exists" 
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const [newUser] = await db.insert(users).values({
      username,
      password: hashedPassword,
      fullName,
      role,
      unit: unit || null,
      shift: shift || null
    }).returning();
    
    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
});

export default router;
