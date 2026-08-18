interface CompareButtonProps {
  isLoading: boolean;
  onClick: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export default function CompareButton({
  isLoading,
  onClick,
  disabled = false,
  children = 'Compare Models',
}: CompareButtonProps) {
  const handleClick = () => {
    if (!disabled && !isLoading) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium
                 text-white hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500
                 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                 ${isLoading ? 'animate-pulse' : ''}`}
    >
      {isLoading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" opacity="0.3"></circle>
            <path d="M12 4v9m0 0h.01M12 18h.01M4.22 4.22l1.421.421m12.728-1.421l-1.415.415M1 12h16M18 12h.01"></path>
          </svg>
          <span>Comparing models...</span>
        </>
      ) : children}
    </button>
  );
}