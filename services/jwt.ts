import jwt from 'jsonwebtoken';
import { User } from '../shared/schema';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTService {
  /**
   * Generate access and refresh tokens for a user
   */
  static generateTokens(user: Omit<User, 'password' | 'createdAt'>): TokenPair {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'nuvanta-api',
      audience: 'nuvanta-client'
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'nuvanta-api',
        audience: 'nuvanta-refresh'
      }
    );

    // Calculate expiration time in seconds
    const expiresIn = this.getTokenExpirationTime(JWT_EXPIRES_IN);

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  /**
   * Verify and decode an access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'nuvanta-api',
        audience: 'nuvanta-client'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Verify and decode a refresh token
   */
  static verifyRefreshToken(token: string): { userId: number } {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'nuvanta-api',
        audience: 'nuvanta-refresh'
      }) as { userId: number };
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed');
      }
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Check if a token is about to expire (within 5 minutes)
   */
  static isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return true;
      }

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      
      // Return true if token expires within 5 minutes (300 seconds)
      return timeUntilExpiry < 300;
    } catch {
      return true;
    }
  }

  /**
   * Convert JWT expiration string to seconds
   */
  private static getTokenExpirationTime(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900; // Default to 15 minutes
    }
  }

  /**
   * Generate a new access token from a refresh token
   */
  static async refreshAccessToken(refreshToken: string, getUserById: (id: number) => Promise<User | undefined>): Promise<string> {
    const { userId } = this.verifyRefreshToken(refreshToken);
    
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const { password: _, createdAt: __, ...userWithoutSensitiveData } = user;
    const { accessToken } = this.generateTokens(userWithoutSensitiveData);
    
    return accessToken;
  }
}
