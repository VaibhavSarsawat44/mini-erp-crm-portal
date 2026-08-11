# Vortex Mini ERP + CRM Operations Portal

A full-stack monorepo web portal designed for wholesale/distribution companies to manage customer profiles, catalog inventory, track stock movements, and authorize sales challans with automated transaction safety checks.

---

## Architecture Overview

The system is structured as a monorepo containing two separate, independent directories: `/backend` and `/frontend`. 

The **Backend** is built on Node.js, Express, and TypeScript. It utilizes Prisma ORM to interact with a PostgreSQL database, executing Zod validations on all inputs. Database integrity is enforced at the transaction level—critical operations like confirming a challan (deducting stock) and cancelling a confirmed challan (reverting stock) run inside SQL transactions. The **Frontend** is a React single-page application built on Vite, TypeScript, and Tailwind CSS v4. It features a responsive dashboard UI, custom timeline logs, dynamic order selectors, and role-based interface masking.

---

## Local Setup & Running Instructions

### 1. Database Configuration
Ensure you have a PostgreSQL database instance running.
By default, the application is pre-configured to connect to the local Docker Postgres container running on `localhost:5432`:
- **DB Name:** `erp_db`
- **Username:** `postgres`
- **Password:** `postgres_password`

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in the values (the defaults are pre-configured for the docker container):
   ```bash
   cp .env.example .env
   ```
4. Generate Prisma client & Run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
5. Seed the database (inserts test users, products, and mock challans):
   ```bash
   npx prisma db seed
   ```
6. Start the backend server:
   ```bash
   npm run dev
   ```
   The backend will start running on port `5001`.

### 3. Frontend Setup
1. In a new terminal window, navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will start running on `http://localhost:5173`. The Vite server is configured to proxy all `/api/*` requests automatically to the backend on port `5001`.

---

## Test Login Credentials

All users share the password: `Password123`

| Role | Email Address | Access Level |
| :--- | :--- | :--- |
| **ADMIN** | `admin@company.com` | Complete operations permissions (CRUD everything, verify stock, adjustments) |
| **SALES** | `sales@company.com` | Customer CRUD, client note logging, draft challan creation and editing |
| **WAREHOUSE** | `warehouse@company.com` | Stock level monitoring, manual stock adjustments, draft challan confirmation |
| **ACCOUNTS** | `accounts@company.com` | Read-only details view of customers, products, and confirmed challans |

---

## Deployment Guidelines

### AWS Deployment (Preferred Setup)
This full-stack application can be deployed to Amazon Web Services (AWS) using standard serverless and containerized services:

#### 1. Database: AWS RDS PostgreSQL
1. Open the **Amazon RDS** service in the AWS Console.
2. Launch a new PostgreSQL DB instance (use a Free Tier template for staging/tests).
3. Set the DB identifier, credentials (user: `postgres`, password), and configure VPC settings to allow external access.
4. Once active, copy the DB endpoint URL and configure your database URL string:
   `postgresql://postgres:<password>@<rds-endpoint>:5432/erp_db?schema=public`

#### 2. Backend API: AWS App Runner (Or Elastic Beanstalk)
AWS App Runner is the recommended way to deploy containerized APIs directly from your repository:
1. Open **AWS App Runner** and click **Create Service**.
2. Select **Source code repository**, connect your GitHub account, and choose this repository/branch.
3. Configure build parameters:
   - **Runtime:** `Node.js 18` (or use backend Dockerfile)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Port:** `5001`
4. Add the following **Environment Variables** in the App Runner configuration panel:
   - `DATABASE_URL` (points to your AWS RDS connection string)
   - `JWT_SECRET` (your JWT encryption signature token)
   - `PORT=5001`
   - `NODE_ENV=production`

#### 3. Frontend Hosting: AWS Amplify
1. Open **AWS Amplify** in the AWS console.
2. Under "Deploy", select **GitHub** and authorize your repository.
3. Choose the repository and branch. Amplify will auto-detect Vite build commands.
4. Set build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
5. Click **Save and Deploy**. AWS Amplify will generate a secure public domain link (e.g. `https://main.xxxx.amplifyapp.com`).

---

### Alternative Deployments (Render / Vercel)

#### Database (Neon/Supabase)
1. Provision a PostgreSQL cluster on Supabase or Neon.
2. Retrieve the pooled connection URL string.

#### Backend (Render)
1. Create a new **Web Service** on Render linked to your repository.
2. Set the **Root Directory** to `backend`.
3. Configure Build Command: `npm install && npm run build`
4. Configure Start Command: `npm start`
5. Set env variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `PORT=10000`.

#### Frontend (Vercel)
1. Create a new Project on Vercel linked to your repository.
2. Set the **Root Directory** to `frontend`.
3. Set the **Framework Preset** to `Vite`.
4. Configure Build Command: `npm run build` & Output Directory: `dist`.
5. Redirect backend calls to the production API url.

---

## Environment Variables

### Backend (`/backend/.env`)
- `DATABASE_URL`: PostgreSQL connection string (pooled link).
- `PORT`: Port on which the express server runs (default: `5001`).
- `JWT_SECRET`: Secret hash token for JWT validation.
- `NODE_ENV`: Runs environment modes (`development` / `production`).

### Frontend (`/frontend/.env`)
- `VITE_API_URL`: Direct backend API domain endpoint (fallback, default: `http://localhost:5001`).

---

## Assumptions Made
1. **Accounts Permission Scopes:** Accounts roles are assumed to have read-only access. They cannot create customers, modify product catalog values, add follow-up notes, confirm draft challans, or cancel confirmed items.
2. **Sales Confirm Scope:** Sales roles are allowed to create draft challans. They are also allowed to authorize confirmations and deduct stock if the inventory is present, but cannot perform manual stock count overrides (restricted to Warehouse & Admin).
3. **Sequential Challan numbering:** Sequence number suffix is read and calculated inside database transaction locks to guarantee uniqueness.

---

## Limitations / Future Scope
1. **Real-time socket alerts:** Low stock notifications currently trigger on screen refresh or action mounts rather than push web-socket events.
2. **PDF Exports:** The printable layout is pre-configured with CSS media query print sheets but does not generate native binary PDFs on-disk (Stretch goal).
3. **Docker Compose:** Docker Postgres container is pre-configured but the compose pipeline for the backend isn't scaffolded yet (Stretch goal).
