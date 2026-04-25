"use client";

import { useEffect, useState } from "react";

export default function PwaCheckPage() {
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState("Checking...");
  const [isStandalone, setIsStandalone] = useState(false);
  const [userAgent, setUserAgent] = useState("Unknown");

  useEffect(() => {
    const runCheck = async () => {
      await Promise.resolve();

      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
      setUserAgent(window.navigator.userAgent);

      if (!("serviceWorker" in navigator)) {
        setServiceWorkerStatus("Service worker not supported in this browser.");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          setServiceWorkerStatus("Not registered.");
          return;
        }
        const state = registration.active?.state ?? "registered (not active yet)";
        setServiceWorkerStatus(`Registered: ${state}`);
      } catch {
        setServiceWorkerStatus("Error while checking registration.");
      }
    };

    void runCheck();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">PWA Verification</h1>
      <p className="text-slate-600">
        Use this page after a production build to verify installability behavior.
      </p>
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Service worker status</p>
        <p className="text-base font-medium text-slate-900">{serviceWorkerStatus}</p>
      </div>
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Standalone mode</p>
        <p className="text-base font-medium text-slate-900">
          {isStandalone ? "Yes (installed)" : "No (browser tab mode)"}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">User agent</p>
        <p className="break-all text-base font-medium text-slate-900">{userAgent}</p>
      </div>
    </main>
  );
}
