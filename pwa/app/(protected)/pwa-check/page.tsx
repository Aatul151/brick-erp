"use client";

import { useEffect, useState } from "react";
import { useAppTranslations } from "@/components/providers/translations-provider";

export default function PwaCheckPage() {
  const { t } = useAppTranslations();
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState(() => t("pwaCheck.sw.checking"));
  const [isStandalone, setIsStandalone] = useState(false);
  const [userAgent, setUserAgent] = useState(() => t("pwaCheck.userAgent.unknown"));

  useEffect(() => {
    const runCheck = async () => {
      await Promise.resolve();

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
      setUserAgent(window.navigator.userAgent);

      if (!("serviceWorker" in navigator)) {
        setServiceWorkerStatus(t("pwaCheck.sw.notSupported"));
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          setServiceWorkerStatus(t("pwaCheck.sw.notRegistered"));
          return;
        }
        const state = registration.active?.state ?? t("pwaCheck.sw.inactive");
        setServiceWorkerStatus(t("pwaCheck.sw.registered").replaceAll("{state}", state));
      } catch {
        setServiceWorkerStatus(t("pwaCheck.sw.error"));
      }
    };

    void runCheck();
  }, [t]);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("pwaCheck.title")}</h1>
      <p className="text-slate-600">{t("pwaCheck.intro")}</p>
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">{t("pwaCheck.sw.label")}</p>
        <p className="text-base font-medium text-slate-900">{serviceWorkerStatus}</p>
      </div>
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">{t("pwaCheck.standalone.label")}</p>
        <p className="text-base font-medium text-slate-900">
          {isStandalone ? t("pwaCheck.standalone.yes") : t("pwaCheck.standalone.no")}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">{t("pwaCheck.userAgent.label")}</p>
        <p className="break-all text-base font-medium text-slate-900">{userAgent}</p>
      </div>
    </section>
  );
}
