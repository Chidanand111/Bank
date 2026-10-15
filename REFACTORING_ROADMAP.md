# BankMock Architecture & Refactoring Roadmap

> **Current Status**: Phase 0 & Phase 1 **COMPLETED & PUSHED** to `origin/main` (`c586684`)  
> **Database Environment**: Neon Serverless PostgreSQL with pooler (`schema=bankmock` isolated)  
> **Test Status**: 12/12 Vitest unit tests passing | 12/12 end-to-end auth integration tests passing | 0 ESLint errors | Production build passing

---

## 📌 Quick Resume Instructions (After PC Reboot)

When you turn your PC back on and reopen your workspace:

```powershell
# 1. Navigate to the project directory
cd c:\Users\chida\Desktop\bank

# 2. Check current git status (should be clean on branch main)
git status

# 3. Verify PostgreSQL connectivity to Neon
npm run test:db

# 4. Run test suites to verify system health
npm test

# 5. Tell the AI assistant: "Continue to Phase 2"
```

---

## 🗺️ Phase-by-Phase Roadmap

### ✅ Phase 0: Safety Net & Baseline Quality (DONE)
- **Status**: Completed in commit [`fc4bfb7`](https://github.com/Chidanand111/Bank/commit/fc4bfb7)
- **Delivered**:
  - Configured `vitest` with Next.js path alias resolution (`@/*`).
  - Unit test suites for test scoring calculation (`tests/scoring.test.ts`), crypto sessions (`tests/crypto.test.ts`), and formatters (`tests/formatters.test.ts`).
  - Resolved baseline ESLint errors and warnings across admin components.

---

### ✅ Phase 1: Authentication & Security Realignment (DONE)
- **Status**: Completed in commit [`c586684`](https://github.com/Chidanand111/Bank/commit/c586684)
- **Delivered**:
  - **Bcrypt Password Security**: Installed `bcryptjs`, created `lib/auth/password.ts` with salt rounds = 10, unit tested in `tests/password.test.ts`.
  - **Environment Secret Enforcement**: Created `lib/config/env.ts` with strict length validation for `SESSION_SECRET` in production.
  - **Neon DB Schema Isolation**: Guarded the Neon database by isolating BankMock in `schema=bankmock` (preventing conflicts with `EXAM Tracker`).
  - **User Persistence Migration**: Realigned `lib/auth/session.ts` and `lib/auth/actions.ts` to query and mutate `prisma.user` directly.
  - **Approval Workflow**: Integrated `UserStatus` (`PENDING`, `APPROVED`, `REJECTED`) with automated gating and verified via `scripts/verify-strict-roles-and-approvals.ts`.

---

### ⏳ Phase 2: Data Store Unification & Filesystem Elimination (NEXT)
**Goal**: Make the application 100% serverless-ready by removing all filesystem writes (`fs.writeFileSync`) in production, directing all reads/writes to PostgreSQL, and maintaining fast cache layers.

1. **Audit Filesystem Writes**:
   - Inspect `lib/data/exams.ts` (`saveCustomExamsToFile`).
   - Inspect `lib/data/mockTests.ts` (`saveCustomMockTestsToFile`).
   - Inspect `lib/db/questionDb.ts` (`addQuestionToJsonDb`, `updateQuestionInJsonDb`, `deleteQuestionFromJsonDb`).
2. **PostgreSQL Schema Expansion & Prisma Relations**:
   - Verify `Exam`, `Section`, `Topic`, `Question`, `Option`, `MockTest`, `MockTestQuestion` tables in `bankmock`.
   - Ensure all relations, cascades, and constraints match existing JSON shape.
3. **Database Repository Layer**:
   - Replace JSON file write operations with transactional Prisma queries (`prisma.question.create`, `prisma.exam.upsert`, etc.).
   - Implement read-through caching using Next.js `unstable_cache` with tag-based invalidation (`revalidateTag`).
4. **Automated Verification**:
   - Create test suite validating question creation, editing, deletion, and bulk upload without writing to the disk.

---

### ⏳ Phase 3: Service Layer Modularization
**Goal**: Deconstruct the monolithic 2,089-line `lib/services/adminService.ts` into single-responsibility, cohesive domain services.

1. **Domain Extraction**:
   - `lib/services/questionService.ts`: CRUD, bulk CSV/JSON import, AI generation parsing, validation.
   - `lib/services/examService.ts`: Exam categories, section configuration, time limits.
   - `lib/services/mockTestService.ts`: Mock test generation, question partitioning, difficulty balance.
   - `lib/services/attemptService.ts`: Candidate attempt tracking, answer submission, score evaluation.
   - `lib/services/userService.ts`: User approvals, role management, audit logs.
2. **Re-export Facade**:
   - Keep `lib/services/adminService.ts` as a thin backward-compatible re-export layer so existing UI components do not break during transition.
3. **Zod Schema Validation**:
   - Add strong input validation schemas for all Server Actions and admin mutations.

---

### ⏳ Phase 4: Exam Engine Robustness & Player Invariants
**Goal**: Ensure bulletproof exam simulation integrity for high-stakes banking exam aspirants.

1. **Invariants Enforcement**:
   - Total duration: Strictly 60 minutes.
   - Section Locks: 3 × 20-minute non-transferable section timers (English, Quant, Reasoning).
   - Scoring Invariant: Exactly +1.0 for correct answers, -0.25 for incorrect answers, 0 for unattempted.
2. **Attempt State Synchronization**:
   - Periodic auto-save of candidate answers to PostgreSQL or session store to prevent data loss on browser refresh.
   - Server-side validation of time limits on submission to prevent client-side timer manipulation.
3. **KaTeX Math & Symbol Rendering**:
   - Ensure math equations, currency symbols, and fractions render crisply without SSR layout shifts.

---

### ⏳ Phase 5: Production Optimization, Caching & UI Polish
**Goal**: Fast load times, responsive UI, and premium presentation.

1. **Large Dataset Rendering**:
   - Virtualized pagination or streaming for the 900+ question bank in admin tables.
2. **Next.js Route Segment Caching**:
   - Fine-tune static and dynamic page rendering strategies (`generateStaticParams`, ISR).
3. **SEO & Accessibility**:
   - Standardize heading hierarchies (`h1`), descriptive meta tags, and keyboard navigation.

---

## ⚠️ Critical Multi-Project Rules (Do Not Forget!)
- **Always ensure `DATABASE_URL` ends with `&schema=bankmock`**
- **NEVER run `npx prisma db push --accept-data-loss`** without verifying the target schema.
- Tables in the `public` schema belong to `EXAM Tracker` and must never be altered or dropped.
