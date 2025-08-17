import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../../services/jwt';
import { AuthenticationError, AuthorizationError } from './errorHandler';

// Extend Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = JWTService.extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthenticationError('Access token required');
  }

  try {
    const decoded = JWTService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    throw new AuthenticationError(error.message || 'Invalid token');
  }
};

/**
 * Middleware to check if token is optional (for endpoints that work with or without auth)
 */
export const optionalAuthentication = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = JWTService.extractTokenFromHeader(authHeader);

  if (token) {
    try {
      const decoded = JWTService.verifyAccessToken(token);
      req.user = decoded;
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }

  next();
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to require manager or admin role
 */
export const requireManager = requireRole(['manager', 'admin']);

/**
 * Middleware to check if user owns the resource or has elevated permissions
 */
export const requireOwnershipOrElevated = (getUserIdFromParams: (req: Request) => number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const targetUserId = getUserIdFromParams(req);
    const isOwner = req.user.userId === targetUserId;
    const hasElevatedRole = ['manager', 'admin'].includes(req.user.role);

    if (!isOwner && !hasElevatedRole) {
      throw new AuthorizationError('Access denied. You can only access your own resources.');
    }

    next();
  };
};

/**
 * Middleware to check if user can modify the resource
 */
export const requireModifyPermission = (resourceType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Define permissions for different resource types
    const permissions = {
      'user': ['admin'], // Only admins can modify users
      'task': ['manager', 'admin'], // Managers and admins can modify tasks
      'calendar': ['manager', 'admin'], // Managers and admins can modify calendar events
      'compliance': ['admin'], // Only admins can modify compliance reports
      'copilot': ['nurse', 'manager', 'admin'], // All authenticated users can use copilot
      'email': ['manager', 'admin'] // Managers and admins can send emails
    };

    const allowedRoles = permissions[resourceType as keyof typeof permissions] || [];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Access denied. Required roles for ${resourceType}: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Middleware to add user context to request (for logging/auditing)
 */
export const addUserContext = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    // Add user info to response headers for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-User-ID', req.user.userId.toString());
      res.setHeader('X-User-Role', req.user.role);
    }
  }
  
  next();
};
