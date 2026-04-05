"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "../../lib/authService";

const roleRank = {
  viewer: 1,
  analyst: 2,
  admin: 3,
};

const manageItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["viewer", "analyst", "admin"],
  },
  {
    label: "Analytics",
    href: "/dashboard/analyst",
    roles: ["analyst", "admin"],
  },
  { label: "Performance", href: "/dashboard", roles: ["analyst", "admin"] },
  {
    label: "Notifications",
    href: "/dashboard",
    roles: ["viewer", "analyst", "admin"],
  },
  { label: "Settings", href: "/dashboard", roles: ["admin"] },
];

const preferenceItems = [
  { label: "Security", href: "/dashboard", roles: ["analyst", "admin"] },
];

function SquareIcon({ active = false }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-[3px] ${
        active ? "bg-[#7ee04d]" : "bg-zinc-500"
      }`}
    />
  );
}

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return "U";
  if (nameOrEmail.includes("@")) {
    const local = nameOrEmail.split("@")[0];
    return local.slice(0, 2).toUpperCase();
  }
  const parts = nameOrEmail.trim().split(/\s+/);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "U"
  );
}

export default function Menu({
  userName = "User",
  userEmail = "user@email.com",
  userRole = "viewer",
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = getInitials(userName || userEmail);
  const normalizedRole = String(userRole || "viewer").toLowerCase();

  const handleLogout = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const canAccess = (roles) => {
    if (Array.isArray(roles) && roles.length > 0) {
      return roles.includes(normalizedRole);
    }
    return roleRank[normalizedRole] >= roleRank.viewer;
  };

  const visibleManageItems = manageItems.filter((item) =>
    canAccess(item.roles),
  );
  const visiblePreferenceItems = preferenceItems.filter((item) =>
    canAccess(item.roles),
  );

  const isActive = (href, label) => {
    if (href !== "/dashboard") {
      return pathname.startsWith(href);
    }
    return pathname === "/dashboard" && label === "Dashboard";
  };

  return (
    <aside className="h-full w-full rounded-3xl border border-white/10 bg-[#1c2028] p-5 text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#7ee04d] text-[10px] font-bold text-[#12200b]">
          ●
        </span>
        <span className="text-3xl font-semibold tracking-tight">uifry</span>
      </div>

      <div className="mt-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Manage
        </p>
        <nav className="mt-4 space-y-1">
          {visibleManageItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                isActive(item.href, item.label)
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <SquareIcon active={isActive(item.href, item.label)} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Preferences
        </p>
        <nav className="mt-4 space-y-1">
          {visiblePreferenceItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                isActive(item.href, item.label)
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <SquareIcon active={isActive(item.href, item.label)} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-12 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2d3340] text-xs font-semibold text-zinc-200">
          {initials}
        </span>
        <div>
          <p className="text-xs font-medium text-zinc-200">{userName}</p>
          <p className="text-[10px] text-zinc-400">{userEmail}</p>
          <p className="text-[10px] text-zinc-500 capitalize">{normalizedRole}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-3 flex w-full items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-200 transition hover:brightness-110"
      >
        Logout
      </button>
    </aside>
  );
}
