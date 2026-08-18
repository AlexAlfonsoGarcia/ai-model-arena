import { AIResponse } from '@/lib/ai/types';

interface ModelResultCardProps {
  result: AIResponse;
}

export default function ModelResultCard({ result }: ModelResultCardProps) {
  const {
    providerId,
    modelId,
    content,
    usage,
    latencyMs,
    estimatedCost,
    finishReason,
    error,
  } = result;

  // Helper to format numbers
  const formatNumber = (num: number | undefined) =>
    num !== undefined ? num.toLocaleString() : 'N/A';

  const formatCost = (cost: number | undefined) =>
    cost !== undefined ? `$${cost.toFixed(6)}` : 'N/A';

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      {/* Header with model info and latency */}
      <div className="bg-zinc-50 dark:bg-zinc-900 px-4 py-3 flex items-between sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {modelId.split('/').pop() || modelId} {/* Show just the model name part */}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {providerId} {/* Provider */}
          </p>
        </div>
        {latencyMs !== undefined && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
            {latencyMs} ms
          </div>
        )}
      </div>

      {/* Content or error message */}
      <div className="p-4">
        {error ? (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded p-3 mb-3">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
              Error:
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 break-words whitespace-pre-wrap">
              {error}
            </p>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-zinc-800 dark:text-zinc-100">
            {content || '(No response content)'}
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex-1 sm:auto">
          <div className="flex items-center gap-2">
            {usage?.inputTokens !== undefined && (
              <>
                <span className="text-zinc-500 dark:text-zinc-400">In:</span>
                <span className="font-mono">{formatNumber(usage.inputTokens)}</span>
              </>
            )}
            {usage?.outputTokens !== undefined && (
              <>
                <span className="mx-2 text-zinc-500 dark:text-zinc-400">|</span>
                <span className="text-zinc-500 dark:text-zinc-400">Out:</span>
                <span className="font-mono">{formatNumber(usage.outputTokens)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 sm:auto text-right sm:text-left">
          <div className="flex items-center gap-2 justify-end sm:justify-start">
            {estimatedCost !== undefined && (
              <>
                <span className="text-zinc-500 dark:text-zinc-400">Cost:</span>
                <span className="font-mono">{formatCost(estimatedCost)}</span>
              </>
            )}
            {finishReason && finishReason !== null && (
              <>
                <span className="mx-2 text-zinc-500 dark:text-zinc-400">|</span>
                <span className="text-zinc-500 dark:text-zinc-400">Finish:</span>
                <span className="font-mono capitalize">
                  {finishReason.toString().replace('_', ' ')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}