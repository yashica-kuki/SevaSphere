
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  FolderOpen,
  HeartHandshake,
  Wallet,
  ChartNoAxesCombined,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navigation = [
  { label: "Overview", path: "/ngo/home", icon: LayoutDashboard },
  { label: "Organization Profile", path: "/ngo/profile", icon: Building2 },
  { label: "Verification", path: "/ngo/verification", icon: ShieldCheck },
  { label: "Documents", path: "/ngo/documents", icon: FolderOpen },
  { label: "Causes & Initiatives", path: "/ngo/causes", icon: HeartHandshake },
  { label: "Donations", path: "/ngo/donations", icon: Wallet },
  { label: "Analytics", path: "/ngo/analytics", icon: ChartNoAxesCombined },
  { label: "Impact Reports", path: "/ngo/impact-reports", icon: FileText },
  { label: "Contact Support", path: "/ngo/contact", icon: MessageSquare },
  { label: "Settings", path: "/ngo/settings", icon: Settings },
];

export default function NGOLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-[#E5EEE8] text-[#123B32]"
        : "text-[#64716B] hover:bg-[#F5F7F3] hover:text-[#123B32]"
    }`;

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-20 items-center justify-between border-b border-[#E6E9E4] px-6">
        <Link to="/" className="text-xl font-extrabold text-[#123B32]">
          SevaSphere
          <span className="ml-2 text-xs font-semibold text-[#C49A4A]">
            NGO
          </span>
        </Link>

        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-2 text-[#64716B] hover:bg-[#F5F7F3] lg:hidden"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>

      <div className="border-b border-[#E6E9E4] px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#98A19B]">
          Organization portal
        </p>
        <p className="mt-2 truncate font-semibold text-[#26332F]">
          {user?.ngoProfile?.organizationName || user?.name || "NGO Account"}
        </p>
        <p className="mt-1 truncate text-xs text-[#829087]">{user?.email}</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/ngo/home"}
            className={linkClass}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon size={18} />
            <span>{label}</span>
            <ChevronRight size={15} className="ml-auto opacity-40" />
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#E6E9E4] p-4">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          <LogOut size={18} />
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F5EF]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-[#E6E9E4] lg:block">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation overlay"
          />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#E6E9E4] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-[#123B32] hover:bg-[#F1F3EF] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-sm font-semibold text-[#123B32]">
                NGO Workspace
              </p>
              <p className="text-xs text-[#829087]">
                Manage your organization and impact
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[#26332F]">
                {user?.name}
              </p>
              <p className="text-xs text-[#829087]">NGO Administrator</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E5EEE8] font-bold text-[#123B32]">
              {user?.name?.charAt(0)?.toUpperCase() || "N"}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
