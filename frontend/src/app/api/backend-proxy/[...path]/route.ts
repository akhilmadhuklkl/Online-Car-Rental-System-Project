async function proxy(request: Request) {
  const incoming = new URL(request.url);
  const backend = process.env.DJANGO_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:8001");
  const backendPath = incoming.pathname.replace(/^\/api\/backend-proxy/, "") || "/";
  const target = new URL(`${backendPath}${incoming.search}`, backend || incoming.origin);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");
  headers.delete("transfer-encoding");
  // Keep the Django deployment behind Vercel SSO while allowing this private
  // server-side proxy to reach it. Never expose the bypass token to browsers.
  const protectionBypass = process.env.DJANGO_API_PROTECTION_BYPASS;
  if (protectionBypass) {
    headers.set("x-vercel-protection-bypass", protectionBypass);
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("connection");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: "The account service is temporarily unavailable. Please try again." }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
