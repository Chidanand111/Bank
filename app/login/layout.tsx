import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In to BankMock | Candidate & Admin Portal',
  description:
    'Log in to your BankMock account to practice banking mock tests, track sectional timing, and view performance scorecards.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
