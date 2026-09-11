'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Award,
  BarChart2,
  Menu,
  X,
  ShieldCheck,
  User,
  LogOut,
  Settings,
  Layers,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AuthUser } from '@/types';
import { logoutAction } from '@/lib/auth/actions';

export interface NavbarProps {
  user?: AuthUser | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Hide main navbar inside active test taking screen
  if (pathname.startsWith('/test/')) {
    return null;
  }

  // Navigation Links based on user role
  const baseLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart2, authRequired: true },
    { name: 'Exams', href: '/exams', icon: BookOpen, authRequired: false },
    { name: 'Mock Tests', href: '/tests', icon: Award, authRequired: false },
    { name: 'Practice', href: '/tests', icon: Layers, authRequired: false },
    { name: 'My Results', href: '/my-results', icon: FileCheck2, authRequired: true },
  ];

  // Filter links by auth state
  const visibleLinks = baseLinks.filter(link => !link.authRequired || Boolean(user));

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                Bank<span className="text-blue-600">Mock</span>
              </span>
              <span className="text-[10px] font-medium text-slate-500 tracking-wider uppercase mt-0.5">
                Banking Exam Prep
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}

            {/* ADMIN ONLY LINK */}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>

          {/* Right Action / Profile Menu */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    pathname === '/profile'
                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4 text-blue-600" />
                  <span>{user.name.split(' ')[0]}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                      user.role === 'ADMIN'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </Link>

                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/tests">
                  <Button variant="primary" size="sm">
                    Start a Mock Test
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex lg:hidden items-center gap-2">
            {user && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {user.role}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 text-slate-500" />
                {link.name}
              </Link>
            );
          })}

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold bg-indigo-50 text-indigo-700"
            >
              <Settings className="w-4 h-4" />
              Admin Management
            </Link>
          )}

          <div className="pt-2 border-t border-slate-100 space-y-2">
            {user ? (
              <div className="space-y-2">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  <User className="w-4 h-4 text-blue-600" /> Profile ({user.name})
                </Link>
                <form action={logoutAction}>
                  <Button variant="danger" size="sm" className="w-full">
                    <LogOut className="w-4 h-4 mr-1.5" /> Logout
                  </Button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link href="/tests" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Start Test
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
