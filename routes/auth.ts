import { Router } from "express";
import bcrypt from 'bcrypt';
import { db } from "../db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { validateLogin, validateRegister, asyncHandler, DatabaseError } from "./middleware";

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate a user with username and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Login endpoint
router.post("/login", validateLogin, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  // Validation is now handled by middleware, so we can trust the input
  
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
}));

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: User registration
 *     description: Register a new user (admin only in production)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: Username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Register new user (admin only in production)
router.post("/register", validateRegister, asyncHandler(async (req, res) => {
  const { username, password, fullName, role, unit, shift } = req.body;
  // Validation is now handled by middleware
  
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
}));

export default router;
