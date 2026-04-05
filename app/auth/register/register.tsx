"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "../../../lib/authService";

const ROLES = ["viewer", "analyst", "admin"];

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    const { data, error: signUpError } = await signUp(email, password, role);

    if (signUpError) {
      setError(signUpError.message || "Registration failed.");
      setLoading(false);
      return;
    }

    if (!data?.session) {
      setSuccess(
        "Step 1-2 complete: Account created. Verify your email, then login.",
      );
      setLoading(false);
      return;
    }

    setSuccess(
      "Step 1-3 complete: Account created and data stored in Supabase.",
    );
    setLoading(false);
    router.push("/");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b14] px-4 py-10 [font-family:Space_Grotesk,Manrope,sans-serif] text-zinc-100">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[#2dd4bf]/20 blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 shadow-[0_28px_80px_rgba(0,0,0,0.55)] md:grid-cols-[1fr_1.05fr]">
        <div className="bg-[linear-gradient(155deg,#111827_0%,#0b1220_58%,#090f1b_100%)] p-8 text-zinc-100 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h1 className="text-4xl font-bold">Create Account</h1>
            <p className="text-sm text-zinc-400">
              Register with your details and choose how you will access the
              platform.
            </p>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-[#020617]/80 px-3 py-2.5 outline-none transition focus:border-[#38bdf8]"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Choose password"
                className="w-full rounded-xl border border-white/10 bg-[#020617]/80 px-3 py-2.5 outline-none transition focus:border-[#38bdf8]"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-white/10 bg-[#020617]/80 px-3 py-2.5 outline-none transition focus:border-[#38bdf8]"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#020617]/80 px-3 py-2.5 capitalize outline-none transition focus:border-[#38bdf8]"
              >
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            {error ? (
              <p className="text-sm font-medium text-[#fb7185]">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#2dd4bf] px-4 py-2.5 font-semibold text-[#041019] transition hover:translate-y-[-1px] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>

            {success ? (
              <p className="text-sm text-[#2dd4bf]">{success}</p>
            ) : null}
          </form>

          <p className="mt-5 text-sm text-zinc-300">
            Already registered?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-[#38bdf8] hover:underline"
            >
              Login here
            </Link>
          </p>
        </div>

        <aside className="bg-[#0f172a] p-8 text-zinc-100 md:p-12">
          <p className="inline-block rounded-full border border-[#2dd4bf]/40 bg-[#2dd4bf]/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-[#2dd4bf]">
            ROLE SPACE
          </p>

          <div className="mt-6 space-y-3">
            {ROLES.map((item, index) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
              >
                <p className="text-xs uppercase tracking-wide text-[#38bdf8]">
                  Option {index + 1}
                </p>
                <p className="mt-1 text-lg font-semibold capitalize">{item}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
