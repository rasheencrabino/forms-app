"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [isLoading, token, router]);

  if (isLoading || !token) {
    return null;
  }

  return (
    <div>
      <nav className="topbar">
        <Link className="topbar__brand" href="/forms">
          Forms App
        </Link>
        <div className="topbar__right">
          <span>{user?.email}</span>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Log out
          </button>
        </div>
      </nav>
      {children}
    </div>
  );
}
