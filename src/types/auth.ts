// Re-export all types from auth.types.ts for backward compatibility
export * from './auth.types';

import { Request } from 'express';
import { AuthUser } from './auth.types';

/**
 * Represents an authenticated request with a guaranteed user object.
 * This should be used in route handlers after the authenticate middleware.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
} 