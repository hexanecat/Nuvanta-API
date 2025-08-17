import { Router } from "express";
import bcrypt from 'bcrypt';
import { db } from "../db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { validateLogin, validateRegister, asyncHandler, DatabaseError, authenticateToken } from "./middleware";
import { JWTService } from "../services/jwt";
import { body } from "express-validator";

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
  
  // Generate JWT tokens
  const { password: _, createdAt: __, ...userWithoutPassword } = user;
  const tokens = JWTService.generateTokens(userWithoutPassword);
  
  res.json({
    success: true,
    message: "Login successful",
    user: userWithoutPassword,
    ...tokens
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
  
  // Generate JWT tokens for new user
  const { password: _, createdAt: __, ...userWithoutPassword } = newUser;
  const tokens = JWTService.generateTokens(userWithoutPassword);
  
  res.status(201).json({
    success: true,
    message: "User created successfully",
    user: userWithoutPassword,
    ...tokens
  });
}));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Generate a new access token using a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/refresh", [
  body('refreshToken')
    .isString()
    .notEmpty()
    .withMessage('Refresh token is required'),
], asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  const getUserById = async (id: number) => {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  };
  
  try {
    const newAccessToken = await JWTService.refreshAccessToken(refreshToken, getUserById);
    
    res.json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      expiresIn: JWTService['getTokenExpirationTime']('15m') // Access token expiry
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || "Invalid refresh token"
    });
  }
}));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Logout the current user (client should discard tokens)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/logout", authenticateToken, asyncHandler(async (req, res) => {
  // In a stateless JWT system, logout is handled client-side by discarding the tokens
  // In a more advanced implementation, you might maintain a token blacklist
  
  res.json({
    success: true,
    message: "Logout successful. Please discard your tokens."
  });
}));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user profile
 *     description: Returns the current authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/me", authenticateToken, asyncHandler(async (req, res) => {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, req.user!.userId))
    .limit(1);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }
  
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    user: userWithoutPassword
  });
}));

export default router;
