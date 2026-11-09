import { cn } from "../../lib/utils";

export default function Input({
  label,
  error,
  className = "",
  ...props
}) {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-sm font-medium text-charcoal">
          {label}
        </label>
      )}

      <input
        className={cn(
          "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10",
          error && "border-red-500",
          className
        )}
        {...props}
      />

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}