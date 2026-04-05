"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "../../../lib/authService";

const ROLES = ["viewer", "analyst", "admin"];

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error: signInError } = await signIn(email, password, role);

    if (signInError) {
      setError(signInError.message || "Login failed.");
      setLoading(false);
      return;
    }

    setSuccess("Step 1-3 complete: Signed in and role saved to Supabase.");
    setLoading(false);
    router.push("/dashboard");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b14] px-4 py-10 [font-family:Space_Grotesk,Manrope,sans-serif] text-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#2dd4bf]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-6 h-72 w-72 rounded-full bg-[#38bdf8]/20 blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 shadow-[0_28px_80px_rgba(0,0,0,0.55)] md:grid-cols-[1.1fr_1fr]">
        <aside className="bg-[#0f172a] p-8 text-zinc-100 md:p-12">
          <p className="inline-block rounded-full border border-[#2dd4bf]/40 bg-[#2dd4bf]/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-[#2dd4bf]">
            SECURE ACCESS
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            Welcome Back
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
            A sharper login experience with role-based entry. Choose your lane
            and continue.
          </p>

          <div className="mt-10 space-y-3">
            {ROLES.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm capitalize backdrop-blur-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="bg-[linear-gradient(145deg,#111827_0%,#0b1220_60%,#090f1b_100%)] p-8 text-zinc-100 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="Your password"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#38bdf8] px-4 py-2.5 font-semibold text-[#041019] transition hover:translate-y-[-1px] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            {error ? <p className="text-sm text-[#fb7185]">{error}</p> : null}
            {success ? (
              <p className="text-sm text-[#2dd4bf]">{success}</p>
            ) : null}
          </form>

          <p className="mt-5 text-sm text-zinc-300">
            New user?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-[#2dd4bf] hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
