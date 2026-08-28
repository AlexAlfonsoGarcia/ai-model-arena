'use client';

import { useState } from 'react';
import PromptInput from './components/PromptInput';
import ModelSelector from './components/ModelSelector';
import CompareButton from './components/CompareButton';
import ComparisonResults from './components/ComparisonResults';
import { AIResponse, ModelId } from '@/lib/ai/types';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [selectedModelIds, setSelectedModelIds] = useState<ModelId[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [results, setResults] = useState<AIResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Handle prompt changes
  const handlePromptChange = (value: string) => {
    setPrompt(value);
    // Clear any prompt-related errors when user types
    if (error && error.includes('prompt')) {
      setError(null);
    }
  };

  // Handle model selection changes
  const handleModelSelectChange = (value: ModelId[]) => {
    setSelectedModelIds(value);
    // Clear any model selection errors when user changes selection
    if (error && error.includes('model')) {
      setError(null);
    }
  };

  // Handle compare button click
  const handleCompareClick = async () => {
    // Clear previous errors
    setError(null);

    // Client-side validation
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt === '') {
      setError('Please enter a prompt');
      return;
    }

    if (selectedModelIds.length === 0) {
      setError('Please select at least one model');
      return;
    }

    if (selectedModelIds.length > 3) {
      setError('Please select no more than 3 models');
      return;
    }

    try {
      setIsComparing(true);
      setResults([]); // Clear previous results

      // Prepare request body - convert ModelId[] to string[] for the API
      const requestBody = {
        prompt: trimmedPrompt,
        modelIds: selectedModelIds.map(id => String(id)),
      };

      // Call the API endpoint
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Comparison failed:', err);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Enhanced Header */}
      <header className="bg-white dark:bg-zinc-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              AI Model Arena
            </h1>
            <p className="text-base text-zinc-600 dark:text-zinc-300">
              Compare responses from different AI models side-by-side
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8">
        {/* Form */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          {/* Prompt Input */}
          <PromptInput
            value={prompt}
            onChange={handlePromptChange}
            error={error && error.includes('prompt') ? error : undefined}
          />

          {/* Model Selector */}
          <ModelSelector
            value={selectedModelIds}
            onChange={handleModelSelectChange}
            error={error && error.includes('model') ? error : undefined}
          />

          {/* Compare Button */}
          <div className="flex justify-center">
            <CompareButton
              isLoading={isComparing}
              onClick={handleCompareClick}
              disabled={prompt.trim() === '' || selectedModelIds.length === 0 || selectedModelIds.length > 3}
            >
              {isComparing ? 'Comparing...' : 'Compare Models'}
            </CompareButton>
          </div>

          {/* Global Error Message (for non-field errors) */}
          {error && !error.includes('prompt') && !error.includes('model') && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Error:
              </p>
              <p className="mt-2 text-base text-red-700 dark:text-red-300 break-words">
                {error}
              </p>
            </div>
          )}
        </form>

        {/* Results Section */}
        {results.length > 0 || isComparing || error && !error.includes('prompt') && !error.includes('model') && (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
              Comparison Results
            </h2>
            <ComparisonResults
              results={results}
              isLoading={isComparing}
              error={error && !error.includes('prompt') && !error.includes('model') ? error : undefined}
            />
          </section>
        )}
      </main>

      {/* Enhanced Footer */}
      <footer className="bg-white dark:bg-zinc-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Built with Next.js & Vercel AI SDK • Frontend MVP
        </div>
      </footer>
    </div>
  );
}