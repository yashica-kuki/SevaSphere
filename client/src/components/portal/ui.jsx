import { Loader2, AlertTriangle, Inbox, Info } from "lucide-react";

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-forest sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-[#64716B]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "forest" }) {
  const tones = { forest: "bg-sage text-forest", gold: "bg-[#F6EBD3] text-[#8A6A22]", red: "bg-red-50 text-red-700", sky: "bg-sky-50 text-sky-700" };
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#829087]">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold text-charcoal">{value}</p>
          {hint && <p className="mt-1 text-xs text-[#64716B]">{hint}</p>}
        </div>
        {Icon && <div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon size={20} /></div>}
      </div>
    </div>
  );
}

export function Section({ title, description, children, actions, className = "" }) {
  return (
    <section className={`surface-card p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-bold text-forest">{title}</h2>}
            {description && <p className="mt-1 text-sm text-[#64716B]">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Notice({ tone = "info", children, className = "" }) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    sandbox: "border-[#E7D3A4] bg-[#FBF5E6] text-[#6B521A]",
  };
  const Icon = tone === "error" || tone === "warn" ? AlertTriangle : Info;
  return (
    <div role={tone === "error" ? "alert" : "note"} className={`flex gap-3 rounded-xl border p-3.5 text-sm ${tones[tone]} ${className}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center text-sm text-[#64716B]" role="status">
      <Loader2 className="mr-2 animate-spin" size={20} /> {label}
    </div>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-sage/70" />)}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <AlertTriangle className="mx-auto text-red-600" />
      <p className="mt-2 font-semibold text-red-800">Something went wrong</p>
      <p className="mt-1 text-sm text-red-700">{error?.message || String(error)}</p>
      {onRetry && <button onClick={onRetry} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Try again</button>}
    </div>
  );
}

export function Empty({ title = "Nothing here yet", message, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
      <Inbox className="mx-auto text-[#98A19B]" />
      <p className="mt-3 font-semibold text-charcoal">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-md text-sm text-[#64716B]">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Renders loading / error / data states for a TanStack Query result. */
export function QueryState({ query, children, skeleton }) {
  if (query.isLoading) return skeleton ?? <PageLoader />;
  if (query.isError) return <ErrorBox error={query.error} onRetry={() => query.refetch()} />;
  return children(query.data);
}

export const inputClass = "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-charcoal outline-none transition focus:border-forest focus:ring-2 focus:ring-sage disabled:bg-ivory";

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-charcoal">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-[#829087]">{hint}</p>}
    </div>
  );
}

export function Btn({ children, variant = "primary", loading, className = "", ...rest }) {
  const v = {
    primary: "bg-forest text-white hover:bg-[#194c40]",
    gold: "bg-gold text-forest hover:bg-[#c69d4f]",
    outline: "border border-border bg-white text-forest hover:bg-ivory",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-forest hover:bg-sage",
  }[variant];
  return (
    <button type="button" {...rest} disabled={rest.disabled || loading} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close dialog" />
      <div className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <h3 className="mb-4 text-lg font-bold text-forest">{title}</h3>
        {children}
      </div>
    </div>
  );
}
