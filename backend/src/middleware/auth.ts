import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AppError } from './error';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-erp-portal-development';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided, authorization denied', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return next(new AppError('Token is not valid', 401));
  }
};

export const restrictTo = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Access denied: insufficient permissions', 403));
    }

    next();
  };
};
