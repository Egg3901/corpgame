"use client";

import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';

export default function CorporationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">All Corporations</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            This page is a placeholder. The full corporations display will be implemented soon.
          </p>
          <Link
            href="/corporation/create"
            className="inline-flex items-center gap-2 bg-corporate-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Corporation
          </Link>
        </div>
      </div>
    </div>
  );
}
