import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorState({
  message = "Something went wrong.",
  onRetry
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <AlertCircle className="mx-auto mb-3 text-red-600" size={32} />

      <p className="font-medium text-red-800">{message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-700"
        >
          <RefreshCw size={15} />
          Try again
        </button>
      )}
    </div>
  );
}