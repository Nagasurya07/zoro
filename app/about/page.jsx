"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "../../lib/authService";

export default function AboutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await getUser();
      if (!data?.user) {
        router.push("/auth/login");
        return;
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#070b14] px-4 py-10 [font-family:Space_Grotesk,Manrope,sans-serif] text-zinc-100">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#2dd4bf] border-r-transparent"></div>
            <p className="mt-4 text-zinc-400">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b14] px-4 py-10 [font-family:Space_Grotesk,Manrope,sans-serif] text-zinc-100">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#2dd4bf]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-6 h-72 w-72 rounded-full bg-[#38bdf8]/20 blur-3xl" />

      <section className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0f172a] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.55)] md:p-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold leading-tight text-white">
            About Zoro
          </h1>
          <p className="mt-4 text-lg text-zinc-300">
            Transaction Management Dashboard
          </p>
        </div>

        <div className="mt-8 space-y-6 text-zinc-200">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">What is Zoro?</h2>
            <p className="leading-relaxed">
              Zoro is a modern, role-based transaction management application built with Next.js, TypeScript, and Supabase.
              It provides comprehensive transaction tracking with different access levels for viewers, analysts, and administrators.
              The application features user authentication, real-time dashboards, and interactive charts for data visualization.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">Key Features</h2>
            <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li>🔐 Secure authentication and role-based access control</li>
              <li>📊 Real-time transaction dashboard with interactive charts</li>
              <li>💰 Comprehensive income and expense tracking</li>
              <li>🔔 Real-time notifications system</li>
              <li>🎨 Modern UI with dark theme and responsive design</li>
              <li>📱 Mobile-friendly layout</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">Tech Stack</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-zinc-100">Frontend</h3>
                <ul className="text-sm text-zinc-400">
                  <li>Next.js 15</li>
                  <li>React 18</li>
                  <li>TypeScript</li>
                  <li>Tailwind CSS</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-zinc-100">Backend</h3>
                <ul className="text-sm text-zinc-400">
                  <li>Supabase</li>
                  <li>PostgreSQL</li>
                  <li>Row Level Security</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">Developer</h2>
            <p className="leading-relaxed">
              This application was developed by <span className="font-semibold text-[#2dd4bf]">Surya</span>,
              a passionate developer focused on creating modern web applications with clean code and excellent user experience.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-block rounded-xl border border-[#2dd4bf]/40 bg-[#2dd4bf]/10 px-6 py-3 text-sm font-medium text-[#2dd4bf] transition hover:bg-[#2dd4bf]/20"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
