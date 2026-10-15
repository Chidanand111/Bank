# BankMock Architecture & Refactoring Roadmap

> **Current Status**: Phase 0, Phase 1 & Phase 2 **COMPLETED**  
> **Database Environment**: Neon Serverless PostgreSQL with pooler (`schema=bankmock` isolated)  
> **Test Status**: 23/23 Vitest unit tests passing | End-to-end integration tests passing | 0 ESLint errors | Production build passing (Turbopack)

---

## 📌 Quick Resume Instructions (After PC Reboot)

When you turn your PC back on and reopen your workspace:

```powershell
# 1. Navigate to the project directory
cd c:\Users\chida\Desktop\bank

# 2. Check current git status
git status

# 3. Verify PostgreSQL connectivity to Neon
npm run test:db

# 4. Run test suites to verify system health
npm test

# 5. Tell the AI assistant: "Continue to Phase 3"
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

### ✅ Phase 2: Data Store Unification & Filesystem Elimination (DONE)
- **Status**: Completed
- **Delivered**:
  - **Filesystem Writes Permanently Eliminated**:
    - Replaced all `fs.writeFileSync` calls across `lib/data/exams.ts`, `lib/data/mockTests.ts`, and `lib/db/questionDb.ts` with zero-write serverless no-ops.
    - Zero `fs.writeFileSync`, `writeFile`, or `mkdirSync` operations exist in runtime application code (`lib/` and `app/`).
  - **Modular Database Repository Layer**:
    - Created `lib/db/repositories/questionRepository.ts` providing transactional Prisma operations for Question and Option CRUD, passage deduplication, and bulk imports.
    - Created `lib/db/repositories/examRepository.ts` for Exam and Section upserts, title updates, and relational cascade deletions.
    - Created `lib/db/repositories/mockTestRepository.ts` for Mock Test and PYQ persistence, publishing toggles, and cascade deletions.
    - Created clean barrel export in `lib/db/repositories/index.ts`.
  - **Service Layer Alignment**:
    - Updated `lib/services/adminService.ts` to delegate all mutations directly to the repository layer.
    - Preserved in-memory mirrors for synchronous request processing while ensuring PostgreSQL is the single source of truth.
    - Wired Next.js 16 cache invalidations (`invalidateQuestionsCache`, `invalidateExamsCache`, `invalidateMockTestsCache`, `invalidateLiveQuestionsCache`) to surgical mutation triggers.
  - **Automated Verification**:
    - Created `tests/phase2-serverless.test.ts` verifying zero `fs.writeFileSync` calls under question creation, updates, and deletion.
    - Verified all 23 Vitest unit tests pass in 1.26s.
    - Verified end-to-end integration tests (`verify-delete-exam-and-questions.ts`, `verify-admin-pyq-and-custom-exam.ts`) pass with 100% success rate.
    - Verified Next.js 16 production build compiles with Turbopack across all 27 routes with 0 errors.

---

### ⏳ Phase 3: Service Layer Modularization (NEXT)
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
