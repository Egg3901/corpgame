"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppNavigation from '@/components/AppNavigation';
import { issueAPI } from '@/lib/api';
import { AlertCircle, Send, CheckCircle2 } from 'lucide-react';

export default function ReportIssuePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'bug' | 'feature' | 'ui' | 'performance' | 'security' | 'other'>('bug');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await issueAPI.report({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
      });

      setSuccess(true);
      setTitle('');
      setDescription('');
      setCategory('bug');
      setPriority('medium');

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to report issue:', err);
      setError(err.response?.data?.error || 'Failed to submit issue report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Report Issue</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Found a bug or have a suggestion? Let us know and we'll look into it.
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            ⚠️ <strong>Note:</strong> This form is for game suggestions, bugs, and technical issues. For moderation concerns or reporting inappropriate user behavior, please use the report button in messages.
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
                  Issue reported successfully! We'll review it soon.
                </p>
                {githubUrl && (
                  <div className="mt-2">
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 underline font-medium"
                    >
                      <span>Track your report on GitHub</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
                {reportId && !githubUrl && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                    Report ID: <strong>#{reportId}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issue Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                placeholder="Brief description of the issue"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as 'bug' | 'feature' | 'ui' | 'performance' | 'security' | 'other')}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature Request</option>
                <option value="ui">UI/UX Issue</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority *
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={8}
                maxLength={5000}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-corporate-blue focus:border-transparent resize-y"
                placeholder="Please provide detailed information about the issue, including steps to reproduce if applicable..."
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {description.length} / 5000 characters
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || !description.trim()}
                className="flex-1 px-4 py-2 bg-corporate-blue text-white rounded-lg font-semibold hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Issue
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppNavigation>
  );
}
