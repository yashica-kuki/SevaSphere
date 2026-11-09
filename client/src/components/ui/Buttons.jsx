import { cn } from "../../lib/utils";

const variants = {
  primary: "bg-forest text-white hover:bg-[#194c40]",
  secondary: "bg-sage text-forest hover:bg-[#d6e6dc]",
  outline: "border border-border bg-white text-forest hover:bg-ivory",
  ghost: "text-charcoal hover:bg-sage",
  gold: "bg-gold text-forest hover:bg-[#c69d4f]"
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}