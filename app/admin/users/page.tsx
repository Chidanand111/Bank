'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getAdminUsers, updateUserRoleAction } from '@/lib/services/adminService';
import { AdminNav } from '@/components/admin/AdminNav';
import { AuthUser, Role } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils/formatters';
import { Users, Shield, User, AlertTriangle, CheckCircle2, ShieldAlert, ArrowUpDown } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [targetRole, setTargetRole] = useState<Role>('USER');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
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

  const openRoleChangeModal = (user: AuthUser, newRole: Role) => {
    setSelectedUser(user);
    setTargetRole(newRole);
    setStatusMessage(null);
    setIsModalOpen(true);
  };

  const handleConfirmRoleChange = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const res = await updateUserRoleAction(selectedUser.id, targetRole);
      if (res.success) {
        setStatusMessage({ text: `Successfully updated ${selectedUser.name}'s role to ${targetRole}.`, type: 'success' });
        setIsModalOpen(false);
        await loadUsers();
      } else {
        setStatusMessage({ text: res.error || 'Failed to update role.', type: 'error' });
        setIsModalOpen(false);
      }
    });
  };

  return (
    <div className="pb-16">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="sm">SECURITY & ACCESS CONTROL</Badge>
              <span className="text-xs text-slate-500">• {users.length} Registered Accounts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Platform User & Role Management
            </h1>
            <p className="text-sm text-slate-600">
              Inspect student accounts, view attempt volumes, and promote or demote administrators with database confirmation.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Users Table Card */}
        <Card className="border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">User Name</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4 text-center">Current Role</th>
                  <th className="py-3.5 px-4 text-center">Registration Date</th>
                  <th className="py-3.5 px-4 text-center">Attempts</th>
                  <th className="py-3.5 px-4 text-right">Role Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => {
                  const isAdminUser = u.role === 'ADMIN';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isAdminUser ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {u.name.charAt(0)}
                          </div>
                          <span>{u.name}</span>
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

                      <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                        {u.createdAt ? formatDate(u.createdAt) : 'Initial Seed'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-blue-700">
                        {u.attemptCount || 0}
                      </td>

                      <td className="py-3.5 px-4 text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Confirmation Modal */}
      {selectedUser && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Confirm User Role Change"
          footer={
            <>
              <Button variant="secondary" size="md" onClick={() => setIsModalOpen(false)}>
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
                <p className="font-bold">Important Security Confirmation</p>
                <p className="mt-0.5 text-amber-800">
                  You are about to change <strong className="text-amber-950">{selectedUser.name}</strong> ({selectedUser.email}) from{' '}
                  <strong className="text-amber-950">{selectedUser.role}</strong> to{' '}
                  <strong className="text-amber-950">{targetRole}</strong>.
                </p>
              </div>
            </div>

            {targetRole === 'USER' && (
              <p className="text-xs text-slate-500">
                Demoting this account to USER will immediately revoke access to the administrator portal and all question/mock-test editing capabilities. Note: You cannot demote yourself.
              </p>
            )}

            {targetRole === 'ADMIN' && (
              <p className="text-xs text-slate-500">
                Promoting this account to ADMIN grants full platform privileges, including question bank authoring and user role management.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
