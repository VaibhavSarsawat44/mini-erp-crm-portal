import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { AppError } from '../middleware/error';
import { authenticateJWT } from '../middleware/auth';
import { CustomerType, CustomerStatus } from '@prisma/client';

const router = Router();

// Zod validations
const customerCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(1, 'Mobile number is required'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().optional().nullable(),
  type: z.nativeEnum(CustomerType, { message: 'Invalid customer type' }),
  address: z.string().min(1, 'Address is required'),
  status: z.nativeEnum(CustomerStatus, { message: 'Invalid customer status' }),
  followUpDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
});

const customerUpdateSchema = customerCreateSchema.partial();

const noteCreateSchema = z.object({
  note: z.string().min(1, 'Note content cannot be empty'),
});

// Protect all customer routes with JWT auth
router.use(authenticateJWT);

// GET /customers - list, search, filter, paginate
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = req.query.q as string || '';
    const status = req.query.status as CustomerStatus;
    const type = req.query.type as CustomerType;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build Prisma query filters
    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { businessName: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (status && Object.values(CustomerStatus).includes(status)) {
      where.status = status;
    }

    if (type && Object.values(CustomerType).includes(type)) {
      where.type = type;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        customers,
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

// GET /customers/:id - detail with notes
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        notes: {
          include: {
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
});

// POST /customers - create
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = customerCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return next(new AppError(errorMsg, 400));
    }

    const customerData = parseResult.data;

    const newCustomer = await prisma.customer.create({
      data: {
        name: customerData.name,
        mobile: customerData.mobile,
        email: customerData.email,
        businessName: customerData.businessName,
        gstNumber: customerData.gstNumber || null,
        type: customerData.type,
        address: customerData.address,
        status: customerData.status,
        followUpDate: customerData.followUpDate || null,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { customer: newCustomer },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /customers/:id - update
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const parseResult = customerUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return next(new AppError(errorMsg, 400));
    }

    const customerExists = await prisma.customer.findUnique({ where: { id } });
    if (!customerExists) {
      return next(new AppError('Customer not found', 404));
    }

    const updateData = parseResult.data;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name: updateData.name,
        mobile: updateData.mobile,
        email: updateData.email,
        businessName: updateData.businessName,
        gstNumber: updateData.gstNumber !== undefined ? updateData.gstNumber : undefined,
        type: updateData.type,
        address: updateData.address,
        status: updateData.status,
        followUpDate: updateData.followUpDate !== undefined ? updateData.followUpDate : undefined,
      },
    });

    res.status(200).json({
      status: 'success',
      data: { customer: updatedCustomer },
    });
  } catch (error) {
    next(error);
  }
});

// POST /customers/:id/notes - add note
router.post('/:id/notes', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError('Unauthorized', 401));
    }

    const parseResult = noteCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return next(new AppError(errorMsg, 400));
    }

    const customerExists = await prisma.customer.findUnique({ where: { id } });
    if (!customerExists) {
      return next(new AppError('Customer not found', 404));
    }

    const newNote = await prisma.customerNote.create({
      data: {
        customerId: id,
        note: parseResult.data.note,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: { note: newNote },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
