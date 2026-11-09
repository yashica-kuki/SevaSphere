import { Inbox } from "lucide-react";

export default function EmptyState({
  title = "Nothing here yet",
  description = "Your information will appear here."
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
      <Inbox size={36} className="mb-3 text-forest/50" />
      <h3 className="font-semibold text-forest">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}