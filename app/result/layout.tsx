import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test Result & Scorecard | BankMock',
  description:
    'Detailed banking mock test scorecard with sectional analysis, accuracy rate, cutoff status, and time management metrics.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
