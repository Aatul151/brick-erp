"use client";

import { useAppTranslations } from "@/components/providers/translations-provider";

export default function ProtectedHomePage() {
  const { t } = useAppTranslations();

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{t("home.kicker")}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{t("home.title")}</h2>
      <p className="mt-3 text-sm text-slate-600">{t("home.description")}</p>
    </section>
  );
}
