import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { AppError } from '../middleware/error';
import { authenticateJWT, restrictTo } from '../middleware/auth';
import { Role, ChallanStatus, StockMovementType } from '@prisma/client';

const router = Router();

const challanCreateSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().positive('Quantity must be a positive integer'),
    })
  ).min(1, 'Challan must contain at least one product item'),
});

// Protect all challan routes with JWT auth
router.use(authenticateJWT);

// GET /challans - list, filter by status, pagination
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = req.query.status as ChallanStatus;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && Object.values(ChallanStatus).includes(status)) {
      where.status = status;
    }

    const [challans, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, name: true, businessName: true },
          },
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.challan.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        challans,
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

// GET /challans/:id - detail with line items
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: true,
      },
    });

    if (!challan) {
      return next(new AppError('Challan not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { challan },
    });
  } catch (error) {
    next(error);
  }
});

// POST /challans - create draft
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError('Unauthorized', 401));
    }

    const parseResult = challanCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return next(new AppError(errorMsg, 400));
    }

    const { customerId, items } = parseResult.data;

    // Check customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return next(new AppError('Customer not found', 400));
    }

    // Run creation in transaction to generate unique serial challanNumber securely
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate unique challanNumber
      const latestChallan = await tx.challan.findFirst({
        orderBy: { challanNumber: 'desc' },
      });

      let nextNum = 1;
      if (latestChallan) {
        const match = latestChallan.challanNumber.match(/CH-(\d+)/);
        if (match && match[1]) {
          nextNum = parseInt(match[1]) + 1;
        }
      }
      const challanNumber = `CH-${String(nextNum).padStart(4, '0')}`;

      // 2. Fetch products details for snapshots and total calculation
      let totalQty = 0;
      const challanItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new AppError(`Product with ID '${item.productId}' not found`, 400);
        }

        totalQty += item.quantity;
        challanItemsData.push({
          productId: item.productId,
          productNameSnapshot: product.name,
          skuSnapshot: product.sku,
          priceSnapshot: product.unitPrice,
          quantity: item.quantity,
        });
      }

      // 3. Create Challan
      const newChallan = await tx.challan.create({
        data: {
          challanNumber,
          customerId,
          status: ChallanStatus.DRAFT,
          totalQuantity: totalQty,
          createdById: userId,
          items: {
            create: challanItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return newChallan;
    });

    res.status(201).json({
      status: 'success',
      data: { challan: result },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /challans/:id - edit draft
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const parseResult = challanCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return next(new AppError(errorMsg, 400));
    }

    const { customerId, items } = parseResult.data;

    // Check challan exists and is in DRAFT status
    const challan = await prisma.challan.findUnique({
      where: { id },
    });

    if (!challan) {
      return next(new AppError('Challan not found', 404));
    }

    if (challan.status !== ChallanStatus.DRAFT) {
      return next(new AppError('Only DRAFT challans can be edited', 400));
    }

    // Check customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return next(new AppError('Customer not found', 400));
    }

    // Run edits in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete existing items
      await tx.challanItem.deleteMany({
        where: { challanId: id },
      });

      // 2. Add new items with snapshots
      let totalQty = 0;
      const challanItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new AppError(`Product with ID '${item.productId}' not found`, 400);
        }

        totalQty += item.quantity;
        challanItemsData.push({
          productId: item.productId,
          productNameSnapshot: product.name,
          skuSnapshot: product.sku,
          priceSnapshot: product.unitPrice,
          quantity: item.quantity,
        });
      }

      // 3. Update Challan totals and details
      const updatedChallan = await tx.challan.update({
        where: { id },
        data: {
          customerId,
          totalQuantity: totalQty,
          items: {
            create: challanItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return updatedChallan;
    });

    res.status(200).json({
      status: 'success',
      data: { challan: result },
    });
  } catch (error) {
    next(error);
  }
});

// POST /challans/:id/confirm - confirm and deduct stock
router.post('/:id/confirm', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError('Unauthorized', 401));
    }

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      return next(new AppError('Challan not found', 404));
    }

    if (challan.status !== ChallanStatus.DRAFT) {
      return next(new AppError(`Only DRAFT challans can be confirmed. Current status is ${challan.status}`, 400));
    }

    // Run transaction
    const result = await prisma.$transaction(async (tx) => {
      const shortStockProducts: string[] = [];

      // 1. Check stock availability for all items
      for (const item of challan.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new AppError(`Product with SKU '${item.skuSnapshot}' no longer exists in catalog`, 400);
        }

        if (product.currentStock < item.quantity) {
          shortStockProducts.push(`${product.name} (needs ${item.quantity}, has ${product.currentStock})`);
        }
      }

      // If any items are short of stock, reject confirmation with 400
      if (shortStockProducts.length > 0) {
        throw new AppError(`Insufficient stock for: ${shortStockProducts.join(', ')}`, 400);
      }

      // 2. Stock is sufficient, deduct stock and log movements
      for (const item of challan.items) {
        // Deduct Product Stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });

        // Log StockMovement OUT
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            type: StockMovementType.OUT,
            reason: `Challan ${challan.challanNumber}`,
            createdById: userId,
          },
        });
      }

      // 3. Set Challan status to CONFIRMED
      const confirmedChallan = await tx.challan.update({
        where: { id },
        data: {
          status: ChallanStatus.CONFIRMED,
        },
        include: {
          items: true,
        },
      });

      return confirmedChallan;
    });

    res.status(200).json({
      status: 'success',
      data: { challan: result },
    });
  } catch (error) {
    next(error);
  }
});

// POST /challans/:id/cancel - cancel challan
router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError('Unauthorized', 401));
    }

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      return next(new AppError('Challan not found', 404));
    }

    if (challan.status === ChallanStatus.CANCELLED) {
      return next(new AppError('Challan is already cancelled', 400));
    }

    // Run transaction
    const result = await prisma.$transaction(async (tx) => {
      // Revert stock only if challan was CONFIRMED
      if (challan.status === ChallanStatus.CONFIRMED) {
        for (const item of challan.items) {
          // Increment Product Stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                increment: item.quantity,
              },
            },
          });

          // Log compensating StockMovement IN
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              type: StockMovementType.IN,
              reason: `Cancelled Challan ${challan.challanNumber} Reversion`,
              createdById: userId,
            },
          });
        }
      }

      // Set status to CANCELLED
      const cancelledChallan = await tx.challan.update({
        where: { id },
        data: {
          status: ChallanStatus.CANCELLED,
        },
        include: {
          items: true,
        },
      });

      return cancelledChallan;
    });

    res.status(200).json({
      status: 'success',
      data: { challan: result },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
