'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function TooltipPanel({ children, className }: Props) {
  return (
    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 delay-300 z-[2147483647] pointer-events-auto ${className || ''}`}>
      <div className="rounded-lg px-4 py-3 text-xs shadow-2xl border border-gray-700 bg-gray-900 text-white w-[90vw] max-w-[700px] md:max-w-[880px] max-h-[70vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
