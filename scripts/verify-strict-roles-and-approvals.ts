import {
  findDatabaseUserByEmail,
  getDatabaseUsers,
  createDatabaseUser,
  updateDatabaseUserStatus,
  updateDatabaseUserRole,
} from '../lib/auth/session';
import { loginAction, adminLoginAction, registerAction } from '../lib/auth/actions';

async function runTests() {
  console.log('=====================================================');
  console.log('VERIFYING STRICT ROLES, DIRECT ADMIN LOGIN & APPROVALS');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Initial State Checks
  const initialUsers = getDatabaseUsers();
  const admin = initialUsers.find(u => u.role === 'ADMIN');
  const student = initialUsers.find(u => u.role === 'USER' && u.status === 'APPROVED');
  const pending = initialUsers.find(u => u.role === 'USER' && u.status === 'PENDING');

  assert(Boolean(admin && admin.email === 'admin@bankmock.com'), '1. Admin account exists with ADMIN role');
  assert(Boolean(student && student.email === 'student@bankmock.com' && student.status === 'APPROVED'), '2. Approved student account exists');
  assert(Boolean(pending && pending.status === 'PENDING'), '3. Pending candidate accounts exist in user store');

  // 2. Strict Role Separation: Admin logging in at Candidate /login must be rejected
  const adminAtCandidateLoginForm = new FormData();
  adminAtCandidateLoginForm.append('email', 'admin@bankmock.com');
  adminAtCandidateLoginForm.append('password', 'admin123');

  const adminCandidateLoginResult = await loginAction(null, adminAtCandidateLoginForm);
  assert(
    !adminCandidateLoginResult.success &&
    adminCandidateLoginResult.error?.includes('Admin Portal at /admin') === true,
    '4. Admin attempting to login at candidate /login is rejected with direct /admin notice'
  );

  // 3. Strict Role Separation: Candidate logging in at /admin/login must be rejected
  const studentAtAdminLoginForm = new FormData();
  studentAtAdminLoginForm.append('email', 'student@bankmock.com');
  studentAtAdminLoginForm.append('password', 'user123');

  const studentAdminLoginResult = await adminLoginAction(null, studentAtAdminLoginForm);
  assert(
    !studentAdminLoginResult.success &&
    studentAdminLoginResult.error?.includes('Platform administrator') === true,
    '5. Student attempting to login at /admin/login is rejected with Platform Administrator requirement'
  );

  // 4. Pending Candidate Login at /login must be blocked awaiting approval
  const pendingLoginForm = new FormData();
  pendingLoginForm.append('email', pending!.email);
  pendingLoginForm.append('password', 'user123');

  const pendingLoginResult = await loginAction(null, pendingLoginForm);
  assert(
    !pendingLoginResult.success &&
    pendingLoginResult.error?.includes('Account Pending Approval') === true,
    '6. Pending candidate attempting to login at /login is blocked awaiting admin approval'
  );

  // 5. New Candidate Registration creates account in PENDING status without session
  const testCandidateEmail = `candidate.${Date.now()}@example.com`;
  const registerForm = new FormData();
  registerForm.append('name', 'Ananya Deshmukh');
  registerForm.append('email', testCandidateEmail);
  registerForm.append('password', 'secret123');

  const regResult = await registerAction(null, registerForm);
  assert(
    regResult.success === true && regResult.pendingApproval === true,
    '7. Registration returns pendingApproval: true'
  );

  const registeredUser = findDatabaseUserByEmail(testCandidateEmail);
  assert(
    Boolean(registeredUser && registeredUser.status === 'PENDING' && registeredUser.role === 'USER'),
    '8. Newly registered candidate is stored with status: PENDING and role: USER'
  );

  // 6. Admin Approves the Candidate
  const approvalUpdated = updateDatabaseUserStatus(registeredUser!.id, 'APPROVED');
  assert(
    Boolean(approvalUpdated && approvalUpdated.status === 'APPROVED'),
    '9. Admin successfully approves candidate -> status becomes APPROVED'
  );

  // 7. Approved Candidate can now proceed
  assert(
    approvalUpdated?.status === 'APPROVED',
    '10. Approved candidate is verified as APPROVED in database'
  );

  // 8. Reject Workflow
  const testCandidateRejectEmail = `rejected.${Date.now()}@example.com`;
  createDatabaseUser({
    name: 'Test Reject Candidate',
    email: testCandidateRejectEmail,
    passwordHash: 'secret123',
    role: 'USER',
    status: 'PENDING',
  });
  const rejectTarget = findDatabaseUserByEmail(testCandidateRejectEmail);
  const rejectedUpdated = updateDatabaseUserStatus(rejectTarget!.id, 'REJECTED');
  assert(
    Boolean(rejectedUpdated && rejectedUpdated.status === 'REJECTED'),
    '11. Admin can reject application -> status becomes REJECTED'
  );

  const rejectedLoginForm = new FormData();
  rejectedLoginForm.append('email', testCandidateRejectEmail);
  rejectedLoginForm.append('password', 'secret123');
  try {
    const rejectedLoginResult = await loginAction(null, rejectedLoginForm);
    const hasRejectedError = Boolean(
      rejectedLoginResult &&
      !rejectedLoginResult.success &&
      rejectedLoginResult.error?.includes('Rejected')
    );
    if (!hasRejectedError) {
      console.log('UNEXPECTED rejectedLoginResult:', rejectedLoginResult);
    }
    assert(hasRejectedError, '12. Rejected user cannot sign in');
  } catch (err) {
    console.error('Test 12 thrown error:', err);
    assert(false, '12. Rejected user cannot sign in');
  }

  console.log('\n=====================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
