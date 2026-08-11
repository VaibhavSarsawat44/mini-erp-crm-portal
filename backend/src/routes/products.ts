import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { AppError } from '../middleware/error';
import { authenticateJWT, restrictTo } from '../middleware/auth';
import { Role, StockMovementType } from '@prisma/client';

const router = Router();

const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  unitPrice: z.number().positive('Unit price must be a positive number'),
  currentStock: z.number().int().nonnegative('Current stock must be a non-negative integer'),
  minStockAlert: z.number().int().nonnegative('Min stock alert must be a non-negative integer'),
  location: z.string().min(1, 'Location is required'),
});

const productUpdateSchema = productCreateSchema.partial();

const stockAdjustmentSchema = z.object({
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  type: z.nativeEnum(StockMovementType, { message: 'Invalid movement type (IN/OUT)' }),
  reason: z.string().min(1, 'Reason for stock movement is required'),
});

// Protect all product routes with JWT auth
router.use(authenticateJWT);

// GET /products - list with search, category filter, pagination
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = req.query.q as string || '';
    const category = req.query.category as string || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /products - create (restricted to ADMIN, SALES, WAREHOUSE)
router.post('/', restrictTo(Role.ADMIN, Role.SALES, Role.WAREHOUSE), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = productCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return next(new AppError(errorMsg, 400));
    }

    const { sku } = parseResult.data;

    const skuExists = await prisma.product.findUnique({ where: { sku } });
    if (skuExists) {
      return next(new AppError(`Product with SKU '${sku}' already exists`, 400));
    }

    const newProduct = await prisma.product.create({
      data: parseResult.data,
    });

    // Create an initial stock movement IN if initial stock is > 0
    if (newProduct.currentStock > 0 && req.user?.userId) {
      await prisma.stockMovement.create({
        data: {
          productId: newProduct.id,
          quantity: newProduct.currentStock,
          type: StockMovementType.IN,
          reason: 'Initial Product Registry',
          createdById: req.user.userId,
        },
      });
    }

    res.status(201).json({
      status: 'success',
      data: { product: newProduct },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /products/:id - update (restricted to ADMIN, WAREHOUSE, SALES)
router.put('/:id', restrictTo(Role.ADMIN, Role.SALES, Role.WAREHOUSE), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const parseResult = productUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return next(new AppError(errorMsg, 400));
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    const updateData = parseResult.data;

    // Check SKU unique check
    if (updateData.sku && updateData.sku !== product.sku) {
      const skuExists = await prisma.product.findUnique({ where: { sku: updateData.sku } });
      if (skuExists) {
        return next(new AppError(`Product with SKU '${updateData.sku}' already exists`, 400));
      }
    }

    // Do NOT let direct PUT endpoint edit stock to keep stock movements consistent. Stock edits should be logged via movements.
    if (updateData.currentStock !== undefined) {
      delete updateData.currentStock;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      status: 'success',
      data: { product: updatedProduct },
    });
  } catch (error) {
    next(error);
  }
});

// GET /products/:id/stock-movements - history logs
router.get('/:id/stock-movements', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    const movements = await prisma.stockMovement.findMany({
      where: { productId: id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: { movements },
    });
  } catch (error) {
    next(error);
  }
});

// POST /products/:id/stock-movements - manual adjustment (Restricted to ADMIN, WAREHOUSE)
router.post('/:id/stock-movements', restrictTo(Role.ADMIN, Role.WAREHOUSE), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError('Unauthorized', 401));
    }

    const parseResult = stockAdjustmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return next(new AppError(errorMsg, 400));
    }

    const { quantity, type, reason } = parseResult.data;

    // Run inside database transaction to guarantee atomicity and stock safety
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      let newStock = product.currentStock;
      if (type === StockMovementType.IN) {
        newStock += quantity;
      } else {
        newStock -= quantity;
        if (newStock < 0) {
          throw new AppError(`Insufficient stock. Current stock is ${product.currentStock}, cannot deduct ${quantity}`, 400);
        }
      }

      // 1. Log StockMovement
      const movement = await tx.stockMovement.create({
        data: {
          productId: id,
          quantity,
          type,
          reason,
          createdById: userId,
        },
      });

      // 2. Update Product Stock
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          currentStock: newStock,
        },
      });

      return { movement, updatedProduct };
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
