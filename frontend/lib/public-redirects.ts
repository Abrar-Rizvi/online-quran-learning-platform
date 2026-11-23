const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  .replace(/\/+$/, "");
const REFRESH_MS = 30_000;
const RETRY_MS = 5_000;
const TIMEOUT_MS = 1_000;

let cached = new Map<string, string>();
let expiresAt = 0;
let pending: Promise<void> | undefined;

function pathKey(path: string): string | undefined {
  if (!path.startsWith("/") || /%2f/i.test(path)) return;
  try {
    const decoded = decodeURIComponent(path).toLowerCase();
    if (
      decoded.includes("//") ||
      decoded.startsWith("/admin") ||
      decoded.startsWith("/api") ||
      /[\\:?#%\s]/.test(decoded) ||
      Array.from(decoded).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
      decoded.split("/").some((part) => part === "." || part === "..")
    ) return;
    return decoded.replace(/\/+$/, "") || "/";
  } catch {
    return undefined;
  }
}

function parseRedirects(body: unknown): Map<string, string> {
  if (!Array.isArray(body)) throw new Error("Invalid redirect list");
  const redirects = new Map<string, string>();
  for (const row of body) {
    if (typeof row?.from_path !== "string" || typeof row?.to_path !== "string") {
      throw new Error("Invalid redirect entry");
    }
    const source = pathKey(row.from_path);
    const target = pathKey(row.to_path);
    if (!source || !target || redirects.has(source)) throw new Error("Invalid redirect path");
    redirects.set(source, row.to_path);
  }
  return redirects;
}

async function refreshRedirects(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/redirects`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "error",
    });
    if (!response.ok) throw new Error("Redirect API unavailable");
    cached = parseRedirects(await response.json());
    expiresAt = Date.now() + REFRESH_MS;
  } catch {
    // Fail open and coalesce retries during a backend outage.
    cached = new Map();
    expiresAt = Date.now() + RETRY_MS;
  }
}

export async function getPublicRedirect(pathname: string): Promise<string | undefined> {
  const source = pathKey(pathname);
  if (
    !source ||
    source.startsWith("/_next") ||
    /^\/(?:images|opengraph-image)(?:\/|$)/.test(source) ||
    /\.[^/]+$/.test(source)
  ) return;
  if (Date.now() >= expiresAt) {
    pending ??= refreshRedirects().finally(() => { pending = undefined; });
    await pending;
  }

  const target = cached.get(source);
  // The API flattens chains. Ignore any unsafe entries if the list violates that invariant.
  const targetKey = target && pathKey(target);
  if (targetKey && !cached.has(targetKey)) return target;
}
