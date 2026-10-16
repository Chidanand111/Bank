import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Exam Simulator | BankMock',
  description:
    'TCS iON banking exam interface with real-time sectional countdown timers, question palette, and instant proctoring.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
