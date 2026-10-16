# BankMock Architecture & Refactoring Roadmap

> **Current Status**: Phase 0, Phase 1, Phase 2, Phase 3 & Phase 4 **COMPLETED**  
> **Database Environment**: Neon Serverless PostgreSQL with pooler (`schema=bankmock` isolated)  
> **Test Status**: 42/42 Vitest unit tests passing | End-to-end integration tests passing | 0 ESLint errors | Production build passing (Turbopack)

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

### ✅ Phase 3: Service Layer Modularization (COMPLETED - 2026-10-15)
**Goal**: Deconstruct the monolithic 1,600-line `lib/services/adminService.ts` into single-responsibility, cohesive domain services with strict Zod validation.

1. **Domain Extraction**:
   - `lib/services/userService.ts`: User listing, approval/rejection actions, role mutations, self-protection guards.
   - `lib/services/examService.ts`: Exam categories, section configuration, pattern initialization, title updates, cascade deletion.
   - `lib/services/mockTestService.ts`: Mock test and PYQ persistence, dynamic partition computation, publish toggling.
   - `lib/services/questionService.ts`: Question CRUD, transactional bulk CSV/JSON import, group passage deduplication, live exam question queries.
   - `lib/services/attemptService.ts`: Candidate attempt tracking and admin attempt logs.
2. **Re-export Facade & Server Action RPC Compliance**:
   - Refactored `lib/services/adminService.ts` from 1,600 lines down to ~260 lines of clean asynchronous delegations and top-level `getAdminStats()` aggregation.
   - Explicit async delegation ensures 100% Turbopack Server Action RPC compatibility across client components and server routes.
3. **Zod Schema Validation (`lib/validations/adminSchemas.ts`)**:
   - Added strict validation schemas: `adminQuestionInputSchema`, `bulkImportQuestionsSchema`, `adminExamInputSchema`, `updateExamTitleSchema`, `adminMockTestInputSchema`, `updateMockTestTitleSchema`, `userStatusSchema`, `userRoleSchema`.
4. **Verification & Production Deployment**:
   - 35/35 Vitest unit tests pass in 1.89s (including 12 new tests in `tests/phase3-services.test.ts`).
   - End-to-end integration tests (`verify-admin-pyq-and-custom-exam.ts`, `verify-delete-exam-and-questions.ts`) pass with 100% success rate.
   - Full Next.js 16 production build compiles with Turbopack across all 27 routes with 0 errors.
   - **Vercel Resilient Build**: Resolved production build failure caused by strict `SESSION_SECRET` enforcement during Next.js static page collection by introducing a resilient fallback in `lib/config/env.ts` (Commit `785f93c`).
   - **Production Requirement**: Configure `DATABASE_URL` (ending with `&schema=bankmock`) in Vercel Project Settings > Environment Variables so Server Actions in serverless lambdas can persist exams/questions directly to Neon PostgreSQL.

---

### ✅ Phase 4: Exam Engine Robustness & Player Invariants (COMPLETED - 2026-10-16)
**Goal**: Ensure bulletproof exam simulation integrity for high-stakes banking exam aspirants.

1. **Invariants Enforcement & Section Locking**:
   - Strictly enforced 60 minutes overall exam duration with 3 × 20-minute non-transferable section locks (English: 20m, Quant: 20m, Reasoning: 20m).
   - Once a section concludes or candidate advances, the section is permanently locked with `CheckCircle2` indicators, auto-transition modals, and strict navigation guards.
   - Enforced canonical banking marking scheme (+1.0 for correct, -0.25 for incorrect, 0 for unattempted), validated via unit tests in `tests/phase4-engine.test.ts`.
2. **Browser Refresh Resilience (Zero Data Loss)**:
   - Eliminated premature `beforeunload`/`pagehide` storage wipeouts in `app/test/[testId]/page.tsx`.
   - On accidental browser refresh or disconnect, candidate selected responses, visited states, sectional timer seconds, and proctoring strikes are seamlessly restored.
   - Session storage is only cleared upon explicit candidate exam exit or verified final submission.
3. **Neon PostgreSQL Attempt & Answer Persistence**:
   - Created `saveAttemptAction` in `lib/services/attemptService.ts` creating `prisma.attempt` records and transactional `prisma.answer` entries with server-side time bounds validation.
   - Created `getAttemptByIdAction` and `getUserAttemptsAction` enabling cross-device access to exam scorecards (`/result/[attemptId]`) and review solutions (`/review/[attemptId]`).
   - Realigned candidate dashboard (`/dashboard`) and personal scorecards (`/my-results`) to hydrate real attempts from Neon PostgreSQL with offline fallback.
4. **Verification**:
   - 42/42 Vitest unit tests pass in 1.64s (`tests/phase4-engine.test.ts`).
   - End-to-end integration test (`scripts/verify-phase4-engine-and-attempts.ts`) passes 100%.
   - Full production build compiles with Turbopack across all 27 routes with 0 errors.

---

### ✅ Phase 5: Production Optimization, Caching & UI Polish (COMPLETED - 2026-10-16)
**Goal**: Fast load times, responsive UI, accessible SEO structure, and premium presentation.

1. **Large Dataset Rendering & Pagination**:
   - Implemented high-performance pagination controls in `app/admin/questions/page.tsx`, eliminating MathJax DOM bloat and browser lag across the 900+ question bank.
   - Added selectable page sizes (25, 50, 100, All), direct page jumping input, dynamic page range navigation with ellipsis, and global question indexing (`#startIndex + idx + 1`).
   - Automated scroll-to-top on page change and automatic reset to page 1 upon filter/partition switching.
2. **Next.js 16 Route Segment Caching & Static Parameters**:
   - Added `generateStaticParams()` to `app/exams/[slug]/page.tsx` for core banking exams (`ibps-po`, `sbi-clerk`) with `dynamicParams = true` fallback for dynamically created admin exams.
   - Added dynamic `generateMetadata({ params })` dynamically assembling SEO titles, OpenGraph tags, and canonical keywords for dynamic exam landing pages.
3. **Comprehensive SEO & Accessibility Audit**:
   - Configured custom metadata (`title`, `description`, `keywords`) across all public pages (`/`, `/exams`, `/tests`, `/my-results`, `/dashboard`, `/profile`).
   - Enforced strict search engine privacy protection via `robots: { index: false, follow: false }` across private/administrative route layouts (`/admin`, `/result`, `/review`, `/test`, `/unauthorized`).
   - Verified single `<h1>` hierarchy per page and added unique IDs to primary interactive CTA elements (`#hero-start-mock-btn`, `#hero-explore-exams-btn`, `#hero-try-featured-btn`, `#explore-all-exams-btn`, `#view-all-mocks-btn`, `#cta-start-free-btn`).
4. **UI Aesthetics & Visual Polish**:
   - Enriched homepage hero section with luminous radial gradients, subtle glassmorphic backdrop accents, and micro-hover interactions on trust metrics and feature cards.
5. **Verification & Test Coverage**:
   - 51/51 Vitest unit tests pass in 1.59s (including 9 comprehensive tests in `tests/phase5-optimization.test.ts`).
   - Integration script `scripts/verify-phase4-engine-and-attempts.ts` passes with 100% success.
   - Full Next.js 16 production build compiles with Turbopack across all 27 routes with 0 errors.

---

## ⚠️ Critical Multi-Project Rules (Do Not Forget!)
- **Always ensure `DATABASE_URL` ends with `&schema=bankmock`**
- **NEVER run `npx prisma db push --accept-data-loss`** without verifying the target schema.
- Tables in the `public` schema belong to `EXAM Tracker` and must never be altered or dropped.
