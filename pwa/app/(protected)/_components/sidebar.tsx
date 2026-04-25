"use client";

import Link from "next/link";
import { useAppTranslations } from "@/components/providers/translations-provider";
import { APP_VERSION } from "@/lib/app-version";

const navItems = [
  { href: "/", labelKey: "nav.dashboard" as const },
  { href: "/pwa-check", labelKey: "nav.pwaCheck" as const },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useAppTranslations();

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40"
          aria-label="Close menu"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-out ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        style={{ transform: isOpen ? "translateX(0)" : "translateX(-100%)" }}
        aria-hidden={!isOpen}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t("sidebar.menu")}
          </p>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">{t("sidebar.versionLabel")}</p>
          <p className="mt-0.5 font-mono text-sm font-medium text-slate-800">v{APP_VERSION}</p>
        </div>
      </aside>
    </>
  );
}
