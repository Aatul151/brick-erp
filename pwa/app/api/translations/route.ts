import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_TRANSLATION_MESSAGES } from "@/lib/i18n/fallback-messages";

function parseMessagesPayload(body: unknown): Record<string, string> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }

  const root = body as Record<string, unknown>;
  const candidate =
    root.messages && typeof root.messages === "object" && !Array.isArray(root.messages)
      ? (root.messages as Record<string, unknown>)
      : root;

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

function mergeWithFallback(remote: Record<string, string>): Record<string, string> {
  return { ...FALLBACK_TRANSLATION_MESSAGES, ...remote };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";

  const baseUrl = process.env.EXTERNAL_API_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.EXTERNAL_API_KEY;
  const pathTemplate =
    process.env.EXTERNAL_TRANSLATIONS_PATH?.trim() || "i18n/{locale}";

  if (!baseUrl || !apiKey) {
    return NextResponse.json(FALLBACK_TRANSLATION_MESSAGES, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const path = pathTemplate.replace(/\{locale\}/g, encodeURIComponent(locale));
  const url = `${baseUrl}/${path.replace(/^\/+/, "")}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(FALLBACK_TRANSLATION_MESSAGES, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const json: unknown = await upstream.json();
    const parsed = parseMessagesPayload(json);
    const merged = mergeWithFallback(parsed);

    if (Object.keys(merged).length === 0) {
      return NextResponse.json(FALLBACK_TRANSLATION_MESSAGES, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json(merged, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(FALLBACK_TRANSLATION_MESSAGES, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
