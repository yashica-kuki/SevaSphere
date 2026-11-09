
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, Mail, MessageSquare } from "lucide-react";
import Navbar from "../components/layout/Navbar";

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: "", message: "" });
    setLoading(true);

    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to submit your message.");
      }

      setFeedback({
        type: "success",
        message: result.message || "Your message has been received.",
      });
      setForm(initialForm);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#26332F]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex flex-col justify-center">
            <span className="mb-5 inline-flex w-fit rounded-full bg-[#E5EEE8] px-4 py-2 text-sm font-semibold text-[#123B32]">
              We'd love to hear from you
            </span>

            <h1 className="max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              Let's make giving <span className="text-[#98743A]">more meaningful.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-[#68736D]">
              Have a question about donations, NGO registration, or how
              SevaSphere works? Send us a message and our team will get back
              to you.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[#E5EEE8] p-3">
                  <Mail className="h-5 w-5 text-[#123B32]" />
                </div>
                <div>
                  <h3 className="font-semibold">Contact support</h3>
                  <p className="mt-1 text-sm text-[#68736D]">
                    Submit the form and your message will be saved securely.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[#E5EEE8] p-3">
                  <MessageSquare className="h-5 w-5 text-[#123B32]" />
                </div>
                <div>
                  <h3 className="font-semibold">For donors and NGOs</h3>
                  <p className="mt-1 text-sm text-[#68736D]">
                    Questions about contributions, verification, or impact
                    reporting are welcome.
                  </p>
                </div>
              </div>
            </div>

            <Link
              to="/how-it-works"
              className="mt-10 inline-flex w-fit items-center gap-2 font-semibold text-[#123B32] hover:gap-3"
            >
              Learn how SevaSphere works <ArrowRight size={18} />
            </Link>
          </section>

          <section className="rounded-3xl border border-[#E6E9E4] bg-white p-6 shadow-sm sm:p-9">
            <h2 className="text-2xl font-bold">Send us a message</h2>
            <p className="mt-2 text-sm text-[#68736D]">
              Fill in the details below. All fields are required.
            </p>

            {feedback.message && (
              <div
                role="alert"
                className={`mt-6 rounded-xl p-4 text-sm ${
                  feedback.type === "success"
                    ? "bg-[#E5EEE8] text-[#123B32]"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {feedback.type === "success" && (
                  <CheckCircle2 className="mr-2 inline h-5 w-5" />
                )}
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={100}
                  required
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-[#E6E9E4] bg-white px-4 py-3 outline-none transition focus:border-[#123B32] focus:ring-2 focus:ring-[#123B32]/10"
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
                  maxLength={255}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[#E6E9E4] bg-white px-4 py-3 outline-none transition focus:border-[#123B32] focus:ring-2 focus:ring-[#123B32]/10"
                />
              </div>

              <div>
                <label htmlFor="subject" className="mb-2 block text-sm font-semibold">
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  maxLength={150}
                  required
                  placeholder="What would you like to discuss?"
                  className="w-full rounded-xl border border-[#E6E9E4] bg-white px-4 py-3 outline-none transition focus:border-[#123B32] focus:ring-2 focus:ring-[#123B32]/10"
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-semibold">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  maxLength={5000}
                  required
                  rows={5}
                  placeholder="Tell us how we can help..."
                  className="w-full resize-y rounded-xl border border-[#E6E9E4] bg-white px-4 py-3 outline-none transition focus:border-[#123B32] focus:ring-2 focus:ring-[#123B32]/10"
                />
                <p className="mt-1 text-right text-xs text-[#89928D]">
                  {form.message.length}/5000
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#123B32] px-6 py-3.5 font-semibold text-white transition hover:bg-[#1C5144] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Submit message <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
