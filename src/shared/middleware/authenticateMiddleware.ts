import type { RequestHandler } from 'express';
import { authenticate } from './auth';

export const authenticateMiddleware: RequestHandler = (req, res, next) => {
  void authenticate(req, res, next);
};
