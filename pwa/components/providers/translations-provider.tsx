"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { idbGetFresh, idbSetWithTimestamp } from "@/lib/idb";
import { TRANSLATIONS_CACHE_TTL_MS } from "@/lib/i18n/cache-config";
import { FALLBACK_TRANSLATION_MESSAGES } from "@/lib/i18n/fallback-messages";

type Messages = Record<string, string>;

type TranslationsContextValue = {
  locale: string;
  setLocale: (locale: string) => void;
  ready: boolean;
  t: (key: string) => string;
};

const TranslationsContext = createContext<TranslationsContextValue | null>(null);

const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en";

function cacheKey(locale: string): string {
  return `translations:${locale}`;
}

function mergeMessages(remote: Messages): Messages {
  return { ...FALLBACK_TRANSLATION_MESSAGES, ...remote };
}

export function TranslationsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Messages>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key = cacheKey(locale);

    async function load() {
      try {
        const cached = await idbGetFresh<Messages>(key, TRANSLATIONS_CACHE_TTL_MS);
        if (!cancelled && cached && Object.keys(cached).length > 0) {
          setMessages(mergeMessages(cached));
          setReady(true);
          return;
        }
      } catch {
        /* IndexedDB unavailable or blocked */
      }

      try {
        const response = await fetch(
          `/api/translations?locale=${encodeURIComponent(locale)}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error(`Translations request failed: ${response.status}`);
        }
        const data = (await response.json()) as Messages;
        if (cancelled) return;

        if (data && typeof data === "object") {
          const merged = mergeMessages(data);
          setMessages(merged);
          setReady(true);
          try {
            await idbSetWithTimestamp(key, merged);
          } catch {
            /* ignore IDB write errors */
          }
        } else {
          setMessages({ ...FALLBACK_TRANSLATION_MESSAGES });
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setMessages({ ...FALLBACK_TRANSLATION_MESSAGES });
          setReady(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((next: string) => {
    setLocaleState(next);
    setReady(false);
    setMessages({});
  }, []);

  const t = useCallback(
    (messageKey: string) => {
      const value = messages[messageKey] ?? FALLBACK_TRANSLATION_MESSAGES[messageKey];
      return value ?? messageKey;
    },
    [messages],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      ready,
      t,
    }),
    [locale, setLocale, ready, t],
  );

  return <TranslationsContext.Provider value={value}>{children}</TranslationsContext.Provider>;
}

export function useAppTranslations(): TranslationsContextValue {
  const ctx = useContext(TranslationsContext);
  if (!ctx) {
    throw new Error("useAppTranslations must be used within TranslationsProvider");
  }
  return ctx;
}
