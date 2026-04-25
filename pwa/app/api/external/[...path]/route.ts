import { NextRequest, NextResponse } from "next/server";
import { getExternalApiConfig } from "@/lib/server-env";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function buildTargetUrl(baseUrl: string, pathParts: string[], request: NextRequest): string {
  const targetPath = pathParts.map(encodeURIComponent).join("/");
  const search = request.nextUrl.search;
  return `${baseUrl}/${targetPath}${search}`;
}

async function proxyToExternalApi(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  if (!ALLOWED_METHODS.includes(request.method as (typeof ALLOWED_METHODS)[number])) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { path } = await context.params;
  if (!path || path.length === 0) {
    return NextResponse.json({ error: "Missing external API path" }, { status: 400 });
  }

  const { baseUrl, apiKey } = getExternalApiConfig();
  const targetUrl = buildTargetUrl(baseUrl, path, request);

  const outgoingHeaders = new Headers();
  const incomingContentType = request.headers.get("content-type");
  const incomingAccept = request.headers.get("accept");

  if (incomingContentType) outgoingHeaders.set("content-type", incomingContentType);
  if (incomingAccept) outgoingHeaders.set("accept", incomingAccept);
  outgoingHeaders.set("authorization", `Bearer ${apiKey}`);

  const methodHasBody = !["GET", "HEAD"].includes(request.method);
  const body = methodHasBody ? await request.text() : undefined;

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: outgoingHeaders,
      body,
      cache: "no-store",
    });

    const responseText = await upstream.text();
    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");

    if (upstreamContentType) {
      responseHeaders.set("content-type", upstreamContentType);
    } else {
      responseHeaders.set("content-type", "application/json; charset=utf-8");
    }
    responseHeaders.set("cache-control", "no-store");

    return new NextResponse(responseText, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach external API from internal proxy." },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyToExternalApi(request, context);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyToExternalApi(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyToExternalApi(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyToExternalApi(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyToExternalApi(request, context);
}
