import { useState, ChangeEvent } from 'react';
import { modelCatalog } from '@/lib/ai/catalog';
import { ModelId } from '@/lib/ai/types';

interface ModelSelectorProps {
  value: ModelId[]; // Selected model IDs
  onChange: (value: ModelId[]) => void;
  error?: string;
}

export default function ModelSelector({ value, onChange, error }: ModelSelectorProps) {
  const [localValue, setLocalValue] = useState<ModelId[]>(value);
  const MAX_SELECTIONS = 3;

  // Sync with external value when it changes
  // In a more complex app, we might use useEffect, but for MVP we'll keep it simple

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const modelId = e.target.value as ModelId;
    const isChecked = e.target.checked;

    let newValue: ModelId[];
    if (isChecked) {
      // Check if we're already at max selections
      if (localValue.length >= MAX_SELECTIONS) {
        // Don't allow more selections - this shouldn't happen if we disable checkboxes properly
        return;
      }
      newValue = [...localValue, modelId];
    } else {
      newValue = localValue.filter(id => id !== modelId);
    }

    setLocalValue(newValue);
    onChange(newValue);
  };

  const isAtMax = localValue.length >= MAX_SELECTIONS;
  const selectionCount = localValue.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label htmlFor="model-selector" className="block text-sm font-medium text-zinc-700 dark:text-zinc-100">
          Select Models
        </label>
        <div className="text-sm font-mono text-zinc-600 dark:text-zinc-300">
          {selectionCount}/{MAX_SELECTIONS} selected
        </div>
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {modelCatalog.map((model) => {
          const isSelected = localValue.includes(model.id);
          const isDisabled = !isSelected && isAtMax; // Disable if not selected and we're at max

          return (
            <div key={model.id} className="flex items-start space-x-3">
              <input
                id={`model-${model.id}`}
                type="checkbox"
                value={model.id}
                checked={isSelected}
                onChange={handleChange}
                disabled={isDisabled}
                className={`h-4 w-4 text-zinc-600 border-zinc-300 dark:border-zinc-600 rounded
                           focus:ring-zinc-500 ${isDisabled ? 'opacity-50' : ''}`}
              />
              <div className="flex-1 space-y-0.5">
                <label htmlFor={`model-${model.id}`} className="flex items-center text-sm font-medium text-zinc-800 dark:text-zinc-100 cursor-pointer">
                  <span className="truncate max-w-[200px]">{model.displayName}</span>
                  {(model.organization && model.organization !== 'unknown') && (
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
                      {model.organization}
                    </span>
                  )}
                </label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[250px]">
                  ID: {model.id}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {selectionCount === 0 && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          Please select at least one model
        </p>
      )}
    </div>
  );
}