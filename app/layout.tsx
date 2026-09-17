import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'BankMock - Banking Exam Preparation & Mock Test Platform',
  description: 'Crack IBPS PO, SBI Clerk, and competitive banking exams with realistic online mock tests, sectional timing, performance analytics, and detailed solutions.',
  keywords: 'IBPS PO Mock Test, SBI Clerk Mock Test, Banking Exams India, Quantitative Aptitude Practice, Reasoning Ability, Banking Awareness',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar user={currentUser} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
