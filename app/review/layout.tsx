import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test Solutions & Paper Review | BankMock',
  description:
    'Step-by-step mathematical explanations, passage keys, and official answers for your attempted banking mock test.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
