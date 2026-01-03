'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface GuideSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function GuideSection({
  id,
  title,
  icon,
  children,
  defaultOpen = false
}: GuideSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      id={id}
      className="bg-white dark:bg-gray-800/50 bloomberg:bg-black rounded-xl border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 bloomberg:hover:bg-bloomberg-green/10 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-corporate-blue to-blue-600 dark:from-corporate-blue dark:to-blue-700 bloomberg:from-bloomberg-green bloomberg:to-bloomberg-green-dim">
            {icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
            {title}
          </h3>
        </div>
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green" />
        ) : (
          <ChevronRight className="w-6 h-6 text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green" />
        )}
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700 bloomberg:border-bloomberg-green/30">
          <div className="prose dark:prose-invert bloomberg:prose-bloomberg max-w-none">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
