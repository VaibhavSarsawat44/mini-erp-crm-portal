# Vortex ERP Portal

A full-stack, modern Mini ERP and CRM portal designed to manage customers, inventory, and dispatch challans with Role-Based Access Control (RBAC).

## 🚀 Live Demo

- **Frontend (Vercel):** [https://mini-erp-crm-portal-6ottq05ts-death-match.vercel.app](https://mini-erp-crm-portal-6ottq05ts-death-match.vercel.app)
- **Backend API (Render):** [https://mini-erp-crm-portal-ff09.onrender.com](https://mini-erp-crm-portal-ff09.onrender.com)

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Dark Mode, Glassmorphism, Modern UI)
- **State Management:** React Context API
- **Routing:** React Router v6
- **Forms & Validation:** React Hook Form + Zod
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Database:** PostgreSQL (Hosted on Neon Serverless)
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** Zod

---

## ✨ Features

- **Role-Based Access Control (RBAC):** Distinct roles for `ADMIN`, `SALES`, `WAREHOUSE`, and `ACCOUNTS`.
- **Modern Dashboard:** Real-time statistics, revenue charts, and quick-access metrics.
- **Customer Management:** Track retail, wholesale, and distributor clients, log notes, and manage follow-ups.
- **Inventory Management:** Track products, SKU, stock levels, minimum stock alerts, and log stock movements (IN/OUT).
- **Dispatch / Challans:** Create delivery challans for customers, link products, and track dispatch status.
- **Premium UI/UX:** High-contrast dark mode aesthetics with responsive design and sleek micro-animations.

---

## 💻 Local Development Setup

To run this project locally on your machine, follow these steps:

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A PostgreSQL database (or use the provided Neon connection string)

### 2. Clone the Repository
```bash
git clone https://github.com/VaibhavSarsawat44/mini-erp-crm-portal.git
cd mini-erp-crm-portal
```

### 3. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend/` directory:
```env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://<user>:<password>@<host>/<dbname>?sslmode=require"
JWT_SECRET="your_super_secret_jwt_key_here"
```
Run database migrations and seed the database with initial data:
```bash
npx prisma db push
npx prisma db seed
```
Start the backend development server:
```bash
npm run dev
```

### 4. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
```
Start the frontend development server:
```bash
npm run dev
```

The application will now be running at `http://localhost:5173`.

---

## 🚢 Deployment Architecture

- **Frontend:** Deployed automatically via **Vercel**. Requests to `/api/*` are proxied to the backend via `vercel.json` rewrites to prevent CORS issues.
- **Backend:** Deployed as a Web Service on **Render**. Uses the build command `npm install --production=false && npx prisma generate && npm run build` to ensure all TypeScript dependencies are resolved during compilation.
- **Database:** Hosted on **Neon Serverless PostgreSQL**. The database sleeps on inactivity (free tier) but wakes up seamlessly upon connection requests.
