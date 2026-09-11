import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'amber' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
}) => {
  const iconColorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <Card hoverEffect>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${iconColorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            {title}
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{value}</div>
          {subtitle && <span className="text-xs text-slate-500 mt-0.5 block">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
};
