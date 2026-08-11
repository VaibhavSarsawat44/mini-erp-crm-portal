import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { AppError } from '../middleware/error';
import { authenticateJWT } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-erp-portal-development';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return next(new AppError(errorMsg, 400));
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return next(new AppError('Invalid email or password', 401));
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      status: 'success',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticateJWT, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401));
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
