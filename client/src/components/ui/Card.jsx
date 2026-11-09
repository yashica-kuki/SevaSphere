import { cn } from "../../lib/utils";

export default function Card({ children, className = "" }) {
  return (
    <div className={cn("surface-card p-5", className)}>
      {children}
    </div>
  );
}