# BankMock — Full-Stack Banking CBT Examination Platform & Admin Controller

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=flat-square&logo=postgresql)](https://neon.tech/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Deployment](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

An enterprise-grade, full-stack Computer-Based Testing (CBT) platform simulating official Indian banking recruitment examinations (**IBPS PO**, **SBI Clerk**, and **SBI PO**). Built with **Next.js 16 (App Router & Turbopack)**, **React 19**, **Neon Serverless PostgreSQL**, and **Prisma ORM**.

---

## 🌐 Live Deployment & Links

- **Live Application:** [https://bank-mock.vercel.app](https://bank-mock.vercel.app) *(or your deployed Vercel URL)*
- **GitHub Repository:** [https://github.com/Chidanand111/Bank](https://github.com/Chidanand111/Bank)

---

## ⚡ Core Features & Highlights

### 1. High-Fidelity CBT Test Player
- **Official Exam Pattern Simulation:** Realistic multi-section test player (Reasoning Ability, Quantitative Aptitude, English Language) with real-time sectional timers.
- **State Persistence & Recovery:** Automatic question state saving via `localStorage` allowing seamless exam resumption after unexpected browser refresh or disconnect.
- **Dynamic Question Palette:** Interactive question navigation tracking 5 visual states (`Not Visited`, `Not Answered`, `Answered`, `Marked for Review`, `Answered & Marked`).
- **Scoring Engine:** Automated penalty calculation for negative marking (-0.25 marks), sectional cut-off benchmarking, and category rankings.

### 2. Strict Role-Based Access Control (RBAC) & Security
- **Isolated Admin Portal:** Hidden admin access. Clicking "Login" on the website leads exclusively to candidate sign-in. Platform administration is accessible **only** through the direct URL `/admin` (redirecting unauthenticated visitors to `/admin/login`).
- **Next.js Proxy Guardrails:** Next.js 16 `proxy.ts` middleware inspecting cryptographically signed `bankmock_session` tokens, protecting 7+ authenticated route families (`/admin/*`, `/test/*`, `/dashboard/*`, `/result/*`, `/review/*`, `/profile/*`).
- **Cryptographic Session Security:** Web Crypto API using HMAC-SHA256 signatures with canonical server-side database role checks to prevent client-side cookie forgery.

### 3. Candidate Registration & Admin Approval Queue
- **Registration Verification:** New candidate registrations automatically receive `PENDING` status and cannot access test-taking capabilities until verified.
- **Admin User Management Center (`/admin/users`):** Real-time approval dashboard with pending counters, one-click **"Approve"** and **"Reject"** operations, role promotions/demotions, and self-demotion security guards.

### 4. Comprehensive Examination CMS
- **Exam Partitions & Sessions:** Categorized views separating Master Question Banks, Official Previous Year Question (PYQ) Papers, and Dedicated Mock Sessions.
- **Live Search & Filter:** Instant question and test search by keyword, exam partition, year, section code, and difficulty level.
- **Exam & Mock Title Editor:** Inline server action title edits for exams and test sessions without reloading.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16.3.4 (App Router, Server Actions, Turbopack) |
| **Frontend** | React 19, TypeScript, Lucide React |
| **Styling** | Vanilla CSS & Tailwind CSS v4 |
| **Database** | Neon PostgreSQL (Serverless Cloud DB) |
| **ORM** | Prisma ORM 6.19 |
| **Security** | Web Crypto API (HMAC-SHA256), HttpOnly Lax Cookies, Next.js Proxy Middleware |
| **Hosting & CI/CD** | Vercel Platform & GitHub Actions |

---

## 🔑 Demo Access Credentials

| Role | Portal URL | Email | Password | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Candidate (Student)** | `/login` | `student@bankmock.com` | `user123` | Full CBT mock tests, scorecard analytics, practice sessions |
| **Administrator** | `/admin` | `admin@bankmock.com` | `admin123` | Direct admin portal, approval queue, question authoring, test builder |

---

## 🚀 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/Chidanand111/Bank.git
cd Bank
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/neondb?sslmode=require"
SESSION_SECRET="your-super-secure-hmac-sha256-secret-key"
DEV_ADMIN_EMAIL="admin@bankmock.com"
DEV_ADMIN_PASSWORD="admin123"
DEV_USER_EMAIL="student@bankmock.com"
DEV_USER_PASSWORD="user123"
```

### 4. Initialize Prisma Database & Seed Data
```bash
npx prisma db push
npm run db:seed
```

### 5. Run the Turbopack Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Automated Testing & Verification

Run the comprehensive integration test suite verifying strict roles, direct admin access, and approval workflows:
```bash
npx tsx scripts/verify-strict-roles-and-approvals.ts
```

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
