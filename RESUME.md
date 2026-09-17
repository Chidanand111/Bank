# Resume Bullet Points & Project Description Guide
## Project: BankMock — Full-Stack Banking CBT Examination Platform

Use the tailored sections below directly in your resume, portfolio, and LinkedIn profile.

---

## 📌 1. Standard Resume Project Entry (Recommended for Full-Stack Roles)

**BankMock — Full-Stack Banking CBT Examination Platform** | *Next.js 16, React 19, TypeScript, PostgreSQL (Neon), Prisma ORM, Tailwind CSS*  
*Live Demo:* [https://bank-mock.vercel.app](https://bank-mock.vercel.app) | *GitHub:* [https://github.com/Chidanand111/Bank](https://github.com/Chidanand111/Bank)  
- **CBT Simulation Engine:** Architected an enterprise-grade Computer-Based Testing (CBT) platform simulating official IBPS PO and SBI Clerk examinations with sectional timers, 5-state question palettes, dynamic negative-marking algorithms (-0.25 penalty), and client-side session crash recovery.
- **Strict Role-Based Access Control (RBAC):** Built a multi-tenant security architecture with zero-leakage access control; candidate login is strictly separated from an isolated, direct-access `/admin` gateway protected by Next.js 16 proxy middleware across 7+ authenticated route families.
- **Candidate Verification & Approval Pipeline:** Engineered an asynchronous registration workflow where new candidate accounts are held in pending verification until reviewed; built a real-time admin management center with one-click authorization and instant privilege provisioning.
- **Database & Administrative CMS:** Designed a relational PostgreSQL schema on Neon Serverless using Prisma ORM to power dynamic exam partitioning, official Previous Year Question (PYQ) categorization, and inline title editing via Next.js Server Actions.
- **Production Deployment & Performance:** Deployed on Vercel with automated CI/CD pipelines, optimizing 23+ server-rendered and dynamic routes via Turbopack to achieve sub-second page transitions and 100% type safety.

---

## 📌 2. Tailored for Frontend / React / Next.js Developer

**BankMock — Banking Exam CBT Interface & Web Application** | *Next.js 16, React 19, TypeScript, Tailwind CSS, Turbopack*  
*Live Demo:* [https://bank-mock.vercel.app](https://bank-mock.vercel.app) | *Source:* [https://github.com/Chidanand111/Bank](https://github.com/Chidanand111/Bank)  
- Developed a high-performance, responsive Computer-Based Testing interface in React 19 and Next.js 16 (App Router), supporting full-screen exam simulation, keyboard navigation, and sectional tab transitions.
- Implemented state persistence with automatic progress synchronization in `localStorage`, preventing data loss during network hiccups or unexpected browser reloads.
- Built interactive candidate scorecards, performance analytics charts, and question review breakdowns with color-coded solution explanations and bookmarking capabilities.
- Styled custom, accessible UI components with Tailwind CSS v4 and Vanilla CSS, maintaining consistent design tokens across a high-security dark admin console and light student portal.

---

## 📌 3. Tailored for Backend / Systems / Software Engineer

**BankMock — Examination Assessment Engine & API Infrastructure** | *Next.js Server Actions, PostgreSQL, Prisma ORM, Web Cryptography*  
*Repository:* [https://github.com/Chidanand111/Bank](https://github.com/Chidanand111/Bank) | *Live:* [https://bank-mock.vercel.app](https://bank-mock.vercel.app)  
- Implemented a server-side authentication engine using the Web Crypto API with HMAC-SHA256 signatures, HttpOnly session cookies, and database canonical verification to eliminate client-side role tampering.
- Created Next.js 16 `proxy.ts` middleware route guards enforcing strict route boundaries between candidates and administrators, redirecting unauthenticated or unauthorized traffic dynamically.
- Designed and migrated a scalable relational database schema on Neon Serverless PostgreSQL with Prisma ORM, supporting multi-level exam hierarchies (Exams, Sections, Topics, Questions, Mock Tests, Attempts).
- Wrote end-to-end integration test suites (`tsx`) validating registration queues, role transitions, authorization boundaries, and self-demotion guards with 100% pass rates.

---

## 📌 4. LaTeX / Overleaf Ready Code (Jake's Resume / Standard Template)

```latex
\resumeProjectHeading
    {\textbf{BankMock -- Full-Stack Banking CBT Examination Platform} $|$ \emph{Next.js 16, React 19, TypeScript, PostgreSQL, Prisma, Tailwind CSS}}{2026}
    \resumeItemListStart
        \resumeItem{Engineered a full-scale Computer-Based Testing (CBT) platform simulating IBPS PO and SBI Clerk patterns with live sectional timers, 5-state question palettes, negative marking (-0.25), and automatic state recovery.}
        \resumeItem{Architected strict Role-Based Access Control (RBAC) with an isolated `/admin` portal, HMAC-SHA256 cryptographic session signing, and Next.js proxy middleware protecting 7+ authenticated route trees.}
        \resumeItem{Developed an asynchronous candidate registration queue requiring admin approval before test access, featuring a real-time admin management center with one-click authorization.}
        \resumeItem{Designed a normalized PostgreSQL database on Neon Serverless with Prisma ORM to manage exam partitions, official PYQs, and dynamic mock tests, deploying with automated CI/CD on Vercel.}
    \resumeItemListEnd
```

---

## 📌 5. One-Liner / LinkedIn / Portfolio Summary

> **BankMock:** A production-ready, full-stack Banking CBT Mock Examination Platform built with Next.js 16 (App Router), React 19, TypeScript, and Neon PostgreSQL. Features official exam simulations with live sectional timers, strict RBAC security with isolated admin gateways, candidate registration approval workflows, and automated Vercel deployment.

---

## 📌 6. Technical Skills Keywords for ATS (Applicant Tracking Systems)

- **Languages:** TypeScript, JavaScript (ES6+), SQL, HTML5, CSS3
- **Frameworks & Libraries:** Next.js 16 (App Router, Turbopack, Server Actions), React 19, Tailwind CSS v4, Lucide React
- **Databases & ORM:** PostgreSQL, Neon Serverless, Prisma ORM
- **Security & Auth:** Role-Based Access Control (RBAC), HMAC-SHA256 Cryptography, HttpOnly Cookie Sessions, Next.js Proxy Middleware
- **DevOps & Tools:** Vercel Hosting, Git, GitHub Actions, npm, Turbopack
