
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Loader2, HandHeart, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";


const initialForm = {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "DONOR",
    phone: "",
    city: "",
    state: "",
    organizationName: "",
    description: "",
};

export default function Signup() {
    const { register, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const referralCode = searchParams.get("ref");

    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    if (authLoading) return null;

    if (user) return <Navigate to="/dashboard" replace />;

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (form.password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (form.role === "NGO" && !form.organizationName.trim()) {
            setError("Organization name is required.");
            return;
        }

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            phone: form.phone.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
        };

        if (referralCode && form.role === "DONOR") payload.referralCode = referralCode;

        if (form.role === "NGO") {
            payload.organizationName = form.organizationName.trim();
            payload.description = form.description.trim();
        }

        setSubmitting(true);

        try {
            await register(payload);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(err.message || "Unable to create your account.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F5EF]">
            <Navbar />

            <main className="px-5 py-12">
                <div className="mx-auto max-w-2xl rounded-3xl border border-[#E6E9E4] bg-white p-7 shadow-sm sm:p-10">
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#123B32] text-white">
                            <Heart size={27} />
                        </div>

                        <h1 className="text-3xl font-bold text-[#123B32]">
                            Create your account
                        </h1>
                        <p className="mt-2 text-sm text-[#68736D]">
                            Join SevaSphere and become part of meaningful change.
                        </p>
                    </div>

                    {error && (
                        <div role="alert" className="mb-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-semibold">
                                I want to join as
                            </label>

                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F1F3EF] p-1.5">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, role: "DONOR" })}
                                    className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition ${form.role === "DONOR"
                                            ? "bg-[#123B32] text-white shadow-sm"
                                            : "text-[#68736D] hover:text-[#123B32]"
                                        }`}
                                >
                                    <HandHeart size={18} />
                                    Donor
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, role: "NGO" })}
                                    className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition ${form.role === "NGO"
                                            ? "bg-[#123B32] text-white shadow-sm"
                                            : "text-[#68736D] hover:text-[#123B32]"
                                        }`}
                                >
                                    <Building2 size={18} />
                                    NGO
                                </button>
                            </div>
                        </div>

                        {form.role === "NGO" && (
                            <div>
                                <label htmlFor="organizationName" className="mb-2 block text-sm font-semibold">
                                    Organization name
                                </label>
                                <input
                                    id="organizationName"
                                    name="organizationName"
                                    value={form.organizationName}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter registered organization name"
                                    className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32]"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="mb-2 block text-sm font-semibold">
                                {form.role === "NGO" ? "Contact person's name" : "Full name"}
                            </label>
                            <input
                                id="name"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                autoComplete="name"
                                placeholder="Enter your name"
                                className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32]"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-semibold">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                autoComplete="email"
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32]"
                            />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="phone" className="mb-2 block text-sm font-semibold">
                                    Phone number
                                </label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="Phone number"
                                    className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32]"
                                />
                            </div>

                            <div>
                                <label htmlFor="city" className="mb-2 block text-sm font-semibold">
                                    City
                                </label>
                                <input
                                    id="city"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="Your city"
                                    className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32]"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="state" className="mb-2 block text-sm font-semibold">
                                State
                            </label>
                            <input
                                id="state"
                                name="state"
                                value={form.state}
                                onChange={handleChange}
                                placeholder="Your state"
                                className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32]"
                            />
                        </div>

                        {form.role === "NGO" && (
                            <div>
                                <label htmlFor="description" className="mb-2 block text-sm font-semibold">
                                    Organization description
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Describe your organization's mission and work"
                                    className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32]"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-semibold">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={handleChange}
                                required
                                minLength={8}
                                autoComplete="new-password"
                                placeholder="At least 8 characters"
                                className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32]"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold">
                                Confirm password
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                                autoComplete="new-password"
                                placeholder="Enter password again"
                                className="w-full rounded-xl border border-[#E6E9E4] px-4 py-3 outline-none focus:border-[#123B32]"
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
                                    Creating account...
                                </>
                            ) : (
                                "Create account"
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-[#68736D]">
                        Already have an account?{" "}
                        <Link to="/login" className="font-semibold text-[#123B32] hover:underline">
                            Log in
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
