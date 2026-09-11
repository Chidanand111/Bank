'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  HelpCircle,
  Award,
  Users,
  BookOpen,
  FolderTree,
  Tags,
  FileCheck2
} from 'lucide-react';

export const AdminNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Questions', href: '/admin/questions', icon: HelpCircle },
    { name: 'Mock Tests', href: '/admin/tests', icon: Award },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Exams', href: '/admin/exams', icon: BookOpen },
    { name: 'Sections', href: '/admin/sections', icon: FolderTree },
    { name: 'Topics', href: '/admin/topics', icon: Tags },
    { name: 'Attempts', href: '/admin/attempts', icon: FileCheck2 },
  ];

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2.5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
