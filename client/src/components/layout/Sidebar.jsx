import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Heart,
  Wallet,
  CalendarDays,
  Settings,
  Users,
  FileText
} from "lucide-react";

const navigation = [
  { label: "Overview", path: "/donor/home", icon: LayoutDashboard },
  { label: "Explore NGOs", path: "/donor/ngos", icon: Users },
  { label: "My Donations", path: "/donor/donations", icon: Heart },
  { label: "My Wallet", path: "/donor/wallet", icon: Wallet },
  { label: "Schedule", path: "/donor/schedule", icon: CalendarDays },
  { label: "SevaKarma AI", path: "/donor/sevakarma", icon: FileText },
  { label: "Settings", path: "/donor/profile", icon: Settings }
];

export default function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-border bg-white p-5 lg:block">
      <h2 className="mb-8 px-3 text-xl font-bold text-forest">
        SevaKarma
      </h2>

      <nav className="space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-sage text-forest"
                    : "text-gray-500 hover:bg-ivory hover:text-forest"
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}