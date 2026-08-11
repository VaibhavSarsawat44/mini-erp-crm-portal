import 'dotenv/config';
import { PrismaClient, Role, CustomerType, CustomerStatus, StockMovementType, ChallanStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing records (if any)
  await prisma.challanItem.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.challan.deleteMany({});
  await prisma.customerNote.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users
  const passwordHash = await bcrypt.hash('Password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@company.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Sales User',
      email: 'sales@company.com',
      passwordHash,
      role: Role.SALES,
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      name: 'Warehouse User',
      email: 'warehouse@company.com',
      passwordHash,
      role: Role.WAREHOUSE,
    },
  });

  const accountsUser = await prisma.user.create({
    data: {
      name: 'Accounts User',
      email: 'accounts@company.com',
      passwordHash,
      role: Role.ACCOUNTS,
    },
  });

  console.log('Users seeded successfully');

  // 3. Create Customers
  const customerAcme = await prisma.customer.create({
    data: {
      name: 'Acme Corp',
      mobile: '9876543210',
      email: 'acme@corp.com',
      businessName: 'Acme Distributors',
      gstNumber: '27AAAAA1111A1Z1',
      type: CustomerType.DISTRIBUTOR,
      address: '123 Business Rd, Mumbai, MH - 400001',
      status: CustomerStatus.ACTIVE,
    },
  });

  const customerGlobex = await prisma.customer.create({
    data: {
      name: 'Globex Corp',
      mobile: '9876543211',
      email: 'globex@corp.com',
      businessName: 'Globex Wholesale',
      gstNumber: '27BBBBB2222B1Z2',
      type: CustomerType.WHOLESALE,
      address: '456 Industrial Ave, Bangalore, KA - 560001',
      status: CustomerStatus.ACTIVE,
    },
  });

  const customerJohn = await prisma.customer.create({
    data: {
      name: 'John Doe',
      mobile: '9876543212',
      email: 'john.doe@gmail.com',
      businessName: 'John Retailer',
      type: CustomerType.RETAIL,
      address: '789 Residential St, Pune, MH - 411001',
      status: CustomerStatus.ACTIVE,
    },
  });

  const customerWayne = await prisma.customer.create({
    data: {
      name: 'Wayne Enterprises',
      mobile: '9876543213',
      email: 'wayne@ent.com',
      businessName: 'Wayne Logistics',
      gstNumber: '27CCCCC3333C1Z3',
      type: CustomerType.DISTRIBUTOR,
      address: '100 Gotham Way, Gotham City, MH - 400018',
      status: CustomerStatus.LEAD,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  const customerStark = await prisma.customer.create({
    data: {
      name: 'Stark Industries',
      mobile: '9876543214',
      email: 'stark@ind.com',
      businessName: 'Stark Supplies',
      gstNumber: '27DDDDD4444D1Z4',
      type: CustomerType.WHOLESALE,
      address: '200 Malibu Point, Los Angeles, CA - 90265',
      status: CustomerStatus.INACTIVE,
    },
  });

  // Seed customer notes
  await prisma.customerNote.create({
    data: {
      customerId: customerWayne.id,
      note: 'Follow up about distributing new packaging materials in the Batman project.',
      createdById: salesUser.id,
    },
  });

  await prisma.customerNote.create({
    data: {
      customerId: customerAcme.id,
      note: 'Onboarded Acme Corp. They requested wholesale terms.',
      createdById: adminUser.id,
    },
  });

  console.log('Customers and notes seeded successfully');

  // 4. Create Products
  const prodCardboardBox = await prisma.product.create({
    data: {
      name: 'Cardboard Box',
      sku: 'PKG-BOX-001',
      category: 'Packaging',
      unitPrice: 15.0,
      currentStock: 480, // Deduced from 500 because of Challan CH-0002
      minStockAlert: 100,
      location: 'Aisle A1',
    },
  });

  const prodBubbleWrap = await prisma.product.create({
    data: {
      name: 'Bubble Wrap',
      sku: 'PKG-BBL-002',
      category: 'Packaging',
      unitPrice: 25.0,
      currentStock: 40, // Low stock: < 50
      minStockAlert: 50,
      location: 'Aisle A2',
    },
  });

  const prodPackingTape = await prisma.product.create({
    data: {
      name: 'Packing Tape',
      sku: 'PKG-TPE-003',
      category: 'Packaging',
      unitPrice: 8.0,
      currentStock: 150,
      minStockAlert: 50,
      location: 'Aisle A3',
    },
  });

  const prodCopperWire = await prisma.product.create({
    data: {
      name: 'Copper Wire 10m',
      sku: 'RAW-COP-001',
      category: 'Raw Materials',
      unitPrice: 120.0,
      currentStock: 15, // Low stock: < 30
      minStockAlert: 30,
      location: 'Aisle B1',
    },
  });

  const prodSteelRod = await prisma.product.create({
    data: {
      name: 'Steel Rod 1m',
      sku: 'RAW-STL-002',
      category: 'Raw Materials',
      unitPrice: 200.0,
      currentStock: 78, // Deduced from 80 because of Challan CH-0002
      minStockAlert: 25,
      location: 'Aisle B2',
    },
  });

  const prodElectricMotor = await prisma.product.create({
    data: {
      name: 'Electric Motor 1HP',
      sku: 'ELE-MOT-001',
      category: 'Electronics',
      unitPrice: 1500.0,
      currentStock: 8, // Low stock: < 10
      minStockAlert: 10,
      location: 'Aisle C1',
    },
  });

  const prodMicrocontroller = await prisma.product.create({
    data: {
      name: 'Microcontroller Board',
      sku: 'ELE-MCU-002',
      category: 'Electronics',
      unitPrice: 450.0,
      currentStock: 100,
      minStockAlert: 20,
      location: 'Aisle C2',
    },
  });

  const prodWireStripper = await prisma.product.create({
    data: {
      name: 'Wire Stripper',
      sku: 'TOL-STR-001',
      category: 'Tools',
      unitPrice: 350.0,
      currentStock: 25,
      minStockAlert: 10,
      location: 'Aisle D1',
    },
  });

  console.log('Products seeded successfully');

  // 5. Seed stock movements for initial stock
  const allProducts = [
    { prod: prodCardboardBox, initial: 500 },
    { prod: prodBubbleWrap, initial: 40 },
    { prod: prodPackingTape, initial: 150 },
    { prod: prodCopperWire, initial: 15 },
    { prod: prodSteelRod, initial: 80 },
    { prod: prodElectricMotor, initial: 8 },
    { prod: prodMicrocontroller, initial: 100 },
    { prod: prodWireStripper, initial: 25 }
  ];

  for (const { prod, initial } of allProducts) {
    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        quantity: initial,
        type: StockMovementType.IN,
        reason: 'Initial Stock Import',
        createdById: warehouseUser.id,
      }
    });
  }

  console.log('Initial stock movement records created');

  // 6. Create Challans
  // Challan 1: DRAFT (Bubble Wrap qty 10, Packing Tape qty 5)
  await prisma.challan.create({
    data: {
      challanNumber: 'CH-0001',
      customerId: customerAcme.id,
      status: ChallanStatus.DRAFT,
      totalQuantity: 15,
      createdById: salesUser.id,
      items: {
        create: [
          {
            productId: prodBubbleWrap.id,
            productNameSnapshot: prodBubbleWrap.name,
            skuSnapshot: prodBubbleWrap.sku,
            priceSnapshot: prodBubbleWrap.unitPrice,
            quantity: 10,
          },
          {
            productId: prodPackingTape.id,
            productNameSnapshot: prodPackingTape.name,
            skuSnapshot: prodPackingTape.sku,
            priceSnapshot: prodPackingTape.unitPrice,
            quantity: 5,
          }
        ]
      }
    }
  });

  // Challan 2: CONFIRMED (Cardboard Box qty 20, Steel Rod qty 2)
  const challanConfirmed = await prisma.challan.create({
    data: {
      challanNumber: 'CH-0002',
      customerId: customerGlobex.id,
      status: ChallanStatus.CONFIRMED,
      totalQuantity: 22,
      createdById: adminUser.id,
      items: {
        create: [
          {
            productId: prodCardboardBox.id,
            productNameSnapshot: prodCardboardBox.name,
            skuSnapshot: prodCardboardBox.sku,
            priceSnapshot: prodCardboardBox.unitPrice,
            quantity: 20,
          },
          {
            productId: prodSteelRod.id,
            productNameSnapshot: prodSteelRod.name,
            skuSnapshot: prodSteelRod.sku,
            priceSnapshot: prodSteelRod.unitPrice,
            quantity: 2,
          }
        ]
      }
    }
  });

  // Deduct stock movement for confirmed challan
  await prisma.stockMovement.create({
    data: {
      productId: prodCardboardBox.id,
      quantity: 20,
      type: StockMovementType.OUT,
      reason: 'Challan CH-0002',
      createdById: adminUser.id,
    }
  });

  await prisma.stockMovement.create({
    data: {
      productId: prodSteelRod.id,
      quantity: 2,
      type: StockMovementType.OUT,
      reason: 'Challan CH-0002',
      createdById: adminUser.id,
    }
  });

  console.log('Challans seeded successfully');
  console.log('Database seeding finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
