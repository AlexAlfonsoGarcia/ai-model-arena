import { useState, ChangeEvent, ClipboardEvent } from 'react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function PromptInput({ value, onChange, error }: PromptInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const MAX_LENGTH = 10000;

  // Sync with external value when it changes
  // Note: In practice, we might want to handle this differently
  // but for MVP we'll keep it simple and let parent control the value

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  // Handle paste events to prevent exceeding limit
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData?.getData('text') || '';
    const currentLength = localValue.length;
    const maxAllowed = MAX_LENGTH - currentLength;

    if (maxAllowed <= 0) {
      return; // Don't allow paste if already at limit
    }

    const truncatedText = pastedText.substring(0, maxAllowed);
    const newValue = localValue + truncatedText;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const charCount = localValue.length;
  const isAtLimit = charCount >= MAX_LENGTH;
  const isOverLimit = charCount > MAX_LENGTH; // Shouldn't happen with our handling
  const isApproachingLimit = charCount >= MAX_LENGTH * 0.8 && !isAtLimit; // 80% or more

  return (
    <div className="space-y-3">
      <label htmlFor="prompt-input" className="block text-sm font-medium text-zinc-700 dark:text-zinc-100">
        Prompt
      </label>
      <div className="relative">
        <textarea
          id="prompt-input"
          value={localValue}
          onChange={handleChange}
          onPaste={handlePaste}
          rows={6}
          className={`block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800
                     px-3 py-2 text-sm font-sans text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400
                     focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500
                     ${isOverLimit ? 'border-red-500' : isApproachingLimit ? 'border-amber-500' : ''}`}
          placeholder="Enter your prompt here (max 10,000 characters)"
          disabled={false}
        />
        {error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-between text-xs">
        <span className={`${isOverLimit ? 'text-red-600' : isApproachingLimit ? 'text-amber-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {charCount} / {MAX_LENGTH} characters
        </span>
        {isAtLimit && (
          <span className="text-xs text-red-600">
            Limit reached
          </span>
        )}
      </div>
    </div>
  );
}