import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Candidate Registration | BankMock',
  description:
    'Register for BankMock to access authentic IBPS PO and SBI Clerk online mock tests, previous year papers, and performance analytics.',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
