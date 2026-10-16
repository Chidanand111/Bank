import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Candidate Performance Dashboard | BankMock',
  description:
    'Track your banking exam preparation progress, recent mock test attempts, sectional accuracy, and key improvement areas.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
