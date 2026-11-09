
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Heart, Loader2, HandHeart, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";
// import { logoutUser } from "../services/authService";

export default function Login() {
    const { login, logout, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [role, setRole] = useState("DONOR");
    const [form, setForm] = useState({ email: "", password: "" });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    if (authLoading) return null;
    if (user) return <Navigate to="/dashboard" replace />;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            const result = await login({
                email: form.email.trim(),
                password: form.password,
            });

            if (result.user.role !== role) {
                try {
                    await logout();
                } catch (logoutError) {
                    console.error("Logout after role mismatch failed:", logoutError);
                }

                setError(
                    `This account is registered as ${result.user.role === "DONOR" ? "Donor" : "NGO"
                    }. Please select the correct account type.`
                );
                return;
            }

            const destination = location.state?.from?.pathname || "/dashboard";
            navigate(destination, { replace: true });
        } catch (err) {
            setError(err.message || "Unable to log in.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F5EF]">
            <Navbar />

            <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-5 py-12">
                <div className="w-full max-w-md rounded-3xl border border-[#E6E9E4] bg-white p-7 shadow-sm sm:p-9">
                    <div className="mb-7 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#123B32] text-white">
                            <Heart size={27} />
                        </div>

                        <h1 className="text-3xl font-bold text-[#123B32]">
                            Welcome back
                        </h1>

                        <p className="mt-2 text-sm text-[#68736D]">
                            Log in to continue your SevaSphere journey.
                        </p>
                    </div>

                    <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-[#F1F3EF] p-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setRole("DONOR");
                                setError("");
                            }}
                            className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition ${role === "DONOR"
                                ? "bg-[#123B32] text-white shadow-sm"
                                : "text-[#68736D] hover:text-[#123B32]"
                                }`}
                        >
                            <HandHeart size={18} />
                            Donor
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setRole("NGO");
                                setError("");
                            }}
                            className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition ${role === "NGO"
                                ? "bg-[#123B32] text-white shadow-sm"
                                : "text-[#68736D] hover:text-[#123B32]"
                                }`}
                        >
                            <Building2 size={18} />
                            NGO
                        </button>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block text-sm font-semibold"
                            >
                                Email address
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) =>
                                    setForm({ ...form, email: e.target.value })
                                }
                                autoComplete="email"
                                required
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32] focus:ring-2 focus:ring-[#123B32]/10"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-semibold"
                            >
                                Password
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={form.password}
                                onChange={(e) =>
                                    setForm({ ...form, password: e.target.value })
                                }
                                autoComplete="current-password"
                                required
                                placeholder="Enter your password"
                                className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32] focus:ring-2 focus:ring-[#123B32]/10"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#123B32] px-5 py-3.5 font-semibold text-white transition hover:bg-[#1C5144] disabled:opacity-60"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Logging in...
                                </>
                            ) : (
                                "Log in"
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-[#68736D]">
                        Don't have an account?{" "}
                        <Link
                            to="/signup"
                            className="font-semibold text-[#123B32] hover:underline"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
