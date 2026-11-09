import { cn } from "../../lib/utils";

export default function Dropdown({
  label,
  options = [],
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

      <select
        className={cn(
          "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-forest",
          className
        )}
        {...props}
      >
        <option value="">Select an option</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}