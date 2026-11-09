export default function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-16 rounded-xl bg-sage"
        />
      ))}
    </div>
  );
}