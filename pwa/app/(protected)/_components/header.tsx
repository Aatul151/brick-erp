"use client";

import { useAppTranslations } from "@/components/providers/translations-provider";

type HeaderProps = {
  title: string;
  isLoggingOut: boolean;
  onMenuClick: () => void;
  onLogout: () => void;
};

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-6 w-6"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
      />
    </svg>
  );
}

export function Header({ title, isLoggingOut, onMenuClick, onLogout }: HeaderProps) {
  const { t } = useAppTranslations();

  return (
    <header className="relative z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-800 hover:bg-slate-100"
          aria-label={t("header.openMenu")}
        >
          <MenuIcon />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-slate-900 sm:text-lg">
          {title}
        </h1>

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={isLoggingOut ? t("header.loggingOut") : t("header.logout")}
          title={t("header.logout")}
        >
          {isLoggingOut ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          ) : (
            <LogoutIcon />
          )}
        </button>
      </div>
    </header>
  );
}
