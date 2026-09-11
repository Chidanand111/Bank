import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  color?: 'blue' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'blue',
  size = 'md',
  showLabel = false,
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const colorMap = {
    blue: 'bg-blue-600',
    green: 'bg-emerald-600',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const heightMap = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-700">
          <span>Progress</span>
          <span>{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightMap[size]}`}>
        <div
          className={`${colorMap[color]} ${heightMap[size]} transition-all duration-300 rounded-full`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
