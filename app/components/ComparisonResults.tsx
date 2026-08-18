import { AIResponse } from '@/lib/ai/types';
import ModelResultCard from './ModelResultCard';

interface ComparisonResultsProps {
  results: AIResponse[];
  isLoading: boolean;
  error?: string;
}

export default function ComparisonResults({ results, isLoading, error }: ComparisonResultsProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-pulse">
          <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" opacity="0.3"></circle>
            <path d="M12 4v9m0 0h.01M12 18h.01M4.22 4.22l1.421.421m12.728-1.421l-1.415.415M1 12h16M18 12h.01"></path>
          </svg>
        </div>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
          Comparing models...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-sm font-medium text-red-800 dark:text-red-200">
          Comparison failed:
        </p>
        <p className="mt-2 text-xs text-red-700 dark:text-red-300 break-words">
          {error}
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No results to display. Please select models and enter a prompt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* Responsive layout: 1 column on mobile, 2 columns on tablet, 3 columns on desktop */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((result, index) => (
            <ModelResultCard key={index} result={result} />
          ))}
        </div>
      </div>
    </div>
  );
}