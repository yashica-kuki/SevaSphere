
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";

const dashboardInfo = {
    DONOR: {
        title: "Donor Dashboard",
        description: "Manage your donations, discover NGOs, and track your impact.",
    },
    NGO: {
        title: "NGO Dashboard",
        description: "Manage your organization, donations, and impact reports.",
    },
    ADMIN: {
        title: "Admin Dashboard",
        description: "Manage users, verify NGOs, and monitor platform activity.",
    },
};

export default function DashboardHome() {
    const { user, logout } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);

    if (!user) return <Navigate to="/login" replace />;
    if (user.role === "NGO") {
        return <Navigate to="/ngo/home" replace />;
    }
    if (user.role === "DONOR") {
        return <Navigate to="/donor/home" replace />;
    }
    if (user.role === "ADMIN") {
        return <Navigate to="/admin" replace />;
    }

    const info = dashboardInfo[user.role];

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await logout();
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F5EF]">
            <header className="flex items-center justify-between border-b border-[#E6E9E4] bg-white px-5 py-4 sm:px-10">
                <Link to="/" className="text-xl font-extrabold text-[#123B32]">
                    SevaSphere
                </Link>

                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2 rounded-xl border border-[#E6E9E4] px-4 py-2 text-sm font-semibold text-[#26332F] hover:bg-[#F7F5EF] disabled:opacity-60"
                >
                    <LogOut size={17} />
                    {loggingOut ? "Logging out..." : "Logout"}
                </button>
            </header>

            <main className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
                <div className="rounded-3xl bg-[#123B32] p-8 text-white sm:p-12">
                    <div className="mb-5 inline-flex rounded-xl bg-white/10 p-3">
                        <LayoutDashboard size={27} />
                    </div>

                    <p className="text-sm font-medium text-[#D6AD60]">
                        Welcome, {user.name}
                    </p>

                    <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                        {info?.title || "Dashboard"}
                    </h1>

                    <p className="mt-4 max-w-xl leading-7 text-white/75">
                        {info?.description}
                    </p>
                </div>

                <div className="mt-8 rounded-2xl border border-[#E6E9E4] bg-white p-7">
                    <h2 className="text-lg font-bold text-[#123B32]">
                        Account information
                    </h2>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                            <p className="text-sm text-[#68736D]">Name</p>
                            <p className="mt-1 font-semibold">{user.name}</p>
                        </div>

                        <div>
                            <p className="text-sm text-[#68736D]">Email</p>
                            <p className="mt-1 font-semibold">{user.email}</p>
                        </div>

                        <div>
                            <p className="text-sm text-[#68736D]">Account role</p>
                            <p className="mt-1 font-semibold">{user.role}</p>
                        </div>

                        <div>
                            <p className="text-sm text-[#68736D]">Account status</p>
                            <p className="mt-1 font-semibold">
                                {user.isActive ? "Active" : "Inactive"}
                            </p>
                        </div>
                    </div>
                </div>

                <Link
                    to="/"
                    className="mt-7 inline-block font-semibold text-[#123B32] hover:underline"
                >
                    ← Back to website
                </Link>
            </main>
        </div>
    );
}
