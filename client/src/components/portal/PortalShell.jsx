import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LogOut, Menu, X, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/** Shared responsive sidebar layout used by the donor and admin portals. */
export default function PortalShell({ brandBadge, portalLabel, navigation, dark = false, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    dark
      ? `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`
      : `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-sage text-forest" : "text-[#64716B] hover:bg-[#F5F7F3] hover:text-forest"}`;

  const sidebar = (
    <div className={`flex h-full flex-col ${dark ? "bg-forest text-white" : "bg-white"}`}>
      <div className={`flex h-20 items-center justify-between border-b px-6 ${dark ? "border-white/10" : "border-[#E6E9E4]"}`}>
        <Link to="/" className={`text-xl font-extrabold ${dark ? "text-white" : "text-forest"}`}>
          SevaSphere <span className="ml-1 text-xs font-semibold text-gold">{brandBadge}</span>
        </Link>
        <button onClick={() => setOpen(false)} className="rounded-lg p-2 lg:hidden" aria-label="Close navigation"><X size={20} /></button>
      </div>
      <div className={`border-b px-5 py-5 ${dark ? "border-white/10" : "border-[#E6E9E4]"}`}>
        <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-white/50" : "text-[#98A19B]"}`}>{portalLabel}</p>
        <p className="mt-2 truncate font-semibold">{user?.name}</p>
        <p className={`mt-1 truncate text-xs ${dark ? "text-white/60" : "text-[#829087]"}`}>{user?.email}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label={`${portalLabel} navigation`}>
        {navigation.map(({ label, path, icon: Icon, end }) => (
          <NavLink key={path} to={path} end={end} className={linkClass} onClick={() => setOpen(false)}>
            <Icon size={18} /> <span>{label}</span> <ChevronRight size={15} className="ml-auto opacity-40" />
          </NavLink>
        ))}
      </nav>
      <div className={`border-t p-4 ${dark ? "border-white/10" : "border-[#E6E9E4]"}`}>
        <button onClick={handleLogout} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${dark ? "text-red-200 hover:bg-white/10" : "text-red-600 hover:bg-red-50"}`}>
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-[#E6E9E4] lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label="Close navigation overlay" />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E6E9E4] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-forest hover:bg-sage lg:hidden" aria-label="Open navigation"><Menu size={22} /></button>
            <p className="text-sm font-semibold text-forest">{subtitle}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage font-bold text-forest">{user?.name?.charAt(0)?.toUpperCase()}</div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-5 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
