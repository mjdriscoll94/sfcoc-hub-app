'use client';

interface DataLoadErrorProps {
  message?: string;
  onRetry: () => void;
}

export default function DataLoadError({
  message = 'We couldn’t load this information. Check your connection and try again.',
  onRetry,
}: DataLoadErrorProps) {
  return (
    <div className="py-4 text-center" role="alert">
      <p className="text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md border border-coral bg-white px-4 py-2 text-sm font-semibold text-coral transition hover:bg-coral/10 focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
