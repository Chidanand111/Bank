'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  getAdminUsers,
  updateUserRoleAction,
  approveUserAction,
  rejectUserAction,
} from '@/lib/services/adminService';
import { AdminNav } from '@/components/admin/AdminNav';
import { AuthUser, Role } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils/formatters';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Check,
  X,
  Search,
} from 'lucide-react';

type TabFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'ADMIN';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabFilter, setTabFilter] = useState<TabFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Role change modal state
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [targetRole, setTargetRole] = useState<Role>('USER');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadUsers = async () => {
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleApprove = (userId: string, userName: string) => {
    setActionLoadingId(userId);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await approveUserAction(userId);
      if (res.success) {
        setStatusMessage({
          text: `Candidate ${userName} has been APPROVED! They can now log in and take mock tests.`,
          type: 'success',
        });
        await loadUsers();
      } else {
        setStatusMessage({ text: res.error || 'Failed to approve user.', type: 'error' });
      }
      setActionLoadingId(null);
    });
  };

  const handleReject = (userId: string, userName: string) => {
    setActionLoadingId(userId);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await rejectUserAction(userId);
      if (res.success) {
        setStatusMessage({
          text: `Candidate application for ${userName} has been REJECTED.`,
          type: 'error',
        });
        await loadUsers();
      } else {
        setStatusMessage({ text: res.error || 'Failed to reject user.', type: 'error' });
      }
      setActionLoadingId(null);
    });
  };

  const openRoleChangeModal = (user: AuthUser, newRole: Role) => {
    setSelectedUser(user);
    setTargetRole(newRole);
    setStatusMessage(null);
    setIsRoleModalOpen(true);
  };

  const handleConfirmRoleChange = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const res = await updateUserRoleAction(selectedUser.id, targetRole);
      if (res.success) {
        setStatusMessage({
          text: `Successfully changed ${selectedUser.name}'s role to ${targetRole}.`,
          type: 'success',
        });
        setIsRoleModalOpen(false);
        await loadUsers();
      } else {
        setStatusMessage({ text: res.error || 'Failed to update role.', type: 'error' });
        setIsRoleModalOpen(false);
      }
    });
  };

  // Counts
  const pendingUsers = users.filter((u) => u.status === 'PENDING');
  const approvedUsers = users.filter((u) => u.status === 'APPROVED' || !u.status);
  const adminUsers = users.filter((u) => u.role === 'ADMIN');

  // Filtered list
  const filteredUsers = users.filter((u) => {
    // Tab filter
    if (tabFilter === 'PENDING' && u.status !== 'PENDING') return false;
    if (tabFilter === 'APPROVED' && u.status !== 'APPROVED' && u.status) return false;
    if (tabFilter === 'ADMIN' && u.role !== 'ADMIN') return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(query);
      const matchEmail = u.email.toLowerCase().includes(query);
      return matchName || matchEmail;
    }
    return true;
  });

  return (
    <div className="pb-16 bg-slate-50/50 min-h-screen">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="sm">
                ACCESS CONTROL & APPROVALS
              </Badge>
              <span className="text-xs text-slate-500">• {users.length} Total Accounts</span>
              {pendingUsers.length > 0 && (
                <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                  {pendingUsers.length} Pending Approval
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              User Approvals & Role Management
            </h1>
            <p className="text-sm text-slate-600">
              Review new candidate registrations, grant mock test permissions with one-click approval, and manage admin privileges.
            </p>
          </div>
        </div>

        {/* Global Status Message Toast */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Attention Banner for Pending Registrations */}
        {pendingUsers.length > 0 && tabFilter !== 'PENDING' && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-300/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-950">
                  {pendingUsers.length} Candidate Registration{pendingUsers.length > 1 ? 's' : ''} Awaiting Admin Approval
                </h2>
                <p className="text-xs text-amber-800 mt-0.5">
                  Newly registered candidates cannot take mock tests or sign in until approved by an administrator.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setTabFilter('PENDING')}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-xs"
            >
              Review Approvals ({pendingUsers.length})
            </Button>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setTabFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tabFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Accounts ({users.length})
            </button>

            <button
              onClick={() => setTabFilter('PENDING')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                tabFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending Approvals
              {pendingUsers.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  tabFilter === 'PENDING' ? 'bg-amber-800 text-amber-100' : 'bg-amber-200 text-amber-900'
                }`}>
                  {pendingUsers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setTabFilter('APPROVED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tabFilter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Approved Students ({approvedUsers.filter(u => u.role === 'USER').length})
            </button>

            <button
              onClick={() => setTabFilter('ADMIN')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tabFilter === 'ADMIN'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Admins ({adminUsers.length})
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Users Table Card */}
        <Card className="border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-3.5 px-4">Candidate / User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4 text-center">System Role</th>
                  <th className="py-3.5 px-4 text-center">Approval Status</th>
                  <th className="py-3.5 px-4 text-center">Registered</th>
                  <th className="py-3.5 px-4 text-center">Attempts</th>
                  <th className="py-3.5 px-4 text-right">Approval & Role Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      <div className="inline-flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Loading platform accounts...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No accounts found matching the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isAdminUser = u.role === 'ADMIN';
                    const isPendingApproval = u.status === 'PENDING';
                    const isApproved = u.status === 'APPROVED' || !u.status;
                    const isRejected = u.status === 'REJECTED';
                    const isActionLoading = actionLoadingId === u.id;

                    return (
                      <tr
                        key={u.id}
                        className={`transition-colors ${
                          isPendingApproval ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                isAdminUser
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : isPendingApproval
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {u.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span>{u.name}</span>
                              {isPendingApproval && (
                                <span className="text-[10px] font-semibold text-amber-700 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> Requires Approval
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {u.email}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={isAdminUser ? 'purple' : 'blue'} size="sm">
                            {u.role}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isPendingApproval ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3" /> PENDING
                            </span>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Check className="w-3 h-3" /> APPROVED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                              <X className="w-3 h-3" /> REJECTED
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                          {u.createdAt ? formatDate(u.createdAt) : 'Initial Seed'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-blue-700">
                          {u.attemptCount || 0}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* APPROVAL ACTIONS FOR PENDING USERS */}
                            {isPendingApproval ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  isLoading={isActionLoading}
                                  disabled={isPending}
                                  onClick={() => handleApprove(u.id, u.name)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  isLoading={isActionLoading}
                                  disabled={isPending}
                                  onClick={() => handleReject(u.id, u.name)}
                                  className="text-red-600 hover:bg-red-50 border-red-200 flex items-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" /> Reject
                                </Button>
                              </>
                            ) : (
                              <>
                                {/* RE-APPROVE OR SUSPEND TOGGLE FOR REGISTERED USERS */}
                                {isRejected ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() => handleApprove(u.id, u.name)}
                                    className="text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                  >
                                    Re-Approve
                                  </Button>
                                ) : null}

                                {/* ROLE CHANGE ACTIONS */}
                                {isAdminUser ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() => openRoleChangeModal(u, 'USER')}
                                    className="text-amber-700 hover:bg-amber-50 border-amber-300"
                                  >
                                    Demote to USER
                                  </Button>
                                ) : (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() => openRoleChangeModal(u, 'ADMIN')}
                                    className="text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                                  >
                                    Promote to ADMIN
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Role Change Confirmation Modal */}
      {selectedUser && (
        <Modal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          title="Confirm Role Change"
          footer={
            <>
              <Button variant="secondary" size="md" onClick={() => setIsRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={targetRole === 'ADMIN' ? 'primary' : 'danger'}
                size="md"
                isLoading={isPending}
                onClick={handleConfirmRoleChange}
              >
                Confirm Role Change
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Security Privileges Update</p>
                <p className="mt-0.5 text-amber-800">
                  You are changing <strong className="text-amber-950">{selectedUser.name}</strong> ({selectedUser.email}) from{' '}
                  <strong className="text-amber-950">{selectedUser.role}</strong> to{' '}
                  <strong className="text-amber-950">{targetRole}</strong>.
                </p>
              </div>
            </div>

            {targetRole === 'USER' && (
              <p className="text-xs text-slate-500">
                Demoting this account to USER will revoke direct access to the administrator portal and all exam editing capabilities. Note: You cannot demote yourself.
              </p>
            )}

            {targetRole === 'ADMIN' && (
              <p className="text-xs text-slate-500">
                Promoting this account to ADMIN grants platform controller privileges, including direct access via /admin and question/user approvals.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
