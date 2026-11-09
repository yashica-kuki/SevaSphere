import { Outlet } from "react-router-dom";
import { Bell, UserCircle } from "lucide-react";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-ivory">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-border bg-white px-6 sm:px-10">
          <div>
            <p className="text-sm text-gray-500">Welcome back</p>
            <h1 className="font-semibold text-forest">Your dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Notifications"
              className="rounded-full p-2 hover:bg-sage"
            >
              <Bell size={19} />
            </button>

            <UserCircle size={30} className="text-forest" />
          </div>
        </header>

        <main className="p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}