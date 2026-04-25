"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header } from "./_components/header";
import { Sidebar } from "./_components/sidebar";

const HEADER_TITLE = "Brick ERP";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <Header
        title={HEADER_TITLE}
        isLoggingOut={isLoggingOut}
        onMenuClick={() => setIsSidebarOpen((v) => !v)}
        onLogout={handleLogout}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
